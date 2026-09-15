/**
 * `feedback-submit` client contract (CURRENT SUPABASE, verified 2026-09-15).
 *
 * The Edge Function records feedback in BOTH the database and private storage
 * and reports each leg separately. The submission is only a success when every
 * leg succeeded: a partial 2xx (for example HTTP 207) must keep the student's
 * text in the form so nothing is silently lost. Raw function messages are never
 * shown — the caller renders localized copy only.
 */
export interface FeedbackSubmitResponse {
  ok?: boolean;
  database_recorded?: boolean;
  storage_recorded?: boolean;
}

export type FeedbackOutcome =
  /** Everything was recorded: safe to clear the form. */
  | { kind: "full" }
  /** Some legs failed: keep the text, invite a retry. */
  | { kind: "partial" }
  /** Nothing recorded, or the call itself failed. */
  | { kind: "failed" };

export function classifyFeedbackResult(
  data: FeedbackSubmitResponse | null | undefined,
  error: unknown,
): FeedbackOutcome {
  if (error) return { kind: "failed" };
  if (!data || typeof data !== "object") return { kind: "failed" };
  if (data.ok === true && data.database_recorded === true && data.storage_recorded === true) {
    return { kind: "full" };
  }
  if (data.database_recorded === true || data.storage_recorded === true) {
    return { kind: "partial" };
  }
  return { kind: "failed" };
}
