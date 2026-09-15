/**
 * SERVER-ONLY adapter for the local safety/moderation backend and the
 * safety-approved peer-message send path.
 *
 * BACKEND TODO FOR CODEX: these endpoints do not exist yet. Every failure maps
 * to `safety_unavailable`, which FAILS CLOSED: no content is sent or processed.
 * Raw content is forwarded to the local backend for classification only and is
 * NEVER logged, echoed back, or written to telemetry.
 */
import {
  SAFETY_ENDPOINTS,
  localBackendBaseUrl,
  localBackendTimeoutMs,
} from "@/lib/local-backend-endpoints";
import {
  isSafetyVerdict,
  safetyUnavailable,
  SAFETY_CATEGORIES,
  type PeerSendResult,
  type SafetyCategory,
  type SafetyDecision,
  type SafetySurface,
} from "@/lib/safety.types";

interface CallInit {
  body: unknown;
  /** AUTHORIZATION BOUNDARY: caller's verified Supabase access token. */
  accessToken: string;
  /** Context / cross-check only. */
  studentId: string;
}

async function callBackend(path: string, init: CallInit): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), localBackendTimeoutMs());
  try {
    const response = await fetch(`${localBackendBaseUrl()}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${init.accessToken}`,
        "X-Student-Id": init.studentId,
      },
      body: JSON.stringify(init.body),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return (await response.json().catch(() => null)) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function row(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function category(value: unknown): SafetyCategory | null {
  return typeof value === "string" && (SAFETY_CATEGORIES as readonly string[]).includes(value)
    ? (value as SafetyCategory)
    : null;
}

function normaliseDecision(raw: unknown): SafetyDecision {
  const r = row(raw);
  const verdict = r["verdict"];
  if (!isSafetyVerdict(verdict)) return safetyUnavailable("invalid_response");
  return {
    verdict,
    category_code: category(r["category_code"]),
    reason_code: typeof r["reason_code"] === "string" ? r["reason_code"].slice(0, 80) : null,
    strike_number: typeof r["strike_number"] === "number" ? r["strike_number"] : null,
    guardian_review_queued:
      typeof r["guardian_review_queued"] === "boolean" ? r["guardian_review_queued"] : null,
    account_suspended_pending_review:
      typeof r["account_suspended_pending_review"] === "boolean"
        ? r["account_suspended_pending_review"]
        : null,
    retryable: typeof r["retryable"] === "boolean" ? r["retryable"] : verdict === "safety_unavailable",
    message_code: typeof r["message_code"] === "string" ? r["message_code"].slice(0, 80) : verdict,
  };
}

export async function moderateContentOnBackend(input: {
  accessToken: string;
  studentId: string;
  surface: SafetySurface;
  text: string;
  attachments?: { file_name: string; mime_type: string; byte_size: number }[];
}): Promise<SafetyDecision> {
  const payload = await callBackend(SAFETY_ENDPOINTS.moderate, {
    accessToken: input.accessToken,
    studentId: input.studentId,
    body: {
      surface: input.surface,
      text: input.text,
      attachments: input.attachments ?? [],
    },
  });
  if (payload === null) return safetyUnavailable();
  return normaliseDecision(payload);
}

/**
 * Sends a peer message through the local backend, which is the only component
 * allowed to persist `peer_messages` (direct browser writes are disabled in
 * production RLS on purpose). A missing backend means "not sent".
 */
export async function sendPeerMessageOnBackend(input: {
  accessToken: string;
  studentId: string;
  conversationId: string;
  body: string;
  attachments: {
    file_name: string;
    mime_type: string;
    byte_size: number;
    /** base64 payload, already compressed and <= 250000 bytes. */
    data_base64: string;
  }[];
}): Promise<PeerSendResult> {
  const payload = await callBackend(SAFETY_ENDPOINTS.peerMessageSend, {
    accessToken: input.accessToken,
    studentId: input.studentId,
    body: {
      conversation_id: input.conversationId,
      body: input.body,
      attachments: input.attachments,
    },
  });
  if (payload === null) {
    return { sent: false, message_id: null, conversation_id: input.conversationId, safety: safetyUnavailable() };
  }
  const r = row(payload);
  const safety = normaliseDecision(r["safety"]);
  const sent = r["sent"] === true && safety.verdict === "allow";
  return {
    sent,
    message_id: typeof r["message_id"] === "string" ? r["message_id"] : null,
    conversation_id:
      typeof r["conversation_id"] === "string" ? r["conversation_id"] : input.conversationId,
    safety,
  };
}
