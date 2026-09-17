/**
 * Shared recognition of "the local AI runtime is gone" failures (CURRENT FRONTEND).
 *
 * Mid-session the local backend or the loaded model can disappear. Only that
 * class of failure may downgrade the central AI availability state
 * (`useAiAvailability().setUnavailable()`), because it means no further AI
 * request can succeed until the model is prepared again.
 *
 * It must NOT trigger on:
 *  - content-safety rejections (the runtime answered, it refused the content),
 *  - validation / invalid-payload errors (our request was wrong),
 *  - authorisation errors (the session, not the runtime, is the problem),
 *  - user cancellation.
 */

/** Failure codes used by the assessment API (`src/lib/assessment/api.ts`). */
export type AssessmentFailureCode =
  | "backend_unavailable"
  | "not_implemented"
  | "invalid_payload"
  | "cancelled";

/** Only `backend_unavailable` means the local runtime is unusable. */
export function isRuntimeUnavailableFailure(failure: string | null | undefined): boolean {
  return failure === "backend_unavailable";
}

const RUNTIME_LOSS_PATTERNS = [
  "backend_unavailable",
  "model_not_loaded",
  "model_unavailable",
  "runtime_unavailable",
  "llm_unavailable",
  "econnrefused",
  "connection refused",
  "failed to fetch",
  "fetch failed",
  "network error",
  "load failed",
  "timeout",
  "timed out",
  "socket hang up",
  "service unavailable",
  "bad gateway",
  "gateway timeout",
];

const NON_RUNTIME_PATTERNS = [
  "safety",
  "moderation",
  "blocked",
  "invalid",
  "validation",
  "unauthorized",
  "unauthorised",
  "forbidden",
  "quota",
  "abort",
  "cancel",
];

/** HTTP statuses that mean the runtime/backend could not serve the request. */
const RUNTIME_LOSS_STATUSES = new Set([502, 503, 504, 522, 524]);

function statusOf(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const candidate = (error as { status?: unknown; statusCode?: unknown }).status ??
    (error as { statusCode?: unknown }).statusCode;
  return typeof candidate === "number" ? candidate : null;
}

/**
 * True when the failure means the local Qwen/context runtime is unavailable or
 * timed out, so the central AI gate must turn red before the next request.
 */
export function isRuntimeUnavailableError(error: unknown): boolean {
  const status = statusOf(error);
  if (status !== null && RUNTIME_LOSS_STATUSES.has(status)) return true;
  if (status !== null && status >= 400 && status < 500) return false;

  const message = (
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === "string"
        ? error
        : ""
  ).toLowerCase();
  if (!message) return false;
  if (NON_RUNTIME_PATTERNS.some((pattern) => message.includes(pattern))) return false;
  return RUNTIME_LOSS_PATTERNS.some((pattern) => message.includes(pattern));
}
