import { describe, expect, it } from "vitest";
import {
  SAFETY_VERDICTS,
  isAllowed,
  isSafetyVerdict,
  safetyUnavailable,
  toneForVerdict,
} from "./safety.types";

describe("safety verdict contract", () => {
  it("defines exactly the documented verdicts", () => {
    expect([...SAFETY_VERDICTS]).toEqual([
      "allow",
      "block_warning",
      "block_suspend_pending_review",
      "safety_unavailable",
      "scanning",
    ]);
    expect(isSafetyVerdict("allow")).toBe(true);
    expect(isSafetyVerdict("blocked")).toBe(false);
  });

  it("fails closed when the safety backend is unavailable", () => {
    const decision = safetyUnavailable();
    expect(decision.verdict).toBe("safety_unavailable");
    expect(isAllowed(decision)).toBe(false);
    expect(decision.category_code).toBeNull();
    expect(decision.strike_number).toBeNull();
    expect(decision.guardian_review_queued).toBeNull();
    expect(decision.account_suspended_pending_review).toBeNull();
    expect(decision.retryable).toBe(true);
  });

  it("maps the first strike to a warning surface and the second to a danger surface", () => {
    expect(toneForVerdict("block_warning")).toBe("warning");
    expect(toneForVerdict("block_suspend_pending_review")).toBe("danger");
    expect(toneForVerdict("allow")).toBe("success");
    expect(toneForVerdict("safety_unavailable")).toBe("warning");
  });
});
