/**
 * PER-USER COMBINED 50 MB QUOTA — CURRENT SUPABASE contract.
 *
 * Live migration: `add_per_user_combined_50mb_quota` (project
 * ucacmeadsufiedxrgqit). The database is authoritative:
 *  - `get_my_quota_status()` returns ONE JSON object with the caller's combined
 *    database + Storage usage;
 *  - `can_allocate_my_quota(p_additional_bytes bigint)` is the preflight;
 *  - a database trigger hard-guards inserts/updates on user-owned public
 *    tables and user-writable Storage policies run the same preflight, raising
 *    `user_data_quota_exceeded`.
 *
 * The frontend NEVER estimates usage from browser storage APIs, and ownerless
 * system assets are not user data and are never counted or deleted here.
 */
import { supabase } from "@/integrations/supabase/client";

/** 50 MiB, shown to people as "50 MB". */
export const QUOTA_LIMIT_BYTES = 52_428_800;
/** 90 % of the limit. */
export const QUOTA_WARNING_BYTES = 47_185_920;
export const QUOTA_WARNING_FRACTION = 0.9;

/** Stable error code raised by the Supabase trigger / Storage policy. */
export const QUOTA_EXCEEDED_CODE = "user_data_quota_exceeded";

export interface QuotaStatus {
  databaseBytes: number;
  storageBytes: number;
  totalBytes: number;
  limitBytes: number;
  warningThresholdBytes: number;
  remainingBytes: number;
  /** 0..1, clamped. */
  usageFraction: number;
  warning: boolean;
  atLimit: boolean;
}

function num(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value !== "" && !Number.isNaN(Number(value)))
    return Number(value);
  return fallback;
}

/** Normalises the live JSON payload; missing fields are derived, never faked. */
export function normaliseQuotaStatus(raw: unknown): QuotaStatus {
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const limitBytes = num(row["limit_bytes"], QUOTA_LIMIT_BYTES) || QUOTA_LIMIT_BYTES;
  const databaseBytes = num(row["database_bytes"]);
  const storageBytes = num(row["storage_bytes"]);
  const totalBytes = num(row["total_bytes"], databaseBytes + storageBytes);
  const warningThresholdBytes = num(row["warning_threshold_bytes"], QUOTA_WARNING_BYTES);
  const remainingBytes = Math.max(
    0,
    num(row["remaining_bytes"], Math.max(0, limitBytes - totalBytes)),
  );
  const usageFraction = Math.min(
    1,
    Math.max(0, num(row["usage_fraction"], limitBytes > 0 ? totalBytes / limitBytes : 0)),
  );
  const warning =
    typeof row["warning"] === "boolean"
      ? (row["warning"] as boolean)
      : totalBytes >= warningThresholdBytes;
  const atLimit =
    typeof row["at_limit"] === "boolean"
      ? (row["at_limit"] as boolean)
      : totalBytes >= limitBytes || remainingBytes <= 0;
  return {
    databaseBytes,
    storageBytes,
    totalBytes,
    limitBytes,
    warningThresholdBytes,
    remainingBytes,
    usageFraction,
    warning,
    atLimit,
  };
}

/** Live combined usage for the signed-in user (RLS-scoped, no secret keys). */
export async function fetchMyQuotaStatus(): Promise<QuotaStatus> {
  const { data, error } = await supabase.rpc("get_my_quota_status");
  if (error) throw new Error(error.message);
  const payload = Array.isArray(data) ? data[0] : data;
  return normaliseQuotaStatus(payload);
}

/**
 * Preflight before a sizable write. The database stays authoritative: a `true`
 * result is permission to TRY, never a guarantee.
 */
export async function canAllocateBytes(additionalBytes: number): Promise<boolean> {
  const bytes = Math.max(0, Math.round(additionalBytes));
  const { data, error } = await supabase.rpc("can_allocate_my_quota", {
    p_additional_bytes: bytes,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export type QuotaWriteOutcome = "allowed" | "quota_exceeded" | "check_unavailable";

/**
 * Runs the preflight and translates a failed check into a user-facing outcome.
 * A failing CHECK never blocks the attempt — the server rejection is the
 * authority — so the UI can still send and handle the mapped error.
 */
export async function preflightQuota(additionalBytes: number): Promise<QuotaWriteOutcome> {
  try {
    return (await canAllocateBytes(additionalBytes)) ? "allowed" : "quota_exceeded";
  } catch {
    return "check_unavailable";
  }
}

/** True when a Supabase/Storage rejection was the quota guard. */
export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;
  const candidate = error as { message?: unknown; code?: unknown; error?: unknown };
  const parts = [candidate.message, candidate.code, candidate.error]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();
  return parts.includes(QUOTA_EXCEEDED_CODE);
}

/** Percentage (0..100, one decimal at most) for display. */
export function quotaPercent(status: QuotaStatus): number {
  return Math.round(status.usageFraction * 1000) / 10;
}
