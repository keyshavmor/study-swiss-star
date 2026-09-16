import { describe, expect, it } from "vitest";
import {
  CAPABILITY_STALE_AFTER_MS,
  unavailableCapabilityReport,
  withStaleness,
} from "./system-capability.types";
import { normaliseCapabilityPayload } from "./system-capability.server";

const READY = {
  status: "ready",
  os: "Linux",
  ram: { total_bytes: 68_719_476_736, available_bytes: 34_359_738_368 },
  gpus: [
    {
      gpu_id: "gpu-0",
      name: "NVIDIA RTX 4090",
      vram_total_bytes: 25_769_803_776,
      vram_available_bytes: 21_474_836_480,
      accelerator: "cuda",
      unified_memory: false,
    },
  ],
  runtime_storage: { total_bytes: 2_000_000_000_000, available_bytes: 900_000_000_000 },
  load_balancing: {
    mode: "cpu_gpu_split",
    spare_capacity: 2,
    active_model_processes: 1,
    constraint_codes: ["single_gpu"],
  },
  recommendation: {
    recommended_model_id: "Qwen/Qwen3.8-27B",
    alternatives: [{ model_id: "Qwen/Qwen3-14B", reason_code: "lighter_option" }],
    rationale_codes: ["fits_gpu_vram"],
    fit: { model_id: "Qwen/Qwen3.8-27B", headroom_fraction: 0.25, reason_code: "fits_gpu_vram" },
    warning_codes: [],
  },
  measured_at: new Date().toISOString(),
  measurement_source: "local_backend_probe",
  measurement_quality: "measured",
  message_code: "ready",
};

describe("local system capability report", () => {
  it("never fabricates hardware values when no backend answered", () => {
    const report = unavailableCapabilityReport();
    expect(report.status).toBe("unavailable");
    expect(report.backendConnected).toBe(false);
    expect(report.ram.total_bytes).toBeNull();
    expect(report.gpus).toEqual([]);
    expect(report.runtimeStorage.available_bytes).toBeNull();
    expect(report.recommendation.recommended_model_id).toBeNull();
    expect(report.measuredAt).toBeNull();
    expect(report.measurementSource).toBe("none");
    expect(report.messageCode).toBe("backend_unavailable");
  });

  it("normalises a ready report with recommendation and load balancing", () => {
    const report = normaliseCapabilityPayload(READY);
    expect(report.status).toBe("ready");
    expect(report.backendConnected).toBe(true);
    expect(report.os).toBe("Linux");
    expect(report.gpus[0]?.accelerator).toBe("cuda");
    expect(report.loadBalancing.mode).toBe("cpu_gpu_split");
    expect(report.loadBalancing.spare_capacity).toBe(2);
    expect(report.recommendation.recommended_model_id).toBe("Qwen/Qwen3.8-27B");
    expect(report.recommendation.alternatives).toHaveLength(1);
    expect(report.recommendation.rationale_codes).toContain("fits_gpu_vram");
  });

  it("marks an old ready report as stale", () => {
    const report = normaliseCapabilityPayload({
      ...READY,
      measured_at: new Date(Date.now() - CAPABILITY_STALE_AFTER_MS - 1000).toISOString(),
    });
    expect(report.status).toBe("stale");
    expect(report.messageCode).toBe("report_stale");
  });

  it("keeps a fresh report ready", () => {
    const fresh = normaliseCapabilityPayload(READY);
    expect(withStaleness(fresh).status).toBe("ready");
  });

  it("treats an unknown payload shape as unavailable, not as a scan", () => {
    expect(normaliseCapabilityPayload({ hello: "world" }).status).toBe("unavailable");
    expect(normaliseCapabilityPayload(null).backendConnected).toBe(false);
    expect(normaliseCapabilityPayload({ status: "unavailable" }).messageCode).toBe(
      "backend_unavailable",
    );
  });
});
