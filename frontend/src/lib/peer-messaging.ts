/**
 * Peer messaging data access (CURRENT SUPABASE, browser side, RLS-scoped).
 *
 * Reads run as the signed-in user, so conversation membership isolation is
 * enforced by production RLS. There is intentionally NO browser write path for
 * `peer_messages` / `peer_message_attachments`: sending goes through the future
 * safety backend (`sendPeerMessage` server function) and fails closed until it
 * exists. Do not work around this.
 *
 * Privacy by design: peers are found by EXACT username only
 * (`find_peer_by_exact_username`). No browsable directory, and no email, date of
 * birth or guardian address is ever exposed to a peer.
 */
import { supabase } from "@/integrations/supabase/client";

export interface PeerMember {
  userId: string;
  username: string;
  preferredName: string | null;
}

export interface PeerConversationSummary {
  id: string;
  conversationType: string;
  title: string | null;
  updatedAt: string;
  members: PeerMember[];
  unreadCount: number;
  lastMessagePreview: string | null;
}

export interface PeerMessageRow {
  id: string;
  conversationId: string;
  senderUserId: string;
  body: string;
  /** CURRENT SUPABASE: `peer_messages.moderation_status`. */
  moderationStatus: string;
  createdAt: string;
  attachments: {
    id: string;
    fileName: string;
    mimeType: string;
    byteSize: number;
    bucket: string;
    objectPath: string;
  }[];
}

/**
 * CURRENT SUPABASE (verified 2026-09-15): production RLS only exposes
 * `peer_messages` rows whose `moderation_status = 'approved'`, so an approved
 * message (and its attachments) is the visible, openable state. Any other value
 * is treated as still-pending rather than invented as a new production state.
 */
export function isAttachmentPending(moderationStatus: string): boolean {
  return moderationStatus !== "approved";
}

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Locally cached peer labels.
 *
 * Data minimisation: only the username / preferred name the signed-in user
 * already looked up by EXACT username is remembered, so conversation lists can
 * show a name without any directory-style query. No email, date of birth or
 * guardian address is ever stored or fetched.
 */
const PEER_LABEL_STORAGE_KEY = "alim.peer_labels.v1";

type PeerLabel = { username: string; preferredName: string | null };

export function peerLabelCache(): Map<string, PeerLabel> {
  try {
    const raw = window.localStorage.getItem(PEER_LABEL_STORAGE_KEY);
    if (!raw) return new Map();
    return new Map(Object.entries(JSON.parse(raw) as Record<string, PeerLabel>));
  } catch {
    return new Map();
  }
}

export function rememberPeerLabel(member: PeerMember): void {
  try {
    const cache = peerLabelCache();
    cache.set(member.userId, { username: member.username, preferredName: member.preferredName });
    window.localStorage.setItem(PEER_LABEL_STORAGE_KEY, JSON.stringify(Object.fromEntries(cache)));
  } catch {
    /* a label cache is a convenience only */
  }
}

