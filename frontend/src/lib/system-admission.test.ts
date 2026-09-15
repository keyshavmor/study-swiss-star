import { beforeEach, describe, expect, it } from "vitest";
import {
  AI_READY_FREE_FLOORS,
  DEFAULT_SYSTEM_ADMISSION_POLICY,
  admissionUnavailable,
  effectiveUtilisationCaps,
  isAdmissionState,
  isAdmitted,
  unavailableLocalHealth,
} from "./system-admission.types";

describe("system admission policy", () => {
  it("mirrors the current production values", () => {
    expect(DEFAULT_SYSTEM_ADMISSION_POLICY).toMatchObject({
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
    });
  });

  it("keeps the earlier AI-ready free floors at 30/25/30", () => {
    expect(AI_READY_FREE_FLOORS).toEqual({
      gpu_free_percent: 30,
      ram_free_percent: 25,
      storage_free_percent: 30,
    });
  });

  it("never weakens the older floors when applying the 75% ceiling", () => {
    expect(effectiveUtilisationCaps()).toEqual({
      gpu_used_percent: 70,
      ram_used_percent: 75,
      storage_used_percent: 70,
    });
  });

  it("uses the stricter of ceiling and floor when the policy is loosened", () => {
    const caps = effectiveUtilisationCaps({
      ...DEFAULT_SYSTEM_ADMISSION_POLICY,
      max_gpu_used_percent: 95,
      max_ram_used_percent: 95,
      max_storage_used_percent: 95,
    });
    expect(caps).toEqual({ gpu_used_percent: 70, ram_used_percent: 75, storage_used_percent: 70 });
  });
});

describe("admission status", () => {
  it("recognises every documented state", () => {
    for (const state of [
      "checking",
      "admitted",
      "queued",
      "denied_capacity",
      "denied_user_limit",
      "backend_unavailable",
    ]) {
      expect(isAdmissionState(state)).toBe(true);
    }
    expect(isAdmissionState("ready")).toBe(false);
  });

  it("fails closed when the backend is unavailable", () => {
    const status = admissionUnavailable();
    expect(status.state).toBe("backend_unavailable");
    expect(status.lease).toBeNull();
    expect(isAdmitted(status)).toBe(false);
    expect(status.can_continue_without_ai).toBe(false);
    expect(status.max_active_users).toBe(10);
    expect(status.retryable).toBe(true);
  });

  it("never counts an admitted state without a lease as admitted", () => {
    const status = { ...admissionUnavailable(), state: "admitted" as const };
    expect(isAdmitted(status)).toBe(false);
  });

  it("reports unavailable local health without inventing measurements", () => {
    const health = unavailableLocalHealth();
    expect(health.available).toBe(false);
    expect(health.gpus).toEqual([]);
    expect(health.ram).toBeNull();
    expect(health.disk).toBeNull();
    expect(health.active_user_count).toBeNull();
    expect(health.max_active_users).toBe(10);
  });
});

describe("admission session lease", () => {
  beforeEach(async () => {
    const { clearAdmissionSession } = await import("./admission-session");
    clearAdmissionSession();
  });

  it("requires the gate until a lease is stored and again after sign-out", async () => {
    const { admissionGateRequired, markAdmitted, clearAdmissionSession, readAdmissionSession } =
      await import("./admission-session");
    expect(admissionGateRequired()).toBe(true);
    markAdmitted({ lease_id: "lease-1", expires_at: null, heartbeat_interval_seconds: 30 });
    expect(admissionGateRequired()).toBe(false);
    expect(readAdmissionSession()?.leaseId).toBe("lease-1");
    clearAdmissionSession();
    expect(admissionGateRequired()).toBe(true);
  });

  it("treats an expired lease as no admission", async () => {
    const { admissionGateRequired, markAdmitted } = await import("./admission-session");
    markAdmitted({
      lease_id: "lease-2",
      expires_at: new Date(Date.now() - 1000).toISOString(),
      heartbeat_interval_seconds: null,
    });
    expect(admissionGateRequired()).toBe(true);
  });
});
