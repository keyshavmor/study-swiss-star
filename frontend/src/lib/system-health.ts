/**
 * System health + data-rights data access.
 *
 * CURRENT SUPABASE: `get_user_visible_supabase_health()` (aggregate platform
 * metrics; unsupported quotas are reported as not exposed, never invented),
 * `get_my_data_summary()` (current user only) and the JWT-protected Edge
 * Function `delete-my-data`.
 */
import { supabase } from "@/integrations/supabase/client";
import type { MyDataSummaryJson, SupabaseHealthJson } from "@/integrations/supabase/types";

export const NOT_EXPOSED_STATUS = "not_exposed_by_sql";

/**
 * CURRENT SUPABASE (verified 2026-09-15): both RPCs return ONE JSON object.
 * Missing keys stay missing (`undefined`/`null`) — they are rendered as
 * "Not exposed" and never coerced to 0.
 */
export type SupabaseHealth = SupabaseHealthJson;
export type MyDataSummary = MyDataSummaryJson;

export async function fetchSupabaseHealth(): Promise<SupabaseHealth | null> {
  const { data, error } = await supabase.rpc("get_user_visible_supabase_health");
  if (error) throw new Error(error.message);
  const json = (Array.isArray(data) ? data[0] : data) as SupabaseHealthJson | null;
  if (!json || typeof json !== "object") return null;
  return json;
}

export async function fetchMyDataSummary(): Promise<MyDataSummary | null> {
  const { data, error } = await supabase.rpc("get_my_data_summary");
  if (error) throw new Error(error.message);
  const json = (Array.isArray(data) ? data[0] : data) as MyDataSummaryJson | null;
  if (!json || typeof json !== "object") return null;
  return json;
}

/** A metric SQL cannot authoritatively expose. Render as "Not exposed". */
export function isNotExposed(value: number | null | undefined, status?: string | null): boolean {
  return value === null || value === undefined || status === NOT_EXPOSED_STATUS;
}

/**
 * A live count/byte value, or `null` when the production JSON does not contain
 * the key. NEVER substitutes 0 for a missing key.
 */
export function metricValue(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export type DeleteMyDataMode = "range" | "all_content" | "delete_account";

export interface DeleteMyDataRequest {
  mode: DeleteMyDataMode;
  /** Range mode only. ISO-8601. */
  startAt?: string;
  endAt?: string;
  includePeer?: boolean;
  includeAi?: boolean;
}

export interface DeleteMyDataResult {
  mode: DeleteMyDataMode;
  deleted_objects: number | null;
  deleted_rows: number | null;
  account_deleted: boolean;
}

/**
 * Invokes the Edge Function. The request NEVER carries a target user id — the
 * function acts only on the caller identified by the verified JWT.
 */
export async function requestMyDataDeletion(
  request: DeleteMyDataRequest,
): Promise<DeleteMyDataResult> {
  const body: Record<string, unknown> = { mode: request.mode };
  if (request.mode === "range") {
    body["start_at"] = request.startAt ?? null;
    body["end_at"] = request.endAt ?? null;
    body["include_peer"] = request.includePeer ?? true;
    body["include_ai"] = request.includeAi ?? true;
  }
  const { data, error } = await supabase.functions.invoke("delete-my-data", { body });
  if (error) throw new Error(error.message);
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    mode: request.mode,
    deleted_objects: typeof row["deleted_objects"] === "number" ? row["deleted_objects"] : null,
    deleted_rows: typeof row["deleted_rows"] === "number" ? row["deleted_rows"] : null,
    account_deleted: row["account_deleted"] === true,
  };
}
