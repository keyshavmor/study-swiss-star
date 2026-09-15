/**
 * EXPECTED LOCAL BACKEND CONTRACT — content safety verdicts.
 *
 * CURRENT FRONTEND: types, adapter, fail-closed UI implemented.
 * CURRENT SUPABASE: `moderation_events` (bounded metadata only) and
 * `guardian_notification_queue` (admin review queue) already exist; the
 * service-only `apply_confirmed_safety_strike(...)` is NOT callable from the
 * browser.
 * BACKEND TODO FOR CODEX: classification itself. Until it exists, every
 * content-generating action fails closed with `safety_unavailable`.
 *
 * Production enforcement policy (review-gated, mirrored in the UI):
 *  - first CONFIRMED violation → content blocked + strike/warning;
 *  - second CONFIRMED violation → `suspended_pending_review`, and for students
 *    a guardian-notification item is QUEUED FOR HUMAN REVIEW;
 *  - no automatic permanent deletion and no guardian disclosure based solely on
 *    an unreviewed AI classification.
 */

export const SAFETY_VERDICTS = [
  "allow",
  "block_warning",
  "block_suspend_pending_review",
  "safety_unavailable",
  "scanning",
] as const;

export type SafetyVerdict = (typeof SAFETY_VERDICTS)[number];

export function isSafetyVerdict(value: unknown): value is SafetyVerdict {
  return typeof value === "string" && (SAFETY_VERDICTS as readonly string[]).includes(value);
}

/**
 * Bounded category codes. Educational context is explicitly NOT blanket
 * blocked: age-appropriate curriculum discussion of history, war, medicine,
 * drugs or sexual health is allowed; explicit, graphic, instructional or
 * glorifying content unsuitable for minors is blocked.
 */
export const SAFETY_CATEGORIES = [
  "sexual_explicit",
  "sexual_minor",
  "graphic_violence",
  "self_harm",
  "harassment_bullying",
  "hate",
  "illegal_instructions",
  "drugs_instructional",
  "weapons_instructional",
  "extremism_glorification",
  "personal_data_exposure",
  "other",
] as const;

export type SafetyCategory = (typeof SAFETY_CATEGORIES)[number];

export const SAFETY_SURFACES = ["peer_message", "ai_prompt", "attachment"] as const;
export type SafetySurface = (typeof SAFETY_SURFACES)[number];

export interface SafetyDecision {
  verdict: SafetyVerdict;
  /** Bounded codes only — raw offending content is NEVER echoed back. */
  category_code: SafetyCategory | null;
  reason_code: string | null;
  /** Confirmed strike number after the backend recorded the decision. */
  strike_number: number | null;
  /** True when a guardian-notification item was queued for HUMAN review. */
  guardian_review_queued: boolean | null;
  /** True when the account is now `suspended_pending_review`. */
  account_suspended_pending_review: boolean | null;
  retryable: boolean;
  message_code: string;
}

export function safetyUnavailable(messageCode = "safety_unavailable"): SafetyDecision {
  return {
    verdict: "safety_unavailable",
    category_code: null,
    reason_code: null,
    strike_number: null,
    guardian_review_queued: null,
    account_suspended_pending_review: null,
    retryable: true,
    message_code: messageCode,
  };
}

export function isAllowed(decision: SafetyDecision): boolean {
  return decision.verdict === "allow";
}

export type SafetyTone = "success" | "warning" | "danger" | "neutral";

export function toneForVerdict(verdict: SafetyVerdict): SafetyTone {
  switch (verdict) {
    case "allow":
      return "success";
    case "block_warning":
      return "warning";
    case "block_suspend_pending_review":
      return "danger";
    case "safety_unavailable":
      return "warning";
    default:
      return "neutral";
  }
}

/** Result of an attempted peer-message send. */
export interface PeerSendResult {
  sent: boolean;
  message_id: string | null;
  conversation_id: string | null;
  safety: SafetyDecision;
}
