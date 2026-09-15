/**
 * Frontend contract for the assistant media retention policy.
 *
 * Policy (assistant OUTPUT media only — never ordinary user study uploads):
 *  1. A textual descriptor is written to the private `assistant-descriptors`
 *     bucket BEFORE the original media may be deleted.
 *  2. A row is enqueued in `public.media_retention_queue` with
 *     `delete_after = created_at + 30 minutes`.
 *  3. After cleanup the descriptor is the retrieval surface; the original
 *     binary must not be expected to exist.
 *  4. When the media was fetched rather than generated, `source_url` (remote)
 *     or `source_path` (storage) is retained alongside the descriptor.
 *
 * Descriptor generation/upload remain deferred with General Assistant media
 * generation. The live Supabase cleanup worker is scheduled independently.
 * This module only enqueues after a descriptor path exists and never generates
 * descriptors client-side.
 */
import { supabase } from "@/integrations/supabase/client";

export const DESCRIPTOR_BUCKET = "assistant-descriptors";
export const RETENTION_MINUTES = 30;

export type MediaKind = "image" | "audio" | "video";
export type RetentionStatus = "pending" | "ready" | "processing" | "deleted" | "failed";

export interface RetentionEnqueueInput {
  /** Owner of the media; must be the signed-in user (RLS enforces this). */
  userId: string;
  attachmentId?: string | null;
  mediaKind: MediaKind;
  storageBucket: string;
  objectPath: string;
  /** Descriptor produced by the backend, already uploaded. */
  descriptorPath: string;
  /** Set when the media was fetched rather than generated. */
  sourceUrl?: string | null;
  sourcePath?: string | null;
}

export interface RetentionRow {
  id: string;
  media_kind: string;
  object_path: string;
  descriptor_path: string;
  source_url: string | null;
  source_path: string | null;
  status: string;
  created_at: string;
  delete_after: string;
  deleted_at: string | null;
  error_code: string | null;
}

/**
 * Enqueues assistant output media for descriptor-backed 30-minute retention.
 * Safe to call only for assistant-generated or assistant-fetched media.
 */
export async function enqueueAssistantMedia(input: RetentionEnqueueInput): Promise<void> {
  const ownerPrefix = `${input.userId}/`;
  if (!input.objectPath.startsWith(ownerPrefix) || !input.descriptorPath.startsWith(ownerPrefix)) {
    throw new Error("Assistant media paths must belong to the signed-in user.");
  }
  const { error } = await supabase.from("media_retention_queue").insert({
    user_id: input.userId,
    attachment_id: input.attachmentId ?? null,
    media_kind: input.mediaKind,
    storage_bucket: input.storageBucket,
    object_path: input.objectPath,
    descriptor_bucket: DESCRIPTOR_BUCKET,
    descriptor_path: input.descriptorPath,
    source_url: input.sourceUrl ?? null,
    source_path: input.sourcePath ?? null,
    status: "ready",
  });
  if (error) throw new Error(error.message);
}

/** Retention rows for the signed-in user, newest first. */
export async function listRetentionQueue(userId: string): Promise<RetentionRow[]> {
  const { data, error } = await supabase
    .from("media_retention_queue")
    .select(
      "id, media_kind, object_path, descriptor_path, source_url, source_path, status, created_at, delete_after, deleted_at, error_code",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as RetentionRow[];
}

/** Minutes left before the original media becomes eligible for deletion. */
export function minutesUntilDeletion(deleteAfter: string, now: Date = new Date()): number {
  const target = new Date(deleteAfter).getTime();
  if (Number.isNaN(target)) return 0;
  return Math.max(0, Math.ceil((target - now.getTime()) / 60_000));
}

export function isOriginalExpired(row: Pick<RetentionRow, "delete_after" | "deleted_at">): boolean {
  if (row.deleted_at) return true;
  const target = new Date(row.delete_after).getTime();
  return !Number.isNaN(target) && target <= Date.now();
}
