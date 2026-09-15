/**
 * EXPECTED LOCAL BACKEND CONTRACT — model preparation and readiness.
 *
 * These types are the machine-readable contract between the frontend/server
 * adapter and the local Python backend that Codex will implement later.
 *
 * CURRENT FRONTEND: fully implemented (types, adapter, polling, UI).
 * BACKEND TODO FOR CODEX: the local backend does not implement these
 * endpoints yet. Until it does, every call maps to `backend_unavailable` and
 * the app offers "continue without AI". The frontend NEVER measures GPU, RAM
 * or disk itself and never fabricates a `ready` state.
 */

/** Lifecycle of one model preparation operation. */
export const MODEL_PREPARE_STATES = [
  "checking_backend",
  "checking_resources",
  "checking_model",
  "queued",
  "downloading",
  "downloaded",
  "loading",
  "ready",
  "blocked",
  "failed",
  "backend_unavailable",
] as const;

export type ModelPrepareState = (typeof MODEL_PREPARE_STATES)[number];

/** Machine-readable blocking reasons. Never free-text from the backend. */
export const MODEL_BLOCKING_REASONS = [
  "backend_unavailable",
  "model_not_available",
  "download_failed",
  "insufficient_storage",
  "insufficient_gpu_vram",
  "insufficient_ram",
  "model_load_failed",
  "model_process_limit",
  "unknown",
] as const;

export type ModelBlockingReason = (typeof MODEL_BLOCKING_REASONS)[number];

/** One resource dimension as measured by the local backend. */
export interface ResourceMeasurement {
  total_bytes: number | null;
  free_bytes: number | null;
  /** 0..100, whole or fractional percent of the resource that is free. */
  free_percent: number | null;
}

export interface ResourceSnapshot {
  gpu_vram: ResourceMeasurement;
  ram: ResourceMeasurement;
  storage: ResourceMeasurement;
}

/**
 * CURRENT SUPABASE: mirrors `public.get_ai_runtime_policy()`.
 * - admission (50/50/50) gates STARTING a new download or new allocation;
 * - runtime floors (30/25/30) gate marking a session AI-ready after load.
 */
export interface AiRuntimePolicy {
  preflight_gpu_free_percent: number;
  preflight_ram_free_percent: number;
  preflight_storage_free_percent: number;
  ready_gpu_free_percent: number;
  ready_ram_free_percent: number;
  ready_storage_free_percent: number;
  check_active_users: boolean;
  deduplicate_model_downloads: boolean;
  allow_parallel_per_user_model_processes: boolean;
}

export const DEFAULT_AI_RUNTIME_POLICY: AiRuntimePolicy = {
  preflight_gpu_free_percent: 50,
  preflight_ram_free_percent: 50,
  preflight_storage_free_percent: 50,
  ready_gpu_free_percent: 30,
  ready_ram_free_percent: 25,
  ready_storage_free_percent: 30,
  check_active_users: true,
  deduplicate_model_downloads: true,
  allow_parallel_per_user_model_processes: true,
};

/** Full status of a model preparation operation. */
export interface ModelPreparationStatus {
  operation_id: string | null;
  model_id: string;
  state: ModelPrepareState;
  /** 0..100 when the backend reports real progress, otherwise null. */
  progress_percent: number | null;
  /** Bounded machine-readable reason code; never a raw backend error string. */
  message_code: string;
  model_present_on_disk: boolean | null;
  model_download_in_progress: boolean | null;
  /** True when another request/user already owns this model download. */
  shared_download: boolean | null;
  active_user_count: number | null;
  resources: ResourceSnapshot | null;
  admission: {
    gpu_free_percent: number;
    ram_free_percent: number;
    storage_free_percent: number;
  };
  runtime_floors: {
    gpu_free_percent: number;
    ram_free_percent: number;
    storage_free_percent: number;
  };
  can_start_new_allocation: boolean;
  can_continue_with_ai: boolean;
  can_continue_without_ai: boolean;
  retryable: boolean;
  blocking_reasons: ModelBlockingReason[];
}

export function isModelPrepareState(value: unknown): value is ModelPrepareState {
  return typeof value === "string" && (MODEL_PREPARE_STATES as readonly string[]).includes(value);
}

export function isBlockingReason(value: unknown): value is ModelBlockingReason {
  return typeof value === "string" && (MODEL_BLOCKING_REASONS as readonly string[]).includes(value);
}

/** Terminal states: polling must stop. */
export function isTerminalState(state: ModelPrepareState): boolean {
  return (
    state === "ready" ||
    state === "failed" ||
    state === "blocked" ||
    state === "backend_unavailable"
  );
}

/**
 * Semantic surface used by the UI. GREEN ready, AMBER retryable/queued,
 * ORANGE resource pressure, RED blocked/failed/unavailable.
 */
export type ModelStatusTone =
  "neutral" | "progress" | "success" | "warning" | "degraded" | "danger";

export function toneForStatus(status: ModelPreparationStatus): ModelStatusTone {
  switch (status.state) {
    case "ready":
      return "success";
    case "queued":
      return "warning";
    case "blocked":
      return status.can_continue_with_ai ? "degraded" : "danger";
    case "failed":
    case "backend_unavailable":
      return "danger";
    case "downloading":
    case "downloaded":
    case "loading":
    case "checking_backend":
    case "checking_resources":
    case "checking_model":
      return "progress";
    default:
      return "neutral";
  }
}

/** True when the backend reported resource pressure below the runtime floors. */
export function hasResourcePressure(status: ModelPreparationStatus): boolean {
  return status.blocking_reasons.some(
    (reason) =>
      reason === "insufficient_gpu_vram" ||
      reason === "insufficient_ram" ||
      reason === "insufficient_storage",
  );
}

/**
 * The only way the session may be marked AI-ready: the backend explicitly said
 * `ready` AND allows continuing with AI. No client-side inference.
 */
export function isAiReady(status: ModelPreparationStatus): boolean {
  return status.state === "ready" && status.can_continue_with_ai;
}

export function unavailableStatus(
  modelId: string,
  policy: AiRuntimePolicy = DEFAULT_AI_RUNTIME_POLICY,
  messageCode = "backend_unavailable",
): ModelPreparationStatus {
  return {
    operation_id: null,
    model_id: modelId,
    state: "backend_unavailable",
    progress_percent: null,
    message_code: messageCode,
    model_present_on_disk: null,
    model_download_in_progress: null,
    shared_download: null,
    active_user_count: null,
    resources: null,
    admission: {
      gpu_free_percent: policy.preflight_gpu_free_percent,
      ram_free_percent: policy.preflight_ram_free_percent,
      storage_free_percent: policy.preflight_storage_free_percent,
    },
    runtime_floors: {
      gpu_free_percent: policy.ready_gpu_free_percent,
      ram_free_percent: policy.ready_ram_free_percent,
      storage_free_percent: policy.ready_storage_free_percent,
    },
    can_start_new_allocation: false,
    can_continue_with_ai: false,
    can_continue_without_ai: true,
    retryable: true,
    blocking_reasons: ["backend_unavailable"],
  };
}
