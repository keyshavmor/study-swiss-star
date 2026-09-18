/**
 * SERVER-ONLY adapter for the local backend's system admission / health /
 * session-lease endpoints. Endpoint names live in `local-backend-endpoints.ts`.
 *
 * Any 404, timeout, network error or unparsable payload maps to an explicit
 * unavailable state. Admission FAILS CLOSED — never fabricated.
 */
import {
  SYSTEM_ENDPOINTS,
  localBackendBaseUrl,
  localBackendTimeoutMs,
} from "@/lib/local-backend-endpoints";
import {
  DEFAULT_SYSTEM_ADMISSION_POLICY,
  admissionUnavailable,
  effectiveUtilisationCaps,
  isAdmissionState,
  unavailableLocalHealth,
  type AdmissionStatus,
  type GpuInfo,
  type LocalBackendHealth,
} from "@/lib/system-admission.types";
import type { ResourceMeasurement, ResourceSnapshot } from "@/lib/model-readiness.types";
import type { SystemAdmissionPolicyRow } from "@/integrations/supabase/types";

interface CallInit {
  method: "GET" | "POST";
  body?: unknown;
  /** AUTHORIZATION BOUNDARY: caller's verified Supabase access token. */
  accessToken: string;
  /** Context / cross-check only — never authentication. */
  studentId: string;
}

