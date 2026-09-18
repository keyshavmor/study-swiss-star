import { describe, expect, it, vi } from "vitest";

const invoked: { name: string; body: Record<string, unknown> }[] = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (name: string) => {
      if (name === "get_user_visible_supabase_health") {
        // CURRENT SUPABASE (verified 2026-09-15): ONE nested JSON object.
        return Promise.resolve({
          data: {
            object_storage: {
              used_bytes: 900_000_000,
              quota_bytes: 1_073_741_824,
              remaining_bytes: 173_741_824,
              used_percent: 83.8,
              cleanup_trigger_used_percent: 90,
              cleanup_target_used_percent: 80,
            },
            database: { used_bytes: 45_000_000 },
            bandwidth: { status: "not_exposed_by_sql" },
            realtime: { status: "not_exposed_by_sql" },
            edge_functions: { status: "not_exposed_by_sql" },
          },
          error: null,
        });
      }
      return Promise.resolve({
        data: {
          peer_messages: 12,
          peer_attachments: 2,
          peer_attachment_bytes: 40_000,
          assistant_messages: 31,
          assistant_attachments: 0,
          assistant_attachment_bytes: 0,
          study_chat_messages: 7,
          documents: 3,
          document_bytes: 900_000,
          planner_events: 5,
          feedback_items: 1,
        },
        error: null,
      });
    },
    functions: {
      invoke: (name: string, options: { body: Record<string, unknown> }) => {
        invoked.push({ name, body: options.body });
        return Promise.resolve({ data: { deleted_rows: 4, account_deleted: false }, error: null });
      },
    },
  },
}));

const {
  fetchSupabaseHealth,
  fetchMyDataSummary,
  isNotExposed,
  metricValue,
  requestMyDataDeletion,
} = await import("./system-health");

describe("supabase health", () => {
  it("reads the live nested JSON groups", async () => {
    const health = await fetchSupabaseHealth();
    expect(health).not.toBeNull();
    expect(health!.object_storage?.used_bytes).toBe(900_000_000);
    expect(health!.object_storage?.used_percent).toBe(83.8);
    expect(health!.object_storage?.cleanup_trigger_used_percent).toBe(90);
    expect(health!.object_storage?.cleanup_target_used_percent).toBe(80);
    expect(health!.database?.used_bytes).toBe(45_000_000);
  });

  it("never turns a missing key into zero", async () => {
    const health = await fetchSupabaseHealth();
    // `database.quota_bytes` / `used_percent` are absent from the live payload.
    expect(metricValue(health!.database?.quota_bytes)).toBeNull();
    expect(metricValue(health!.database?.used_percent)).toBeNull();
    expect(isNotExposed(metricValue(health!.database?.quota_bytes))).toBe(true);
    expect(isNotExposed(0, health!.bandwidth?.status)).toBe(true);
    expect(isNotExposed(0, health!.realtime?.status)).toBe(true);
    expect(isNotExposed(0, health!.edge_functions?.status)).toBe(true);
    // A real zero stays a real zero, not "not exposed".
    expect(metricValue(0)).toBe(0);
  });

  it("reads the caller's own data summary with the live key names", async () => {
    const summary = await fetchMyDataSummary();
    expect(summary).toMatchObject({
      peer_messages: 12,
      peer_attachments: 2,
      peer_attachment_bytes: 40_000,
      assistant_messages: 31,
      study_chat_messages: 7,
      documents: 3,
      document_bytes: 900_000,
      planner_events: 5,
      feedback_items: 1,
    });
    // Legacy names must be gone.
    expect(summary).not.toHaveProperty("ai_thread_count");
    expect(summary).not.toHaveProperty("attachment_count");
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