/** Exact-username lookup. Returns null when no such user exists. */
export async function findPeerByExactUsername(username: string): Promise<PeerMember | null> {
  const trimmed = username.trim();
  if (!trimmed) return null;
  const { data, error } = await supabase.rpc("find_peer_by_exact_username", {
    p_username: trimmed,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;
  const member: PeerMember = {
    userId: row.user_id,
    username: row.username,
    preferredName: row.preferred_name,
  };
  rememberPeerLabel(member);
  return member;
}

/**
 * Creates (or returns) the direct conversation with an exact username.
 *
 * CURRENT SUPABASE (verified 2026-09-15): the RPC returns a ROW SET with
 * `conversation_id, peer_user_id, peer_username, peer_preferred_name` — not a
 * bare id string. The peer label is cached so the list can show a name without
 * any directory-style query.
 */
export async function getOrCreateDirectConversation(username: string): Promise<string> {
  const { data, error } = await supabase.rpc("get_or_create_direct_peer_conversation", {
    p_username: username.trim(),
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : (data ?? null);
  const conversationId = row?.conversation_id;
  if (typeof conversationId !== "string" || !conversationId) {
    throw new Error("conversation_not_created");
  }
  if (row && typeof row.peer_user_id === "string" && typeof row.peer_username === "string") {
    rememberPeerLabel({
      userId: row.peer_user_id,
      username: row.peer_username,
      preferredName: row.peer_preferred_name ?? null,
    });
  }
  return conversationId;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_peer_conversation_read", {
    p_conversation_id: conversationId,
  });
  if (error) throw new Error(error.message);
}

/** Conversations the signed-in user belongs to, newest activity first. */
export async function fetchConversations(): Promise<PeerConversationSummary[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  const { data: memberships, error: membershipError } = await supabase
    .from("peer_conversation_members")
    .select("conversation_id, last_read_at, left_at")
    .is("left_at", null);
  if (membershipError) throw new Error(membershipError.message);
  const conversationIds = (memberships ?? []).map((row) => row.conversation_id);
  if (conversationIds.length === 0) return [];

  const [
    { data: conversations, error: conversationError },
    { data: allMembers },
    { data: notifications },
  ] = await Promise.all([
    supabase
      .from("peer_conversations")
      .select("*")
      .in("id", conversationIds)
      .order("updated_at", { ascending: false }),
    supabase
      .from("peer_conversation_members")
      .select("conversation_id, user_id")
      .in("conversation_id", conversationIds),
    supabase
      .from("peer_message_notifications")
      .select("conversation_id, read_at")
      .in("conversation_id", conversationIds)
      .is("read_at", null),
  ]);
  if (conversationError) throw new Error(conversationError.message);

  // Peer display names come ONLY from the exact-username RPC (cached locally
  // when a chat is opened). `profiles` is RLS-scoped to the owner, and peers
  // must never be resolvable through a browsable directory lookup.
  const profileMap = peerLabelCache();

  const unreadByConversation = new Map<string, number>();
  for (const notification of notifications ?? []) {
    unreadByConversation.set(
      notification.conversation_id,
      (unreadByConversation.get(notification.conversation_id) ?? 0) + 1,
    );
  }

  return (conversations ?? []).map((conversation) => ({
    id: conversation.id,
    conversationType: conversation.conversation_type,
    title: conversation.title,
    updatedAt: conversation.updated_at,
    members: (allMembers ?? [])
      .filter((member) => member.conversation_id === conversation.id && member.user_id !== userId)
      .map((member) => ({
        userId: member.user_id,
        username: profileMap.get(member.user_id)?.username ?? "",
        preferredName: profileMap.get(member.user_id)?.preferredName ?? null,
      })),
    unreadCount: unreadByConversation.get(conversation.id) ?? 0,
    lastMessagePreview: null,
  }));
}

/** Persisted messages of one conversation, oldest first. */
export async function fetchMessages(conversationId: string): Promise<PeerMessageRow[]> {
  const { data, error } = await supabase
    .from("peer_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const messages = data ?? [];
  if (messages.length === 0) return [];

  const { data: attachments } = await supabase
    .from("peer_message_attachments")
    .select("*")
    .in(
      "message_id",
      messages.map((message) => message.id),
    );

  return messages.map((message) => ({
    id: message.id,
    conversationId: message.conversation_id,
    senderUserId: message.sender_user_id,
    body: message.body,
    moderationStatus: message.moderation_status,
    createdAt: message.created_at,
    attachments: (attachments ?? [])
      .filter((attachment) => attachment.message_id === message.id)
      .map((attachment) => ({
        id: attachment.id,
        fileName: attachment.file_name,
        mimeType: attachment.mime_type,
        byteSize: attachment.byte_size,
        bucket: attachment.storage_bucket,
        objectPath: attachment.object_path,
      })),
  }));
}

/** Total unread notification rows for the badge. */
export async function fetchUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from("peer_message_notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}

/** Signed URL for a private attachment. Members only, short-lived. */
export async function attachmentUrl(bucket: string, objectPath: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, 300);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/**
 * Realtime subscription for incoming messages/notifications while signed in.
 * When the user is signed out nothing is delivered by the browser — messages
 * simply persist in Supabase and appear as unread on the next login. We do NOT
 * promise OS push delivery.
 */
export function subscribeToPeerMessaging(userId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`peer-messaging-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "peer_message_notifications",
        filter: `user_id=eq.${userId}`,
      },
      () => onChange(),
    )
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "peer_messages" }, () =>
      onChange(),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
