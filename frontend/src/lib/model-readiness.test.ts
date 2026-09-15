import { describe, expect, it } from "vitest";
import {
  DEFAULT_AI_RUNTIME_POLICY,
  isAiReady,
  isBlockingReason,
  isModelPrepareState,
  isTerminalState,
  toneForStatus,
  unavailableStatus,
  type ModelPreparationStatus,
} from "./model-readiness.types";

const base = (patch: Partial<ModelPreparationStatus>): ModelPreparationStatus => ({
  ...unavailableStatus("Qwen/Qwen3.8-27B", DEFAULT_AI_RUNTIME_POLICY, "backend_unavailable"),
  ...patch,
});

describe("runtime policy defaults", () => {
  it("uses 50/50/50 admission thresholds and 30/25/30 runtime floors", () => {
    expect(DEFAULT_AI_RUNTIME_POLICY.preflight_gpu_free_percent).toBe(50);
    expect(DEFAULT_AI_RUNTIME_POLICY.preflight_ram_free_percent).toBe(50);
    expect(DEFAULT_AI_RUNTIME_POLICY.preflight_storage_free_percent).toBe(50);
    expect(DEFAULT_AI_RUNTIME_POLICY.ready_gpu_free_percent).toBe(30);
    expect(DEFAULT_AI_RUNTIME_POLICY.ready_ram_free_percent).toBe(25);
    expect(DEFAULT_AI_RUNTIME_POLICY.ready_storage_free_percent).toBe(30);
  });
});

describe("state guards", () => {
  it("accepts only known states and reasons", () => {
    expect(isModelPrepareState("downloading")).toBe(true);
    expect(isModelPrepareState("totally-fine")).toBe(false);
    expect(isBlockingReason("insufficient_gpu_vram")).toBe(true);
    expect(isBlockingReason("vibes")).toBe(false);
  });

  it("treats only settled outcomes as terminal", () => {
    expect(isTerminalState("ready")).toBe(true);
    expect(isTerminalState("failed")).toBe(true);
    expect(isTerminalState("blocked")).toBe(true);
    expect(isTerminalState("backend_unavailable")).toBe(true);
    expect(isTerminalState("downloading")).toBe(false);
  });
});

describe("AI readiness can never be faked by the frontend", () => {
  it("is ready only when the backend says ready and allows AI", () => {
    expect(isAiReady(base({ state: "ready", can_continue_with_ai: true }))).toBe(true);
    expect(isAiReady(base({ state: "ready", can_continue_with_ai: false }))).toBe(false);
    expect(isAiReady(base({ state: "downloaded", can_continue_with_ai: true }))).toBe(false);
    expect(isAiReady(base({ state: "backend_unavailable", can_continue_with_ai: true }))).toBe(
      false,
    );
  });

  it("maps an unavailable backend to a red, non-AI-ready status that still allows continuing", () => {
    const status = unavailableStatus("model-x", DEFAULT_AI_RUNTIME_POLICY, "backend_unavailable");
    expect(status.state).toBe("backend_unavailable");
    expect(status.can_continue_with_ai).toBe(false);
    expect(status.can_continue_without_ai).toBe(true);
    expect(status.blocking_reasons).toContain("backend_unavailable");
    expect(toneForStatus(status)).toBe("danger");
    expect(isAiReady(status)).toBe(false);
  });

  it("uses semantic tones for progress and success", () => {
    expect(toneForStatus(base({ state: "ready", can_continue_with_ai: true }))).toBe("success");
    expect(toneForStatus(base({ state: "queued" }))).toBe("warning");
    expect(toneForStatus(base({ state: "failed" }))).toBe("danger");
  });
});