async function callBackend(path: string, init: CallInit): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), localBackendTimeoutMs());
  try {
    const response = await fetch(`${localBackendBaseUrl()}${path}`, {
      method: init.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${init.accessToken}`,
        "X-Student-Id": init.studentId,
      },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
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

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function bool(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function measurement(raw: unknown): ResourceMeasurement {
  const r = row(raw);
  return {
    total_bytes: num(r["total_bytes"]),
    free_bytes: num(r["free_bytes"]),
    free_percent: num(r["free_percent"]),
  };
}

function resources(raw: unknown): ResourceSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const r = row(raw);
  return {
    gpu_vram: measurement(r["gpu_vram"]),
    ram: measurement(r["ram"]),
    storage: measurement(r["storage"]),
  };
}

function normaliseAdmission(raw: unknown, policy: SystemAdmissionPolicyRow): AdmissionStatus {
  const r = row(raw);
  const state = r["state"];
  if (!isAdmissionState(state)) return admissionUnavailable(policy, "invalid_response");

  const leaseRaw = row(r["lease"]);
  const leaseId = str(leaseRaw["lease_id"]);
  const lease =
    state === "admitted" && leaseId
      ? {
          lease_id: leaseId,
          expires_at: str(leaseRaw["expires_at"]),
          heartbeat_interval_seconds: num(leaseRaw["heartbeat_interval_seconds"]),
        }
      : null;

  // Fail closed: "admitted" without a lease is not admission.
  if (state === "admitted" && !lease) return admissionUnavailable(policy, "invalid_response");

  const thresholds = row(r["login_thresholds"]);
  return {
    state,
    lease,
    active_user_count: num(r["active_user_count"]),
    max_active_users: num(r["max_active_users"]) ?? policy.max_active_users,
    queue_position: num(r["queue_position"]),
    queue_size: num(r["queue_size"]),
    resources: resources(r["resources"]),
    login_thresholds: {
      gpu_free_percent: num(thresholds["gpu_free_percent"]) ?? policy.login_gpu_free_percent,
      ram_free_percent: num(thresholds["ram_free_percent"]) ?? policy.login_ram_free_percent,
      storage_free_percent:
        num(thresholds["storage_free_percent"]) ?? policy.login_storage_free_percent,
    },
    effective_caps: effectiveUtilisationCaps(policy),
    preferred_model_id: str(r["preferred_model_id"]),
    assigned_model_id: str(r["assigned_model_id"]),
    recommended_model_id: str(r["recommended_model_id"]),
    recommendation_reason_code: str(r["recommendation_reason_code"]),
    rebalance_needed: bool(r["rebalance_needed"]),
    rebalance_in_progress: bool(r["rebalance_in_progress"]),
    retry_at: str(r["retry_at"]),
    message_code: str(r["message_code"]) ?? state,
    retryable: bool(r["retryable"]) ?? state !== "denied_user_limit",
    can_continue_without_ai: state === "admitted",
  };
}

export async function checkAdmissionOnBackend(input: {
  accessToken: string;
  studentId: string;
  preferredModelId: string | null;
  policy?: SystemAdmissionPolicyRow;
}): Promise<AdmissionStatus> {
  const policy = input.policy ?? DEFAULT_SYSTEM_ADMISSION_POLICY;
  const payload = await callBackend(SYSTEM_ENDPOINTS.admissionCheck, {
    method: "POST",
    accessToken: input.accessToken,
    studentId: input.studentId,
    body: { preferred_model_id: input.preferredModelId, policy },
  });
  if (payload === null) return admissionUnavailable(policy);
  return normaliseAdmission(payload, policy);
}

function gpus(raw: unknown): GpuInfo[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const r = row(entry);
    const instancesRaw = Array.isArray(r["instances"]) ? r["instances"] : [];
    return {
      gpu_id: str(r["gpu_id"]) ?? "gpu",
      name: str(r["name"]),
      total_vram_bytes: num(r["total_vram_bytes"]),
      free_vram_bytes: num(r["free_vram_bytes"]),
      used_vram_bytes: num(r["used_vram_bytes"]),
      utilisation_percent: num(r["utilisation_percent"]),
      instances: instancesRaw.map((instance) => {
        const i = row(instance);
        return {
          model_id: str(i["model_id"]) ?? "unknown",
          process_count: num(i["process_count"]),
          vram_bytes: num(i["vram_bytes"]),
          owned_by_me: bool(i["owned_by_me"]),
        };
      }),
    };
  });
}

export async function fetchLocalHealthOnBackend(input: {
  accessToken: string;
  studentId: string;
  policy?: SystemAdmissionPolicyRow;
}): Promise<LocalBackendHealth> {
  const policy = input.policy ?? DEFAULT_SYSTEM_ADMISSION_POLICY;
  const payload = await callBackend(SYSTEM_ENDPOINTS.health, {
    method: "GET",
    accessToken: input.accessToken,
    studentId: input.studentId,
  });
  if (payload === null) return unavailableLocalHealth(policy);
  const r = row(payload);
  const ram = row(r["ram"]);
  const disk = row(r["disk"]);
  return {
    available: true,
    active_user_count: num(r["active_user_count"]),
    max_active_users: num(r["max_active_users"]) ?? policy.max_active_users,
    queue_size: num(r["queue_size"]),
    my_queue_position: num(r["my_queue_position"]),
    gpus: gpus(r["gpus"]),
    ram: {
      total_bytes: num(ram["total_bytes"]),
      free_bytes: num(ram["free_bytes"]),
      used_bytes: num(ram["used_bytes"]),
      used_percent: num(ram["used_percent"]),
    },
    disk: {
      total_bytes: num(disk["total_bytes"]),
      free_bytes: num(disk["free_bytes"]),
      used_bytes: num(disk["used_bytes"]),
      used_percent: num(disk["used_percent"]),
    },
    rebalance_state: str(r["rebalance_state"]),
    recommended_model_id: str(r["recommended_model_id"]),
    recommendation_reason_code: str(r["recommendation_reason_code"]),
    my_preferred_model_id: str(r["my_preferred_model_id"]),
    my_assigned_model_id: str(r["my_assigned_model_id"]),
    message_code: str(r["message_code"]) ?? "ok",
  };
}

/** Best-effort release of the caller's runtime allocation. */
export async function releaseRuntimeOnBackend(input: {
  accessToken: string;
  studentId: string;
  leaseId: string | null;
}): Promise<{ released: boolean; message_code: string }> {
  const payload = await callBackend(SYSTEM_ENDPOINTS.runtimeRelease, {
    method: "POST",
    accessToken: input.accessToken,
    studentId: input.studentId,
    body: { lease_id: input.leaseId },
  });
  if (payload === null) return { released: false, message_code: "backend_unavailable" };
  const r = row(payload);
  return {
    released: bool(r["released"]) ?? false,
    message_code: str(r["message_code"]) ?? "ok",
  };
}

export async function heartbeatOnBackend(input: {
  accessToken: string;
  studentId: string;
  leaseId: string;
}): Promise<{ alive: boolean }> {
  const payload = await callBackend(SYSTEM_ENDPOINTS.sessionHeartbeat, {
    method: "POST",
    accessToken: input.accessToken,
    studentId: input.studentId,
    body: { lease_id: input.leaseId },
  });
  return { alive: payload !== null && bool(row(payload)["alive"]) === true };
}
