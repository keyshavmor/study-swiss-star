/**
 * SERVER-ONLY adapter for the FUTURE local-backend system capability probe.
 *
 * BACKEND TODO FOR CODEX: `/api/system/capability` does not exist yet. Any 404,
 * timeout, network error or unparsable payload maps to the truthful
 * `unavailable` report — never to invented hardware values.
 *
 * The caller's already-verified Supabase bearer JWT is forwarded
 * server-to-server and is never logged, persisted or returned to the browser.
 */
import { localBackendBaseUrl, localBackendTimeoutMs } from "@/lib/local-backend-endpoints";
import {
  emptyLoadBalancing,
  emptyRecommendation,
  isCapabilityStatus,
  unavailableCapabilityReport,
  withStaleness,
  type GpuCapability,
  type LoadBalancingMode,
  type ModelFit,
  type SystemCapabilityReport,
} from "@/lib/system-capability.types";

/** FUTURE BACKEND endpoint for the hardware probe + recommendation. */
export const CAPABILITY_ENDPOINT = "/api/system/capability";

function row(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function bool(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function codes(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function fit(raw: unknown): ModelFit | null {
  const r = row(raw);
  const modelId = str(r["model_id"]);
  if (!modelId) return null;
  return {
    model_id: modelId,
    estimated_bytes: num(r["estimated_bytes"]),
    headroom_fraction: num(r["headroom_fraction"]),
    reason_code: str(r["reason_code"]) ?? "unknown",
  };
}

function gpus(raw: unknown): GpuCapability[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry, index) => {
    const r = row(entry);
    return {
      gpu_id: str(r["gpu_id"]) ?? `gpu-${index}`,
      name: str(r["name"]),
      vram_total_bytes: num(r["vram_total_bytes"]),
      vram_available_bytes: num(r["vram_available_bytes"]),
      accelerator: str(r["accelerator"]),
      unified_memory: bool(r["unified_memory"]),
    };
  });
}

const LOAD_BALANCING_VALUES = [
  "gpu_only",
  "cpu_gpu_split",
  "unified_memory",
  "cpu_only",
  "unknown",
];

function loadBalancingMode(value: unknown): LoadBalancingMode {
  return typeof value === "string" && LOAD_BALANCING_VALUES.includes(value)
    ? (value as LoadBalancingMode)
    : "unknown";
}

/** Normalises a backend payload; unknown shapes become `error`, never faked. */
export function normaliseCapabilityPayload(payload: unknown): SystemCapabilityReport {
  const r = row(payload);
  const status = r["status"];
  if (!isCapabilityStatus(status) || status === "unavailable") {
    return unavailableCapabilityReport(str(r["message_code"]) ?? "backend_unavailable");
  }

  const ram = row(r["ram"]);
  const storage = row(r["runtime_storage"]);
  const balancing = row(r["load_balancing"]);
  const recommendation = row(r["recommendation"]);
  const osValue = str(r["os"]);

  const report: SystemCapabilityReport = {
    status,
    backendConnected: true,
    os: osValue === "macOS" || osValue === "Linux" ? osValue : "unknown",
    ram: { total_bytes: num(ram["total_bytes"]), available_bytes: num(ram["available_bytes"]) },
    gpus: gpus(r["gpus"]),
    runtimeStorage: {
      total_bytes: num(storage["total_bytes"]),
      available_bytes: num(storage["available_bytes"]),
    },
    loadBalancing: {
      ...emptyLoadBalancing(),
      mode: loadBalancingMode(balancing["mode"]),
      spare_capacity: num(balancing["spare_capacity"]),
      active_model_processes: num(balancing["active_model_processes"]),
      constraint_codes: codes(balancing["constraint_codes"]),
    },
    recommendation: {
      ...emptyRecommendation(),
      recommended_model_id: str(recommendation["recommended_model_id"]),
      alternatives: Array.isArray(recommendation["alternatives"])
        ? (recommendation["alternatives"] as unknown[])
            .map(fit)
            .filter((entry): entry is ModelFit => entry !== null)
        : [],
      rationale_codes: codes(recommendation["rationale_codes"]),
      fit: fit(recommendation["fit"]),
      warning_codes: codes(recommendation["warning_codes"]),
    },
    measuredAt: str(r["measured_at"]),
    measurementSource:
      str(r["measurement_source"]) === "local_backend_cache"
        ? "local_backend_cache"
        : "local_backend_probe",
    measurementQuality:
      str(r["measurement_quality"]) === "measured"
        ? "measured"
        : str(r["measurement_quality"]) === "partial"
          ? "partial"
          : "unknown",
    messageCode: str(r["message_code"]) ?? status,
  };
  return withStaleness(report);
}

export async function probeSystemCapabilityOnBackend(input: {
  accessToken: string;
  studentId: string;
  preferredModelId: string | null;
}): Promise<SystemCapabilityReport> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), localBackendTimeoutMs());
  try {
    const response = await fetch(`${localBackendBaseUrl()}${CAPABILITY_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.accessToken}`,
        "X-Student-Id": input.studentId,
      },
      body: JSON.stringify({ preferred_model_id: input.preferredModelId }),
      signal: controller.signal,
    });
    if (!response.ok) return unavailableCapabilityReport();
    const payload = (await response.json().catch(() => null)) as unknown;
    if (payload === null) return unavailableCapabilityReport("invalid_response");
    return normaliseCapabilityPayload(payload);
  } catch {
    return unavailableCapabilityReport();
  } finally {
    clearTimeout(timer);
  }
}
