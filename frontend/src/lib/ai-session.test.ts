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

const listeners: unknown[] = [];
(globalThis as Record<string, unknown>)["window"] = {
  sessionStorage: new MemoryStorage(),
  dispatchEvent: (event: unknown) => {
    listeners.push(event);
    return true;
  },
};
(globalThis as Record<string, unknown>)["CustomEvent"] = class {
  constructor(public type: string) {}
};

const { clearAiSession, markAiReady, markNonAi, modelGateRequired, readAiSession } =
  await import("./ai-session");

describe("ai session state", () => {
  beforeEach(() => clearAiSession());

  it("requires the model gate on a fresh browser session", () => {
    expect(readAiSession()).toBeNull();
    expect(modelGateRequired()).toBe(true);
  });

  it("stores an AI-ready decision with the confirmed model", () => {
    markAiReady("Qwen/Qwen3.8-27B");
    expect(readAiSession()).toMatchObject({ mode: "ai-ready", modelId: "Qwen/Qwen3.8-27B" });
    expect(modelGateRequired()).toBe(false);
  });

  it("stores a non-AI decision without a model", () => {
    markNonAi();
    expect(readAiSession()).toMatchObject({ mode: "non-ai", modelId: null });
    expect(modelGateRequired()).toBe(false);
  });

  it("clears the decision on sign-out", () => {
    markAiReady("Qwen/Qwen3.8-27B");
    clearAiSession();
    expect(readAiSession()).toBeNull();
    expect(modelGateRequired()).toBe(true);
  });
});
