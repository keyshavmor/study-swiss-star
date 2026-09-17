/** Session-scoped language decision state. */
import { beforeEach, describe, expect, it } from "vitest";

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

(globalThis as Record<string, unknown>)["window"] = {
  sessionStorage: new MemoryStorage(),
  dispatchEvent: () => true,
};
(globalThis as Record<string, unknown>)["CustomEvent"] = class {
  constructor(public type: string) {}
};

const {
  clearLanguageSession,
  languageDecisionRequired,
  markLanguageSelected,
  markLanguageSkipped,
  readLanguageSession,
} = await import("./language-session");

describe("language session decision", () => {
  beforeEach(() => clearLanguageSession());

  it("requires a decision on a fresh authenticated session", () => {
    expect(readLanguageSession()).toBeNull();
    expect(languageDecisionRequired()).toBe(true);
  });

  it("records a selected language", () => {
    markLanguageSelected("gsw");
    expect(readLanguageSession()).toMatchObject({ decision: "selected", languageCode: "gsw" });
    expect(languageDecisionRequired()).toBe(false);
  });

  it("records an explicit skip that keeps the persisted default", () => {
    markLanguageSkipped("de");
    expect(readLanguageSession()).toMatchObject({ decision: "skipped", languageCode: "de" });
    expect(languageDecisionRequired()).toBe(false);
  });

  it("treats a cleared session as undecided again", () => {
    markLanguageSelected("en");
    clearLanguageSession();
    expect(languageDecisionRequired()).toBe(true);
  });
});
