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
  createGenerationJob(config: AssessmentConfig): Promise<AssessmentApiResult<GenerationJob>>;
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

let activeApi: AssessmentApi = unavailableAssessmentApi;

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
