/** Server-only caller-JWT adapter for the loopback assessment backend. */
import type {
  AssessmentApiFailure,
  AssessmentApiResult,
  GenerationJob,
  GenerationStatus,
  GradingStatus,
  SubmitPayload,
} from "@/lib/assessment/api";
import type { AssessmentConfig, AssessmentResult } from "@/lib/assessment/types";
import {
  ASSESSMENT_ENDPOINTS,
  localBackendBaseUrl,
  localBackendTimeoutMs,
} from "@/lib/local-backend-endpoints";

interface AuthenticatedCall {
  accessToken: string;
  studentId: string;
  method?: "GET" | "POST";
  body?: unknown;
}

function failureFor(status: number, code: string | null): AssessmentApiFailure {
  if (code === "cancelled") return "cancelled";
  if (status === 501 || code === "not_implemented") return "not_implemented";
  if (status === 400 || status === 409 || status === 415 || status === 422) {
    return "invalid_payload";
  }
  return "backend_unavailable";
}

async function call<T>(path: string, init: AuthenticatedCall): Promise<AssessmentApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    localBackendTimeoutMs("ALIM_ASSESSMENT_BACKEND_TIMEOUT_MS", 30_000),
  );
  try {
    const response = await fetch(`${localBackendBaseUrl()}${path}`, {
      method: init.method ?? "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${init.accessToken}`,
        "X-Student-Id": init.studentId,
      },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => null)) as
      T | { error?: { code?: string } } | null;
    if (!response.ok || payload === null) {
      const code =
        payload && typeof payload === "object" && "error" in payload
          ? (payload.error?.code ?? null)
          : null;
      return { ok: false, failure: failureFor(response.status, code) };
    }
    return { ok: true, data: payload as T };
  } catch {
    return { ok: false, failure: "backend_unavailable" };
  } finally {
    clearTimeout(timer);
  }
}

export function createGenerationOnBackend(input: {
  accessToken: string;
  studentId: string;
  config: AssessmentConfig;
  modelId: string;
  idempotencyKey: string;
}): Promise<AssessmentApiResult<GenerationJob>> {
  return call(ASSESSMENT_ENDPOINTS.generation, {
    accessToken: input.accessToken,
    studentId: input.studentId,
    body: {
      config: input.config,
      model_id: input.modelId,
      idempotency_key: input.idempotencyKey,
    },
  });
}

export function generationStatusOnBackend(input: {
  accessToken: string;
  studentId: string;
  jobId: string;
}): Promise<AssessmentApiResult<GenerationStatus>> {
  return call(`${ASSESSMENT_ENDPOINTS.generation}/${encodeURIComponent(input.jobId)}`, {
    accessToken: input.accessToken,
    studentId: input.studentId,
    method: "GET",
  });
}

export function cancelGenerationOnBackend(input: {
  accessToken: string;
  studentId: string;
  jobId: string;
}): Promise<AssessmentApiResult<{ cancelled: boolean }>> {
  return call(`${ASSESSMENT_ENDPOINTS.generation}/${encodeURIComponent(input.jobId)}/cancel`, {
    accessToken: input.accessToken,
    studentId: input.studentId,
  });
}

export function beginAssessmentOnBackend(input: {
  accessToken: string;
  studentId: string;
  attemptId: string;
}): Promise<AssessmentApiResult<{ startedAt: string }>> {
  return call(
    `${ASSESSMENT_ENDPOINTS.attempt}/${encodeURIComponent(input.attemptId)}/begin`,
    input,
  );
}

export function heartbeatAssessmentOnBackend(input: {
  accessToken: string;
  studentId: string;
  attemptId: string;
}): Promise<AssessmentApiResult<{ alive: boolean }>> {
  return call(
    `${ASSESSMENT_ENDPOINTS.attempt}/${encodeURIComponent(input.attemptId)}/heartbeat`,
    input,
  );
}

export function submitAssessmentOnBackend(input: {
  accessToken: string;
  studentId: string;
  payload: SubmitPayload;
  idempotencyKey: string;
}): Promise<AssessmentApiResult<{ attemptId: string }>> {
  return call(
    `${ASSESSMENT_ENDPOINTS.attempt}/${encodeURIComponent(input.payload.attemptId)}/submit`,
    {
      accessToken: input.accessToken,
      studentId: input.studentId,
      body: { payload: input.payload, idempotency_key: input.idempotencyKey },
    },
  );
}

export function abandonAssessmentOnBackend(input: {
  accessToken: string;
  studentId: string;
  jobId?: string | undefined;
  attemptId?: string | undefined;
}): Promise<AssessmentApiResult<{ cleaned: boolean }>> {
  return call(ASSESSMENT_ENDPOINTS.abandon, {
    accessToken: input.accessToken,
    studentId: input.studentId,
    body: { jobId: input.jobId, attemptId: input.attemptId },
  });
}

export function gradingStatusOnBackend(input: {
  accessToken: string;
  studentId: string;
  attemptId: string;
}): Promise<AssessmentApiResult<GradingStatus>> {
  return call(`${ASSESSMENT_ENDPOINTS.attempt}/${encodeURIComponent(input.attemptId)}/grading`, {
    accessToken: input.accessToken,
    studentId: input.studentId,
    method: "GET",
  });
}

export function assessmentResultOnBackend(input: {
  accessToken: string;
  studentId: string;
  attemptId: string;
}): Promise<AssessmentApiResult<AssessmentResult>> {
  return call(`${ASSESSMENT_ENDPOINTS.attempt}/${encodeURIComponent(input.attemptId)}/result`, {
    accessToken: input.accessToken,
    studentId: input.studentId,
    method: "GET",
  });
}
