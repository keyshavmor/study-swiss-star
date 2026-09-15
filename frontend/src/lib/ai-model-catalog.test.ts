import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = { model_id: string; display_name: string; enabled: boolean; sort_order: number };
let response: { data: Row[] | null; error: unknown } = { data: null, error: null };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve(response),
        }),
      }),
    }),
  },
}));

const { fetchModelCatalog, FALLBACK_MODEL_CHOICES } = await import("./ai-model-catalog");

describe("model catalog", () => {
  beforeEach(() => {
    response = { data: null, error: null };
  });

  it("prefers the Supabase catalog", async () => {
    response = {
      data: [{ model_id: "Qwen/Qwen3.8-27B", display_name: "Qwen 27B", enabled: true, sort_order: 1 }],
      error: null,
    };
    const result = await fetchModelCatalog();
    expect(result.usedFallback).toBe(false);
    expect(result.choices).toEqual([{ modelId: "Qwen/Qwen3.8-27B", displayName: "Qwen 27B" }]);
  });

  it("falls back to the local model list when the catalog cannot be read", async () => {
    response = { data: null, error: { message: "denied" } };
    const result = await fetchModelCatalog();
    expect(result.usedFallback).toBe(true);
    expect(result.choices).toEqual(FALLBACK_MODEL_CHOICES);
  });

  it("falls back when the catalog is empty", async () => {
    response = { data: [], error: null };
    const result = await fetchModelCatalog();
    expect(result.usedFallback).toBe(true);
    expect(result.choices.length).toBeGreaterThan(0);
  });
});
