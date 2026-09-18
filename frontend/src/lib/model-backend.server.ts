/**
 * SERVER-ONLY adapter for the local model backend.
 *
 * Endpoint names are centralised here. Nothing in the browser talks to the
 * local backend directly, and no response is ever invented: any 404, timeout,
 * network error or unparsable payload maps to `backend_unavailable`.
 *
 * BACKEND TODO FOR CODEX: implement these endpoints in the local FastAPI app.
 */
import {
  DEFAULT_AI_RUNTIME_POLICY,
  isBlockingReason,
  isModelPrepareState,
  unavailableStatus,
  type AiRuntimePolicy,
  type ModelBlockingReason,
  type ModelPreparationStatus,
  type ResourceMeasurement,
  type ResourceSnapshot,
} from "@/lib/model-readiness.types";

/** Centralised local-backend endpoint paths. */
export const MODEL_BACKEND_ENDPOINTS = {
  /** Legacy/compatible readiness probe kept for backward compatibility. */
  status: "/api/model/status",
  /** Start or join preparation of a model. */
  prepare: "/api/model/prepare",
  /** Poll one preparation operation. */
  operation: "/api/model/operation",
} as const;

function baseUrl(): string {
  return (process.env["ALIM_CONTEXT_BACKEND_URL"] ?? "http://127.0.0.1:8001").replace(/\/$/, "");
}

function timeoutMs(): number {
  return Number(process.env["ALIM_MODEL_BACKEND_TIMEOUT_MS"] ?? 15_000);
}

async function callBackend(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown; accessToken: string; studentId: string },
): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  try {
    const response = await fetch(`${baseUrl()}${path}`, {
      method: init.method,
      headers: {
        "Content-Type": "application/json",
        // AUTHORIZATION BOUNDARY: the caller's verified Supabase access token is
        // forwarded server-to-server. It is never logged, persisted or sent to
        // telemetry, and no service-role key is used here.
        Authorization: `Bearer ${init.accessToken}`,
        // Context / cross-check only — never an authentication mechanism.
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

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function bool(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function measurement(raw: unknown): ResourceMeasurement {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    total_bytes: num(row["total_bytes"]),
    free_bytes: num(row["free_bytes"]),
    free_percent: num(row["free_percent"]),
  };
}

function resources(raw: unknown): ResourceSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (!row["gpu_vram"] && !row["ram"] && !row["storage"]) return null;
  return {
    gpu_vram: measurement(row["gpu_vram"]),
    ram: measurement(row["ram"]),
    storage: measurement(row["storage"]),
  };
}

function reasons(raw: unknown): ModelBlockingReason[] {
  if (!Array.isArray(raw)) return [];
  const mapped = raw.map((entry) => (isBlockingReason(entry) ? entry : "unknown"));
  return [...new Set(mapped)];
}

/**
 * Normalises an untrusted backend payload into the frontend contract.
 * Anything unrecognised degrades safely instead of claiming success.
 */
export function normaliseStatus(
  raw: unknown,
  modelId: string,
  policy: AiRuntimePolicy = DEFAULT_AI_RUNTIME_POLICY,
): ModelPreparationStatus {
  if (!raw || typeof raw !== "object") return unavailableStatus(modelId, policy);
  const row = raw as Record<string, unknown>;
  const state = isModelPrepareState(row["state"]) ? row["state"] : null;
  if (!state) return unavailableStatus(modelId, policy, "invalid_backend_payload");

  const progress = num(row["progress_percent"]);
  const blocking = reasons(row["blocking_reasons"]);
  const canWithAi = row["can_continue_with_ai"] === true && state === "ready";

  return {
    operation_id: typeof row["operation_id"] === "string" ? row["operation_id"] : null,
    model_id: typeof row["model_id"] === "string" ? row["model_id"] : modelId,
    state,
    progress_percent: progress === null ? null : Math.min(100, Math.max(0, progress)),
    message_code: typeof row["message_code"] === "string" ? row["message_code"] : state,
    model_present_on_disk: bool(row["model_present_on_disk"]),
    model_download_in_progress: bool(row["model_download_in_progress"]),
    shared_download: bool(row["shared_download"]),
    active_user_count: num(row["active_user_count"]),
    resources: resources(row["resources"]),
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
    can_start_new_allocation: row["can_start_new_allocation"] === true,
    can_continue_with_ai: canWithAi,
    can_continue_without_ai: row["can_continue_without_ai"] !== false,
    retryable: row["retryable"] !== false,
    blocking_reasons:
      blocking.length || state === "ready"
        ? blocking
        : state === "failed" || state === "blocked"
          ? ["unknown"]
          : [],
  };
}

/** Starts or joins preparation of `modelId`. */
export async function prepareModelOnBackend(input: {
  accessToken: string;
  studentId: string;
  modelId: string;
  policy: AiRuntimePolicy;
}): Promise<ModelPreparationStatus> {
  const payload = await callBackend(MODEL_BACKEND_ENDPOINTS.prepare, {
    method: "POST",
    accessToken: input.accessToken,
    studentId: input.studentId,
    body: {
      model_id: input.modelId,
      admission_policy: {
        gpu_free_percent: input.policy.preflight_gpu_free_percent,
        ram_free_percent: input.policy.preflight_ram_free_percent,
        storage_free_percent: input.policy.preflight_storage_free_percent,
      },
      runtime_floors: {
        gpu_free_percent: input.policy.ready_gpu_free_percent,
        ram_free_percent: input.policy.ready_ram_free_percent,
        storage_free_percent: input.policy.ready_storage_free_percent,
      },
      deduplicate_downloads: input.policy.deduplicate_model_downloads,
      report_active_users: input.policy.check_active_users,
    },
  });
  if (payload === null) {
    // Backward compatibility: fall back to the older readiness probe.
    const legacy = await callBackend(
      `${MODEL_BACKEND_ENDPOINTS.status}?model_id=${encodeURIComponent(input.modelId)}`,
      { method: "GET", accessToken: input.accessToken, studentId: input.studentId },
    );
    return normaliseStatus(legacy, input.modelId, input.policy);
  }
  return normaliseStatus(payload, input.modelId, input.policy);
}

/** Polls one preparation operation. */
export async function pollModelOperationOnBackend(input: {
  accessToken: string;
  studentId: string;
  modelId: string;
  operationId: string;
  policy: AiRuntimePolicy;
}): Promise<ModelPreparationStatus> {
  const payload = await callBackend(
    `${MODEL_BACKEND_ENDPOINTS.operation}/${encodeURIComponent(input.operationId)}`,
    { method: "GET", accessToken: input.accessToken, studentId: input.studentId },
  );
  return normaliseStatus(payload, input.modelId, input.policy);
}
