/**
 * Assessment API abstraction.
 *
 * This is the ONLY place future backend operations are named. Nothing here
 * pretends to work: every operation fails closed with `backend_unavailable`
 * until the local Python backend implements the contract.
 *
 * FUTURE BACKEND / CODEX: implement these operations in the FastAPI backend and
 * expose them through an authenticated server-side bridge that forwards the
 * verified Supabase bearer token. Never call them directly from the browser
 * with credentials, and never return an answer key while an attempt is active.
 */
import type {
  AssessmentConfig,
  AssessmentResult,
  AttemptStatus,
  PublicQuestion,
  StudentAnswer,
} from "./types";
import { assessmentResultSchema } from "./types";
import type { GenerationPhase } from "./lifecycle";

export type AssessmentApiFailure =
  "backend_unavailable" | "not_implemented" | "invalid_payload" | "cancelled";

export type AssessmentApiResult<T> =
  { ok: true; data: T } | { ok: false; failure: AssessmentApiFailure };

export interface GenerationJob {
  jobId: string;
  /** Only set when the backend reports a phase. */
  phase: GenerationPhase | null;
}

export interface GenerationStatus {
  jobId: string;
  state: "queued" | "generating" | "validating" | "ready" | "failed" | "cancelled" | "expired";
  phase: GenerationPhase | null;
  /** Present only in the `ready` state. Contains no answer keys. */
  questions?: PublicQuestion[] | undefined;
  attemptId?: string | undefined;
  errorKey?: string | undefined;
}

export interface SubmitPayload {
  attemptId: string;
  config: AssessmentConfig;
  /** Snapshot of what the student saw, so history stays reproducible. */
  questions: PublicQuestion[];
  answers: StudentAnswer[];
  startedAt: string;
  submittedAt: string;
  timeTakenSeconds: number | null;
  autoSubmitted: boolean;
}

export interface GradingStatus {
  attemptId: string;
  status: AttemptStatus;
  errorKey?: string | undefined;
}

export interface AssessmentApi {
  createGenerationJob(
    config: AssessmentConfig,
    options?: { modelId?: string | undefined },
  ): Promise<AssessmentApiResult<GenerationJob>>;
  getGenerationStatus(jobId: string): Promise<AssessmentApiResult<GenerationStatus>>;
  cancelGeneration(jobId: string): Promise<AssessmentApiResult<{ cancelled: boolean }>>;
  beginAssessment(attemptId: string): Promise<AssessmentApiResult<{ startedAt: string }>>;
  heartbeat(attemptId: string): Promise<AssessmentApiResult<{ alive: boolean }>>;
  submitAssessment(payload: SubmitPayload): Promise<AssessmentApiResult<{ attemptId: string }>>;
  abandonAssessment(reference: {
    jobId?: string | undefined;
    attemptId?: string | undefined;
  }): Promise<AssessmentApiResult<{ cleaned: boolean }>>;
  getGradingStatus(attemptId: string): Promise<AssessmentApiResult<GradingStatus>>;
  getResult(attemptId: string): Promise<AssessmentApiResult<AssessmentResult>>;
}

const unavailable = async <T>(): Promise<AssessmentApiResult<T>> => ({
  ok: false,
  failure: "backend_unavailable",
});

/**
 * Production adapter. The generation/grading backend does not exist yet, so
 * every call reports that the backend is unavailable — no invented URLs, no
 * fabricated progress, no fake grades.
 */
export const unavailableAssessmentApi: AssessmentApi = {
  createGenerationJob: unavailable,
  getGenerationStatus: unavailable,
  cancelGeneration: unavailable,
  beginAssessment: unavailable,
  heartbeat: unavailable,
  submitAssessment: unavailable,
  abandonAssessment: unavailable,
  getGradingStatus: unavailable,
  getResult: unavailable,
};

function idempotencyKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

const submissionKeys = new Map<string, string>();

