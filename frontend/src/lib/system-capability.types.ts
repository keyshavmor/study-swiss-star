/**
 * LOCAL SYSTEM CAPABILITY REPORT + MODEL RECOMMENDATION — typed contract.
 *
 * CURRENT FRONTEND: types, adapter, UI and truthful unavailable state.
 * FUTURE BACKEND / CODEX: the local Python backend measures the host
 * (Linux/macOS) and produces this report. It is the ONLY authority for GPU
 * VRAM, CPU RAM, free disk and load-balancing capacity.
 *
 * ACCURACY RULE: a browser cannot determine GPU VRAM, total physical RAM or
 * local free disk. The frontend therefore never derives these values from
 * `navigator.deviceMemory`, `navigator.hardwareConcurrency` or the browser
 * storage-quota API — nullable fields stay null until the backend reports them.
 */

export const CAPABILITY_STATUSES = ["pending", "ready", "unavailable", "stale", "error"] as const;
export type CapabilityStatus = (typeof CAPABILITY_STATUSES)[number];

export type HostOs = "macOS" | "Linux" | "unknown";

/** How the values were obtained; `none` means nothing was measured. */
export const MEASUREMENT_SOURCES = ["local_backend_probe", "local_backend_cache", "none"] as const;
export type MeasurementSource = (typeof MEASUREMENT_SOURCES)[number];

export type MeasurementQuality = "measured" | "partial" | "unknown";

export interface ByteAmount {
  total_bytes: number | null;
  available_bytes: number | null;
}

export interface GpuCapability {
  gpu_id: string;
  name: string | null;
  vram_total_bytes: number | null;
  vram_available_bytes: number | null;
  /** e.g. "cuda", "rocm", "metal", "cpu" — backend vocabulary, never guessed. */
  accelerator: string | null;
  unified_memory: boolean | null;
}

/** Automatic load-balancing capacity as reported by the backend. */
export const LOAD_BALANCING_MODES = [
  "gpu_only",
  "cpu_gpu_split",
  "unified_memory",
  "cpu_only",
  "unknown",
] as const;
export type LoadBalancingMode = (typeof LOAD_BALANCING_MODES)[number];

export interface LoadBalancingState {
  mode: LoadBalancingMode;
  /** How many additional model processes the host can take, if known. */
  spare_capacity: number | null;
  active_model_processes: number | null;
  /** Machine-readable constraint codes, never free text. */
  constraint_codes: string[];
}

export interface ModelFit {
  model_id: string;
  /** Estimated resident size of the model, if the backend knows it. */
  estimated_bytes: number | null;
  /** Estimated free headroom after loading, 0..1, null when unknown. */
  headroom_fraction: number | null;
  /** Machine-readable reason code the UI localizes. */
  reason_code: string;
}

export interface ModelRecommendation {
  recommended_model_id: string | null;
  alternatives: ModelFit[];
  /** Machine-readable rationale codes, localized in the UI. */
  rationale_codes: string[];
  fit: ModelFit | null;
  warning_codes: string[];
}

export interface SystemCapabilityReport {
  status: CapabilityStatus;
  /** False whenever no local backend answered — the UI must say so plainly. */
  backendConnected: boolean;
  os: HostOs;
  ram: ByteAmount;
  gpus: GpuCapability[];
  /** Storage available to the model runtime, not the browser. */
  runtimeStorage: ByteAmount;
  loadBalancing: LoadBalancingState;
  recommendation: ModelRecommendation;
  measuredAt: string | null;
  measurementSource: MeasurementSource;
  measurementQuality: MeasurementQuality;
  /** Stable code the UI localizes (`backend_unavailable`, `probe_failed`, …). */
  messageCode: string;
}

/** Age after which a cached report is presented as `stale`. */
export const CAPABILITY_STALE_AFTER_MS = 10 * 60 * 1000;

export function emptyLoadBalancing(): LoadBalancingState {
  return {
    mode: "unknown",
    spare_capacity: null,
    active_model_processes: null,
    constraint_codes: [],
  };
}

export function emptyRecommendation(): ModelRecommendation {
  return {
    recommended_model_id: null,
    alternatives: [],
    rationale_codes: [],
    fit: null,
    warning_codes: [],
  };
}

/** The truthful "nothing was measured" report. Never fabricates values. */
export function unavailableCapabilityReport(
  messageCode = "backend_unavailable",
): SystemCapabilityReport {
  return {
    status: "unavailable",
    backendConnected: false,
    os: "unknown",
    ram: { total_bytes: null, available_bytes: null },
    gpus: [],
    runtimeStorage: { total_bytes: null, available_bytes: null },
    loadBalancing: emptyLoadBalancing(),
    recommendation: emptyRecommendation(),
    measuredAt: null,
    measurementSource: "none",
    measurementQuality: "unknown",
    messageCode,
  };
}

/** A `ready` report older than the staleness window is presented as stale. */
export function withStaleness(
  report: SystemCapabilityReport,
  now = Date.now(),
): SystemCapabilityReport {
  if (report.status !== "ready" || !report.measuredAt) return report;
  const measured = Date.parse(report.measuredAt);
  if (Number.isNaN(measured)) return report;
  if (now - measured <= CAPABILITY_STALE_AFTER_MS) return report;
  return { ...report, status: "stale", messageCode: "report_stale" };
}

export function isCapabilityStatus(value: unknown): value is CapabilityStatus {
  return typeof value === "string" && (CAPABILITY_STATUSES as readonly string[]).includes(value);
}
