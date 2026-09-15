import { describe, expect, it, vi } from "vitest";

const invoked: { name: string; body: Record<string, unknown> }[] = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (name: string) => {
      if (name === "get_user_visible_supabase_health") {
        return Promise.resolve({
          data: [
            {
              object_storage_used_bytes: 900_000_000,
              object_storage_quota_bytes: 1_073_741_824,
              object_storage_remaining_bytes: 173_741_824,
              object_storage_used_percent: 83.8,
              object_storage_cleanup_trigger_percent: 90,
              object_storage_cleanup_target_percent: 80,
              database_used_bytes: 45_000_000,
              database_quota_bytes: null,
              database_used_percent: null,
              bandwidth_status: "not_exposed_by_sql",
              realtime_status: "not_exposed_by_sql",
              edge_functions_status: "not_exposed_by_sql",
            },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: [{ ai_thread_count: 3 }], error: null });
    },
    functions: {
      invoke: (name: string, options: { body: Record<string, unknown> }) => {
        invoked.push({ name, body: options.body });
        return Promise.resolve({ data: { deleted_rows: 4, account_deleted: false }, error: null });
      },
    },
  },
}));

const { fetchSupabaseHealth, fetchMyDataSummary, isNotExposed, requestMyDataDeletion } =
  await import("./system-health");

describe("supabase health", () => {
  it("marks metrics SQL cannot expose instead of fabricating them", async () => {
    const health = await fetchSupabaseHealth();
    expect(health).not.toBeNull();
    expect(isNotExposed(health!.database_quota_bytes)).toBe(true);
    expect(isNotExposed(health!.database_used_percent)).toBe(true);
    expect(isNotExposed(0, health!.bandwidth_status)).toBe(true);
    expect(isNotExposed(0, health!.realtime_status)).toBe(true);
    expect(isNotExposed(0, health!.edge_functions_status)).toBe(true);
    // Real values stay real.
    expect(isNotExposed(health!.object_storage_used_percent)).toBe(false);
    expect(health!.object_storage_cleanup_trigger_percent).toBe(90);
    expect(health!.object_storage_cleanup_target_percent).toBe(80);
  });

  it("reads only the caller's own data summary", async () => {
    await expect(fetchMyDataSummary()).resolves.toMatchObject({ ai_thread_count: 3 });
  });
});

describe("data deletion requests", () => {
  it("never sends a target user id", async () => {
    invoked.length = 0;
    await requestMyDataDeletion({
      mode: "range",
      startAt: "2026-01-01T00:00:00.000Z",
      endAt: "2026-02-01T00:00:00.000Z",
      includePeer: true,
      includeAi: false,
    });
    await requestMyDataDeletion({ mode: "all_content" });
    await requestMyDataDeletion({ mode: "delete_account" });

    expect(invoked.map((call) => call.name)).toEqual([
      "delete-my-data",
      "delete-my-data",
      "delete-my-data",
    ]);
    for (const call of invoked) {
      const keys = Object.keys(call.body);
      expect(keys).not.toContain("user_id");
      expect(keys).not.toContain("target_user_id");
      expect(keys).not.toContain("userId");
    }
    expect(invoked[0]!.body).toMatchObject({
      mode: "range",
      include_peer: true,
      include_ai: false,
    });
    expect(Object.keys(invoked[1]!.body)).toEqual(["mode"]);
    expect(invoked[2]!.body).toEqual({ mode: "delete_account" });
  });
});
