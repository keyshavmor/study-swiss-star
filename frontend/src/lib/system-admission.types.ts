/**
 * EXPECTED LOCAL BACKEND CONTRACT — system admission, capacity and load
 * balancing. Separate from model readiness: a browser session must first be
 * ADMITTED, then a model must be prepared.
 *
 * CURRENT FRONTEND: types, adapter, session lease and UI implemented.
 * CURRENT SUPABASE: policy/config only, via `get_system_admission_policy()`.
 * BACKEND TODO FOR CODEX: measurements, active-user accounting, queueing and
 * rebalancing. Admission FAILS CLOSED while the backend is unavailable.
 */
import type { ResourceSnapshot } from "@/lib/model-readiness.types";
import type { SystemAdmissionPolicyRow } from "@/integrations/supabase/types";

export const ADMISSION_STATES = [
  "checking",
  "admitted",
  "queued",
  "denied_capacity",
  "denied_user_limit",
  "backend_unavailable",
] as const;

export type AdmissionState = (typeof ADMISSION_STATES)[number];

export function isAdmissionState(value: unknown): value is AdmissionState {
  return typeof value === "string" && (ADMISSION_STATES as readonly string[]).includes(value);
}

/** CURRENT SUPABASE values of `get_system_admission_policy()`. */
export const DEFAULT_SYSTEM_ADMISSION_POLICY: SystemAdmissionPolicyRow = {
  max_active_users: 10,
  login_gpu_free_percent: 50,
  login_ram_free_percent: 50,
  login_storage_free_percent: 50,
  max_gpu_used_percent: 75,
  max_ram_used_percent: 75,
  max_storage_used_percent: 75,
  automatic_model_rebalancing: true,
  preserve_inflight_requests: true,
  queue_new_allocations_while_rebalancing: true,
  recommend_model_from_system_health: true,
};

/** AI-ready runtime floors from the earlier pass (percent FREE). */
export const AI_READY_FREE_FLOORS = {
  gpu_free_percent: 30,
  ram_free_percent: 25,
  storage_free_percent: 30,
} as const;

export interface EffectiveUtilisationCaps {
  gpu_used_percent: number;
  ram_used_percent: number;
  storage_used_percent: number;
}

/**
 * The global "never exceed 75% used" ceiling is ADDITIONAL to the older
 * 30/25/30 free floors — it never weakens them. The effective cap is therefore
 * the stricter of (100 - free floor) and the policy ceiling: GPU 70, RAM 75,
 * storage 70 with the current production values.
 */
export function effectiveUtilisationCaps(
  policy: SystemAdmissionPolicyRow = DEFAULT_SYSTEM_ADMISSION_POLICY,
  floors: typeof AI_READY_FREE_FLOORS = AI_READY_FREE_FLOORS,
): EffectiveUtilisationCaps {
  return {
    gpu_used_percent: Math.min(policy.max_gpu_used_percent, 100 - floors.gpu_free_percent),
    ram_used_percent: Math.min(policy.max_ram_used_percent, 100 - floors.ram_free_percent),
    storage_used_percent: Math.min(policy.max_storage_used_percent, 100 - floors.storage_free_percent),
  };
}

/** Per-session admission lease reported by the backend. */
export interface AdmissionLease {
  lease_id: string;
  /** ISO-8601 expiry; null when the backend does not expose one. */
  expires_at: string | null;
  /** Seconds between heartbeats; null when unknown. */
  heartbeat_interval_seconds: number | null;
}

export interface AdmissionStatus {
  state: AdmissionState;
  lease: AdmissionLease | null;
  active_user_count: number | null;
  max_active_users: number;
  queue_position: number | null;
  queue_size: number | null;
  resources: ResourceSnapshot | null;
  login_thresholds: {
    gpu_free_percent: number;
    ram_free_percent: number;
    storage_free_percent: number;
  };
  effective_caps: EffectiveUtilisationCaps;
  preferred_model_id: string | null;
  assigned_model_id: string | null;
  recommended_model_id: string | null;
  recommendation_reason_code: string | null;
  rebalance_needed: boolean | null;
  rebalance_in_progress: boolean | null;
  /** ISO-8601 timestamp the client may retry at, when the backend supplies it. */
  retry_at: string | null;
  message_code: string;
  retryable: boolean;
  /** Ordinary non-AI app features stay usable once admitted. */
  can_continue_without_ai: boolean;
}

export function isAdmitted(status: AdmissionStatus): boolean {
  return status.state === "admitted" && status.lease !== null;
}

export function admissionUnavailable(
  policy: SystemAdmissionPolicyRow = DEFAULT_SYSTEM_ADMISSION_POLICY,
  messageCode = "backend_unavailable",
  state: AdmissionState = "backend_unavailable",
): AdmissionStatus {
  return {
    state,
    lease: null,
    active_user_count: null,
    max_active_users: policy.max_active_users,
    queue_position: null,
    queue_size: null,
    resources: null,
    login_thresholds: {
      gpu_free_percent: policy.login_gpu_free_percent,
      ram_free_percent: policy.login_ram_free_percent,
      storage_free_percent: policy.login_storage_free_percent,
    },
    effective_caps: effectiveUtilisationCaps(policy),
    preferred_model_id: null,
    assigned_model_id: null,
    recommended_model_id: null,
    recommendation_reason_code: null,
    rebalance_needed: null,
    rebalance_in_progress: null,
    retry_at: null,
    message_code: messageCode,
    retryable: true,
    can_continue_without_ai: false,
  };
}

/* ------------------------------------------------------- system health ---- */

export interface GpuInstanceInfo {
  /** Model running on this GPU. Never another user's identity. */
  model_id: string;
  process_count: number | null;
  vram_bytes: number | null;
  /** True only for the CURRENT caller's own process. */
  owned_by_me: boolean | null;
}

export interface GpuInfo {
  gpu_id: string;
  name: string | null;
  total_vram_bytes: number | null;
  free_vram_bytes: number | null;
  used_vram_bytes: number | null;
  utilisation_percent: number | null;
  instances: GpuInstanceInfo[];
}

export interface LocalBackendHealth {
  available: boolean;
  active_user_count: number | null;
  max_active_users: number;
  queue_size: number | null;
  my_queue_position: number | null;
  gpus: GpuInfo[];
  ram: {
    total_bytes: number | null;
    free_bytes: number | null;
    used_bytes: number | null;
    used_percent: number | null;
  } | null;
  disk: {
    total_bytes: number | null;
    free_bytes: number | null;
    used_bytes: number | null;
    used_percent: number | null;
  } | null;
  rebalance_state: string | null;
  recommended_model_id: string | null;
  recommendation_reason_code: string | null;
  my_preferred_model_id: string | null;
  my_assigned_model_id: string | null;
  message_code: string;
}

export function unavailableLocalHealth(
  policy: SystemAdmissionPolicyRow = DEFAULT_SYSTEM_ADMISSION_POLICY,
): LocalBackendHealth {
  return {
    available: false,
    active_user_count: null,
    max_active_users: policy.max_active_users,
    queue_size: null,
    my_queue_position: null,
    gpus: [],
    ram: null,
    disk: null,
    rebalance_state: null,
    recommended_model_id: null,
    recommendation_reason_code: null,
    my_preferred_model_id: null,
    my_assigned_model_id: null,
    message_code: "backend_unavailable",
  };
}
