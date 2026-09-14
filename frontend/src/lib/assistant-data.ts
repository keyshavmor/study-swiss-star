/**
 * General-purpose AI assistant data access.
 *
 * These threads/messages/attachments are deliberately SEPARATE from the
 * tutoring chat (`threads` / `messages`) and live in the `assistant_*` tables.
 * All access runs under the signed-in user's session, so RLS keeps rows and
 * storage paths isolated per user.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  CHAT_ATTACHMENT_BUCKET,
  MEDIA_MAX_BYTES,
  kindFromMime,
  type StorageItemKind,
} from "@/lib/storage-management";

export interface AssistantThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantAttachment {
  id: string;
  messageId: string | null;
  fileName: string;
  mimeType: string;
  byteSize: number;
  kind: string;
  objectPath: string;
  parseStatus: string;
}

export interface AssistantMessage {
  id: string;
  threadId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  attachments: AssistantAttachment[];
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("You are signed out.");
  return id;
}

export async function listAssistantThreads(): Promise<AssistantThread[]> {
  const { data, error } = await supabase
    .from("assistant_threads")
    .select("id, title, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createAssistantThread(title = "New conversation"): Promise<AssistantThread> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("assistant_threads")
    .insert({ user_id: userId, title })
    .select("id, title, created_at, updated_at")
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    title: data.title,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function renameAssistantThread(threadId: string, title: string): Promise<void> {
  const { error } = await supabase
    .from("assistant_threads")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", threadId);
  if (error) throw new Error(error.message);
}

export async function deleteAssistantThread(threadId: string): Promise<void> {
  const userId = await requireUserId();
  const { data: attachments } = await supabase
    .from("assistant_attachments")
    .select("object_path, storage_bucket")
    .eq("thread_id", threadId)
    .is("deleted_at", null);

  const paths = (attachments ?? [])
    .map((row) => row.object_path)
    .filter((path) => path.split("/")[0] === userId);
  if (paths.length) {
    await supabase.storage.from(CHAT_ATTACHMENT_BUCKET).remove(paths);
    await supabase
      .from("assistant_attachments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("thread_id", threadId);
  }

  const { error } = await supabase.from("assistant_threads").delete().eq("id", threadId);
  if (error) throw new Error(error.message);
}

export async function listAssistantMessages(threadId: string): Promise<AssistantMessage[]> {
  const { data, error } = await supabase
    .from("assistant_messages")
    .select("id, thread_id, role, content, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const { data: attachments } = await supabase
    .from("assistant_attachments")
    .select("id, message_id, file_name, mime_type, byte_size, kind, object_path, parse_status")
    .eq("thread_id", threadId)
    .is("deleted_at", null);

  const byMessage = new Map<string, AssistantAttachment[]>();
  for (const row of attachments ?? []) {
    const key = row.message_id ?? "";
    byMessage.set(key, [
      ...(byMessage.get(key) ?? []),
      {
        id: row.id,
        messageId: row.message_id,
        fileName: row.file_name,
        mimeType: row.mime_type ?? "",
        byteSize: row.byte_size ?? 0,
        kind: row.kind ?? kindFromMime(row.mime_type ?? "", row.file_name),
        objectPath: row.object_path,
        parseStatus: row.parse_status ?? "unparsed",
      },
    ]);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    threadId: row.thread_id,
    role: (row.role as AssistantMessage["role"]) ?? "user",
    content: row.content,
    createdAt: row.created_at,
    attachments: byMessage.get(row.id) ?? [],
  }));
}

const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

/** Client-side validation mirroring the database metadata constraint. */
export function validateAttachment(file: File): string | null {
  const kind: StorageItemKind = kindFromMime(file.type, file.name);
  if (kind === "image" || kind === "audio" || kind === "video") {
    if (file.size > MEDIA_MAX_BYTES) {
      return `${file.name} is larger than 1 MB. Images, audio and video must be 1 MB or smaller.`;
    }
    return null;
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (DOCUMENT_MIME_TYPES.includes(file.type) || ["pdf", "docx", "doc"].includes(ext)) {
    return null;
  }
  return `${file.name} is not supported. Attach images, audio, video (up to 1 MB each), or PDF/DOCX files.`;
}

/** Saves the user's message plus any attachments for the local AI backend. */
export async function sendAssistantMessage(input: {
  threadId: string;
  content: string;
  files: File[];
}): Promise<AssistantMessage> {
  const userId = await requireUserId();

  const { data: message, error } = await supabase
    .from("assistant_messages")
    .insert({
      thread_id: input.threadId,
      user_id: userId,
      role: "user",
      content: input.content,
      parts: [{ type: "text", text: input.content }] as unknown as Json,
      metadata: { attachment_count: input.files.length } as unknown as Json,
    })
    .select("id, thread_id, role, content, created_at")
    .single();
  if (error) throw new Error(error.message);

  const attachments: AssistantAttachment[] = [];

  for (const file of input.files) {
    const validationError = validateAttachment(file);
    if (validationError) throw new Error(validationError);

    const safeName = file.name.replace(/[^\w.-]+/g, "_");
    const objectPath = `${userId}/${input.threadId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(CHAT_ATTACHMENT_BUCKET)
      .upload(objectPath, file, { contentType: file.type || "application/octet-stream" });
    if (uploadError) throw new Error(`${file.name}: ${uploadError.message}`);

    const { data: attachmentRow, error: metaError } = await supabase
      .from("assistant_attachments")
      .insert({
        user_id: userId,
        thread_id: input.threadId,
        message_id: message.id,
        storage_bucket: CHAT_ATTACHMENT_BUCKET,
        object_path: objectPath,
        file_name: file.name,
        mime_type: file.type || null,
        byte_size: file.size,
        kind: kindFromMime(file.type, file.name),
        parse_status: "unparsed",
      })
      .select("id, message_id, file_name, mime_type, byte_size, kind, object_path, parse_status")
      .single();
    if (metaError) {
      await supabase.storage.from(CHAT_ATTACHMENT_BUCKET).remove([objectPath]);
      throw new Error(`${file.name}: ${metaError.message}`);
    }

    attachments.push({
      id: attachmentRow.id,
      messageId: attachmentRow.message_id,
      fileName: attachmentRow.file_name,
      mimeType: attachmentRow.mime_type ?? "",
      byteSize: attachmentRow.byte_size ?? file.size,
      kind: attachmentRow.kind ?? "other",
      objectPath: attachmentRow.object_path,
      parseStatus: attachmentRow.parse_status ?? "unparsed",
    });
  }

  await supabase
    .from("assistant_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.threadId);

  return {
    id: message.id,
    threadId: message.thread_id,
    role: "user",
    content: message.content,
    createdAt: message.created_at,
    attachments,
  };
}

export function deriveThreadTitle(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "New conversation";
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed;
}
