/** Feedback is all-or-nothing: a partial 2xx must never read as full success. */
import { describe, expect, it } from "vitest";
import { classifyFeedbackResult } from "./feedback-submit";

describe("classifyFeedbackResult", () => {
  it("reports full success only when every leg was recorded", () => {
    expect(
      classifyFeedbackResult({ ok: true, database_recorded: true, storage_recorded: true }, null),
    ).toEqual({ kind: "full" });
  });

  it("treats a 207-style partial result as partial, not success", () => {
    expect(
      classifyFeedbackResult({ ok: false, database_recorded: true, storage_recorded: false }, null),
    ).toEqual({ kind: "partial" });
    expect(
      classifyFeedbackResult({ ok: true, database_recorded: true, storage_recorded: false }, null),
    ).toEqual({ kind: "partial" });
    expect(classifyFeedbackResult({ ok: true, database_recorded: true }, null)).toEqual({
      kind: "partial",
    });
  });

  it("treats a thrown function error or an empty body as a failure", () => {
    expect(classifyFeedbackResult(null, new Error("boom"))).toEqual({ kind: "failed" });
    expect(classifyFeedbackResult(undefined, null)).toEqual({ kind: "failed" });
    expect(
      classifyFeedbackResult(
        { ok: false, database_recorded: false, storage_recorded: false },
        null,
      ),
    ).toEqual({ kind: "failed" });
  });
});
