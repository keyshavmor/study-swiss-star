/**
 * System health + data-rights data access.
 *
 * CURRENT SUPABASE: `get_user_visible_supabase_health()` (aggregate platform
 * metrics; unsupported quotas are reported as not exposed, never invented),
 * `get_my_data_summary()` (current user only) and the JWT-protected Edge
 * Function `delete-my-data`.
 */
import { supabase } from "@/integrations/supabase/client";
import type { MyDataSummaryRow, SupabaseHealthRow } from "@/integrations/supabase/types";

export const NOT_EXPOSED_STATUS = "not_exposed_by_sql";

export interface SupabaseHealth extends SupabaseHealthRow {}

export async function fetchSupabaseHealth(): Promise<SupabaseHealth | null> {
  const { data, error } = await supabase.rpc("get_user_visible_supabase_health");
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as SupabaseHealthRow | null;
  return row ?? null;
}

export async function fetchMyDataSummary(): Promise<MyDataSummaryRow | null> {
  const { data, error } = await supabase.rpc("get_my_data_summary");
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as MyDataSummaryRow | null;
  return row ?? null;
}

/** A metric SQL cannot authoritatively expose. Render as "Not exposed". */
export function isNotExposed(value: number | null | undefined, status?: string | null): boolean {
  return value === null || value === undefined || status === NOT_EXPOSED_STATUS;
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
