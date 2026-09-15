/**
 * Storage management for the signed-in user: usage status, item listing,
 * user-selected deletion and the platform emergency-cleanup trigger.
 *
 * All reads and writes run under the user's own session (RLS), and deletions
 * always go through the Storage API before any metadata reconciliation.
 */
import { supabase } from "@/integrations/supabase/client";
import type { StorageUsageStatus } from "@/integrations/supabase/types";

export const CHAT_ATTACHMENT_BUCKET = "chat-attachments";
export const MEDIA_MAX_BYTES = 1024 * 1024;

export type StorageItemSource = "Assistant attachment" | "Study material";

export type StorageItemKind = "image" | "audio" | "video" | "document" | "other";

export interface StorageItem {
  id: string;
  source: StorageItemSource;
  name: string;
  kind: StorageItemKind;
  mimeType: string;
  bucket: string;
  objectPath: string;
  byteSize: number;
  createdAt: string;
}

export function kindFromMime(mimeType: string, fallbackName = ""): StorageItemKind {
  const mime = (mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (
    mime.includes("pdf") ||
    mime.includes("word") ||
    mime.includes("officedocument") ||
    mime.startsWith("text/")
  )
    return "document";
  const ext = fallbackName.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf", "docx", "doc", "txt", "md"].includes(ext)) return "document";
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) return "image";
  if (["mp3", "wav", "m4a", "ogg", "webm"].includes(ext)) return "audio";
  if (["mp4", "mov", "mkv"].includes(ext)) return "video";
  return "other";
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
}

export async function fetchStorageUsage(): Promise<StorageUsageStatus | null> {
  const { data, error } = await supabase.rpc("get_storage_usage_status");
  if (error) throw new Error(error.message);
  const rows = (Array.isArray(data) ? data : [data]) as StorageUsageStatus[];
  return rows[0] ?? null;
}

function readString(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value) return value;
  }
  return "";
}

function readNumber(row: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value && !Number.isNaN(Number(value))) return Number(value);
  }
  return 0;
}

/** Every storage-backed item owned by the signed-in user. */
export async function listStorageItems(): Promise<StorageItem[]> {
  const items: StorageItem[] = [];

  const { data: attachments, error: attachmentError } = await supabase
    .from("assistant_attachments")
    .select(
      "id, file_name, mime_type, byte_size, kind, storage_bucket, object_path, created_at, deleted_at",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (attachmentError) throw new Error(attachmentError.message);

  for (const row of attachments ?? []) {
    items.push({
      id: `attachment:${row.id}`,
      source: "Assistant attachment",
      name: row.file_name,
      kind: kindFromMime(row.mime_type ?? "", row.file_name),
      mimeType: row.mime_type ?? "",
      bucket: row.storage_bucket,
      objectPath: row.object_path,
      byteSize: row.byte_size ?? 0,
      createdAt: row.created_at,
    });
  }

  // `documents` is owned by the study/tutoring side of the app. Column names
  // differ per deployment, so read the row and normalise defensively.
  const { data: documents, error: documentError } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (!documentError) {
    for (const raw of documents ?? []) {
      const row = raw as unknown as Record<string, unknown>;
      const objectPath = readString(row, ["object_path", "storage_path", "storage_object_path"]);
      if (!objectPath) continue;
      const status = readString(row, ["status", "parse_status"]).toLowerCase();
      if (status === "deleted" || status === "archived") continue;
      if (readString(row, ["deleted_at"])) continue;
      const name = readString(row, ["file_name", "title", "name"]) || objectPath.split("/").pop()!;
      const mimeType = readString(row, ["mime_type", "content_type"]);
      items.push({
        id: `document:${readString(row, ["id"])}`,
        source: "Study material",
        name,
        kind: kindFromMime(mimeType, name),
        mimeType,
        bucket: readString(row, ["storage_bucket", "bucket"]) || "user-materials",
        objectPath,
        byteSize: readNumber(row, ["byte_size", "file_size", "size_bytes", "size"]),
        createdAt: readString(row, ["created_at", "uploaded_at"]),
      });
    }
  }

  return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/**
 * Deletes the given items. Storage objects go first through the Storage API;
 * `storage.objects` rows are never touched directly. Metadata is then
 * reconciled: attachments are soft-deleted, documents lose their storage
 * pointer and are marked deleted.
 */
export async function deleteStorageItems(items: StorageItem[]): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("You are signed out.");

  const owned = items.filter((item) => item.objectPath.split("/")[0] === userId);
  if (owned.length !== items.length) {
    throw new Error("Some selected files are not in your own storage folder.");
  }

  const byBucket = new Map<string, string[]>();
  for (const item of owned) {
    byBucket.set(item.bucket, [...(byBucket.get(item.bucket) ?? []), item.objectPath]);
  }
  for (const [bucket, paths] of byBucket) {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) throw new Error(error.message);
  }

  const attachmentIds = owned
    .filter((item) => item.id.startsWith("attachment:"))
    .map((item) => item.id.slice("attachment:".length));
  if (attachmentIds.length) {
    const { error } = await supabase
      .from("assistant_attachments")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", attachmentIds);
    if (error) throw new Error(error.message);
  }

  const documentIds = owned
    .filter((item) => item.id.startsWith("document:"))
    .map((item) => item.id.slice("document:".length));
  if (documentIds.length) {
    const { error } = await supabase
      .from("documents")
      .update({ object_path: null, storage_bucket: null, status: "deleted" })
      .in("id", documentIds);
    if (error) {
      // Some deployments name these columns differently; the object itself is
      // already gone, so surface a clear, non-fatal warning instead.
      throw new Error(
        `Files were deleted, but the study-material record could not be updated: ${error.message}`,
      );
    }
  }
}

/** Platform-wide emergency cleanup; the backend function decides what to remove. */
export async function invokeEmergencyCleanup(): Promise<void> {
  const { error } = await supabase.functions.invoke("storage-emergency-cleanup");
  if (error) throw new Error(error.message);
}