/** Production adapter: browser → authenticated TanStack function → loopback backend. */
export const productionAssessmentApi: AssessmentApi = {
  async createGenerationJob(config, options) {
    if (!options?.modelId) return { ok: false, failure: "backend_unavailable" };
    const { createAssessmentGeneration } = await import("@/lib/assessment.functions");
    return createAssessmentGeneration({
      data: {
        config,
        modelId: options.modelId,
        idempotencyKey: idempotencyKey("assessment-generation"),
      },
    });
  },
  async getGenerationStatus(jobId) {
    const { fetchAssessmentGeneration } = await import("@/lib/assessment.functions");
    return fetchAssessmentGeneration({ data: { jobId } });
  },
  async cancelGeneration(jobId) {
    const { cancelAssessmentGeneration } = await import("@/lib/assessment.functions");
    return cancelAssessmentGeneration({ data: { jobId } });
  },
  async beginAssessment(attemptId) {
    const { beginAssessmentAttempt } = await import("@/lib/assessment.functions");
    return beginAssessmentAttempt({ data: { attemptId } });
  },
  async heartbeat(attemptId) {
    const { heartbeatAssessmentAttempt } = await import("@/lib/assessment.functions");
    return heartbeatAssessmentAttempt({ data: { attemptId } });
  },
  async submitAssessment(payload) {
    const { submitAssessmentAttempt } = await import("@/lib/assessment.functions");
    const key =
      submissionKeys.get(payload.attemptId) ??
      idempotencyKey(`assessment-submit-${payload.attemptId}`);
    submissionKeys.set(payload.attemptId, key);
    return submitAssessmentAttempt({
      data: { payload, idempotencyKey: key },
    });
  },
  async abandonAssessment(reference) {
    const { abandonAssessmentAttempt } = await import("@/lib/assessment.functions");
    const result = await abandonAssessmentAttempt({ data: reference });
    if (reference.attemptId) submissionKeys.delete(reference.attemptId);
    return result;
  },
  async getGradingStatus(attemptId) {
    const { fetchAssessmentGrading } = await import("@/lib/assessment.functions");
    return fetchAssessmentGrading({ data: { attemptId } });
  },
  async getResult(attemptId) {
    const { fetchAssessmentResult } = await import("@/lib/assessment.functions");
    const result = await fetchAssessmentResult({ data: { attemptId } });
    if (!result.ok) return result;
    const parsed = assessmentResultSchema.safeParse(result.data);
    if (!parsed.success) return { ok: false, failure: "invalid_payload" };
    submissionKeys.delete(attemptId);
    return { ok: true, data: parsed.data };
  },
};

let activeApi: AssessmentApi = productionAssessmentApi;

/** Swap the adapter. Used by the development preview adapter and by tests. */
export function setAssessmentApi(api: AssessmentApi): void {
  activeApi = api;
}

export function getAssessmentApi(): AssessmentApi {
  return activeApi;
}

/**
 * Best-effort cleanup of a pre-submission session. Used on route change,
 * sign-out and page hide. Browser lifecycle events are never treated as a
 * guarantee — the backend TTL/heartbeat contract is authoritative.
 *
 * FUTURE BACKEND / CODEX: cleanup must delete generated questions, question
 * metadata, answer keys and attempt configuration, and terminate generation.
 */
export function requestAbandonCleanup(reference: {
  jobId?: string | undefined;
  attemptId?: string | undefined;
}): void {
  if (!reference.jobId && !reference.attemptId) return;
  void activeApi.abandonAssessment(reference).catch(() => undefined);
}

/**
 * The single pre-submission session reference of this tab, if any. Kept in
 * memory only (never localStorage) so sign-out can request backend cleanup of
 * ephemeral generated content.
 */
let activeReference: { jobId?: string | undefined; attemptId?: string | undefined } | null = null;

export function setActiveAssessmentReference(
  reference: { jobId?: string | undefined; attemptId?: string | undefined } | null,
): void {
  activeReference = reference && (reference.jobId || reference.attemptId) ? { ...reference } : null;
}

export function getActiveAssessmentReference() {
  return activeReference;
}

/** Called on sign-out: abandon whatever ephemeral session is still open. */
export function abandonActiveAssessment(): void {
  if (!activeReference) return;
  requestAbandonCleanup(activeReference);
  activeReference = null;
}
