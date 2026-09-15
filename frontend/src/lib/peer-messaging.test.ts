/**
 * Regression tests for the CURRENT SUPABASE peer-messaging schema
 * (verified 2026-09-15). They fail if the frontend drifts back to the stale
 * `last_message_at` / `sender_id` / `safety_verdict` / `scan_status` names or
 * treats `get_or_create_direct_peer_conversation` as returning a bare string.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
// The suite runs in the "node" environment; provide the minimal browser surface
// the module touches (no jsdom dependency).
const store = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    location: { pathname: "/auth" },
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
    },
  },
});

const rpcCalls: { name: string; args: unknown }[] = [];
const selects: { table: string; columns: string }[] = [];
const orders: { table: string; column: string }[] = [];

const rows: Record<string, unknown[]> = {
  peer_conversation_members: [],
  peer_conversations: [],
  peer_message_notifications: [],
  peer_messages: [],
  peer_message_attachments: [],
};

function builder(table: string) {
  const chain: Record<string, unknown> = {};
  const self = () => chain as never;
  chain["select"] = (columns: string) => {
    selects.push({ table, columns });
    return self();
  };
  chain["eq"] = self;
  chain["in"] = self;
  chain["is"] = self;
  chain["order"] = (column: string) => {
    orders.push({ table, column });
    return self();
  };
  chain["then"] = (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
    resolve({ data: rows[table] ?? [], error: null });
  return chain;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "me" } } }) },
    from: (table: string) => builder(table),
    rpc: (name: string, args: unknown) => {
      rpcCalls.push({ name, args });
      if (name === "get_or_create_direct_peer_conversation") {
        // Live shape: a ROW SET, not a string.
        return Promise.resolve({
          data: [
            {
              conversation_id: "conv-1",
              peer_user_id: "peer-1",
              peer_username: "lea.study",
              peer_preferred_name: "Lea",
            },
          ],
          error: null,
        });
      }
      // mark_peer_conversation_read returns void.
      return Promise.resolve({ data: null, error: null });
    },
  },
}));

const {
  fetchConversations,
  fetchMessages,
  getOrCreateDirectConversation,
  markConversationRead,
  peerLabelCache,
} = await import("./peer-messaging");

beforeEach(() => {
  rpcCalls.length = 0;
  selects.length = 0;
  orders.length = 0;
  window.localStorage.clear();
});

describe("get_or_create_direct_peer_conversation", () => {
  it("extracts conversation_id from the returned row", async () => {
    await expect(getOrCreateDirectConversation("lea.study")).resolves.toBe("conv-1");
  });

  it("caches the peer label from the same row", async () => {
    await getOrCreateDirectConversation("lea.study");
    expect(peerLabelCache().get("peer-1")).toEqual({
      username: "lea.study",
      preferredName: "Lea",
    });
  });
});

describe("mark_peer_conversation_read", () => {
  it("tolerates a void return", async () => {
    await expect(markConversationRead("conv-1")).resolves.toBeUndefined();
    expect(rpcCalls[0]).toEqual({
      name: "mark_peer_conversation_read",
      args: { p_conversation_id: "conv-1" },
    });
  });
});

describe("conversation list", () => {
  it("sorts by updated_at and maps the live columns", async () => {
    rows["peer_conversation_members"] = [
      { conversation_id: "conv-1", last_read_at: null, left_at: null, user_id: "me" },
      { conversation_id: "conv-1", user_id: "peer-1" },
    ];
    rows["peer_conversations"] = [
      {
        id: "conv-1",
        conversation_type: "direct",
        created_by: "me",
        direct_key: "me:peer-1",
        title: null,
        created_at: "2026-09-01T10:00:00Z",
        updated_at: "2026-09-14T10:00:00Z",
      },
    ];
    rows["peer_message_notifications"] = [{ conversation_id: "conv-1", read_at: null }];

    const conversations = await fetchConversations();
    expect(orders).toContainEqual({ table: "peer_conversations", column: "updated_at" });
    expect(orders).not.toContainEqual({
      table: "peer_conversations",
      column: "last_message_at",
    });
    expect(conversations[0]).toMatchObject({
      id: "conv-1",
      conversationType: "direct",
      title: null,
      updatedAt: "2026-09-14T10:00:00Z",
      unreadCount: 1,
    });
    expect(conversations[0]).not.toHaveProperty("lastMessageAt");
  });
});

describe("messages", () => {
  it("maps sender_user_id and moderation_status, with no attachment scan status", async () => {
    rows["peer_messages"] = [
      {
        id: "msg-1",
        conversation_id: "conv-1",
        sender_user_id: "peer-1",
        body: "hi",
        moderation_status: "allowed",
        moderation_event_id: null,
        created_at: "2026-09-14T10:00:00Z",
        edited_at: null,
        deleted_at: null,
      },
    ];
    rows["peer_message_attachments"] = [
      {
        id: "att-1",
        message_id: "msg-1",
        conversation_id: "conv-1",
        owner_user_id: "peer-1",
        storage_bucket: "peer-message-attachments",
        object_path: "peer-1/att-1.png",
        file_name: "note.png",
        mime_type: "image/png",
        byte_size: 1234,
        created_at: "2026-09-14T10:00:00Z",
      },
    ];

    const messages = await fetchMessages("conv-1");
    expect(messages[0]).toMatchObject({
      senderUserId: "peer-1",
      moderationStatus: "allowed",
    });
    expect(messages[0]).not.toHaveProperty("senderId");
    expect(messages[0]!.attachments[0]).not.toHaveProperty("scanStatus");
    expect(messages[0]!.attachments[0]).toMatchObject({
      fileName: "note.png",
      byteSize: 1234,
    });
  });
});
