import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));

const {
  QUOTA_LIMIT_BYTES,
  QUOTA_WARNING_BYTES,
  canAllocateBytes,
  fetchMyQuotaStatus,
  isQuotaExceededError,
  normaliseQuotaStatus,
  preflightQuota,
  quotaPercent,
} = await import("./user-quota");

function payload(totalBytes: number) {
  const remaining = Math.max(0, QUOTA_LIMIT_BYTES - totalBytes);
  return {
    database_bytes: Math.floor(totalBytes / 2),
    storage_bytes: Math.ceil(totalBytes / 2),
    total_bytes: totalBytes,
    limit_bytes: QUOTA_LIMIT_BYTES,
    warning_threshold_bytes: QUOTA_WARNING_BYTES,
    remaining_bytes: remaining,
    usage_fraction: totalBytes / QUOTA_LIMIT_BYTES,
    warning: totalBytes >= QUOTA_WARNING_BYTES,
    at_limit: remaining <= 0,
  };
}

describe("per-user combined 50 MB quota", () => {
  beforeEach(() => rpc.mockReset());

  it("exposes the exact live limit and 90% warning threshold", () => {
    expect(QUOTA_LIMIT_BYTES).toBe(52_428_800);
    expect(QUOTA_WARNING_BYTES).toBe(47_185_920);
  });

  it("does not warn at 89.9%", () => {
    const bytes = Math.floor(QUOTA_LIMIT_BYTES * 0.899);
    const status = normaliseQuotaStatus(payload(bytes));
    expect(status.warning).toBe(false);
    expect(status.atLimit).toBe(false);
    expect(quotaPercent(status)).toBeLessThan(90);
  });

  it("warns at exactly 90%", () => {
    const status = normaliseQuotaStatus(payload(QUOTA_WARNING_BYTES));
    expect(status.warning).toBe(true);
    expect(status.atLimit).toBe(false);
    expect(quotaPercent(status)).toBe(90);
  });

  it("reports at-limit at 100% with no remaining allowance", () => {
    const status = normaliseQuotaStatus(payload(QUOTA_LIMIT_BYTES));
    expect(status.atLimit).toBe(true);
    expect(status.remainingBytes).toBe(0);
    expect(status.usageFraction).toBe(1);
  });

  it("derives missing fields instead of inventing usage", () => {
    const status = normaliseQuotaStatus({ database_bytes: 1000, storage_bytes: 2000 });
    expect(status.totalBytes).toBe(3000);
    expect(status.limitBytes).toBe(QUOTA_LIMIT_BYTES);
    expect(status.remainingBytes).toBe(QUOTA_LIMIT_BYTES - 3000);
    expect(status.warning).toBe(false);
  });

  it("reads live usage through get_my_quota_status", async () => {
    rpc.mockResolvedValue({ data: payload(1024), error: null });
    const status = await fetchMyQuotaStatus();
    expect(rpc).toHaveBeenCalledWith("get_my_quota_status");
    expect(status.totalBytes).toBe(1024);
  });

  it("preflights a planned write through can_allocate_my_quota", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await expect(canAllocateBytes(1500.6)).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith("can_allocate_my_quota", { p_additional_bytes: 1501 });

    rpc.mockResolvedValue({ data: false, error: null });
    await expect(preflightQuota(10_000)).resolves.toBe("quota_exceeded");
  });

  it("never blocks the attempt when the preflight itself fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "network" } });
    await expect(preflightQuota(10_000)).resolves.toBe("check_unavailable");
  });

  it("maps the server quota rejection to the quota outcome", () => {
    expect(isQuotaExceededError({ message: "user_data_quota_exceeded: limit reached" })).toBe(true);
    expect(isQuotaExceededError({ code: "USER_DATA_QUOTA_EXCEEDED" })).toBe(true);
    expect(isQuotaExceededError({ message: "new row violates row-level security" })).toBe(false);
    expect(isQuotaExceededError(null)).toBe(false);
  });
});
