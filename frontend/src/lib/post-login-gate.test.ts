/**
 * Acceptance tests for the post-login gate:
 * auth → language decision (select or skip) → model decision → app.
 *
 * Uses the REAL session modules on top of a memory sessionStorage so refresh /
 * sign-out semantics are exercised end to end.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

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

const store = new MemoryStorage();
(globalThis as Record<string, unknown>)["window"] = {
  sessionStorage: store,
  dispatchEvent: () => true,
};
(globalThis as Record<string, unknown>)["CustomEvent"] = class {
  constructor(public type: string) {}
};

const savePreferences = vi.fn(async (_patch: Record<string, unknown>) => ({}));

vi.mock("@/lib/account-data", () => ({
  fetchPreferences: () =>
    Promise.resolve({
      app_language: "de",
      language_onboarding_completed: false,
      selected_qwen_model: "Qwen/Qwen3.8-27B",
    }),
  savePreferences,
}));
vi.mock("@/lib/compliance", () => ({
  fetchAccountCompliance: () =>
    Promise.resolve({ complianceOnboardingCompleted: true, accountStatus: "active" }),
}));
vi.mock("@/lib/admission-session", () => ({
  admissionGateRequired: () => true,
}));

const {
  HOME_PATH,
  LANGUAGE_ONBOARDING_PATH,
  MODEL_ONBOARDING_PATH,
  invalidateStartupCache,
  resolveStartupDestination,
  startupRedirectFor,
} = await import("./startup-flow");
const { clearLanguageSession, markLanguageSelected, markLanguageSkipped } =
  await import("./language-session");
const { clearAiSession, markAiReady, markNonAi } = await import("./ai-session");

function freshSignIn() {
  clearLanguageSession();
  clearAiSession();
  invalidateStartupCache();
}

describe("post-login language → model gate", () => {
  beforeEach(() => {
    freshSignIn();
    savePreferences.mockClear();
  });

  it("routes a fresh authenticated session to the language screen", async () => {
    await expect(resolveStartupDestination()).resolves.toBe(LANGUAGE_ONBOARDING_PATH);
  });

  it("routes to the model screen once a language is chosen", async () => {
    markLanguageSelected("fr");
    await expect(resolveStartupDestination()).resolves.toBe(MODEL_ONBOARDING_PATH);
  });

  it("routes to the model screen when language selection is skipped", async () => {
    markLanguageSkipped("de");
    await expect(resolveStartupDestination()).resolves.toBe(MODEL_ONBOARDING_PATH);
  });

  it("cannot reach home or other product routes before both decisions", async () => {
    await expect(startupRedirectFor("/home")).resolves.toBe(LANGUAGE_ONBOARDING_PATH);
    await expect(startupRedirectFor("/planner")).resolves.toBe(LANGUAGE_ONBOARDING_PATH);
    markLanguageSelected("de");
    await expect(startupRedirectFor("/home")).resolves.toBe(MODEL_ONBOARDING_PATH);
    await expect(startupRedirectFor("/school/biology")).resolves.toBe(MODEL_ONBOARDING_PATH);
  });

  it("allows the app after a backend-confirmed ready model", async () => {
    markLanguageSelected("de");
    markAiReady("Qwen/Qwen3.8-27B");
    await expect(resolveStartupDestination()).resolves.toBe(HOME_PATH);
    await expect(startupRedirectFor("/home")).resolves.toBeNull();
  });

  it("allows the app after an explicit continue-without-AI decision", async () => {
    markLanguageSkipped(null);
    // Backend unavailable / failed: no ready confirmation exists.
    await expect(resolveStartupDestination()).resolves.toBe(MODEL_ONBOARDING_PATH);
    markNonAi();
    await expect(resolveStartupDestination()).resolves.toBe(HOME_PATH);
    await expect(startupRedirectFor("/messages")).resolves.toBeNull();
  });

  it("keeps both decisions across a refresh in the same session", async () => {
    markLanguageSelected("it");
    markNonAi();
    // A refresh only drops in-memory caches; sessionStorage survives.
    invalidateStartupCache();
    await expect(resolveStartupDestination()).resolves.toBe(HOME_PATH);
  });

  it("requires both decisions again after sign-out", async () => {
    markLanguageSelected("it");
    markAiReady("Qwen/Qwen3.8-27B");
    await expect(resolveStartupDestination()).resolves.toBe(HOME_PATH);
    // Sign-out clears both session gates.
    clearLanguageSession();
    clearAiSession();
    invalidateStartupCache();
    await expect(resolveStartupDestination()).resolves.toBe(LANGUAGE_ONBOARDING_PATH);
  });

  it("keeps onboarding, auth, legal and account routes reachable", async () => {
    await expect(startupRedirectFor(LANGUAGE_ONBOARDING_PATH)).resolves.toBeNull();
    // The model screen is only reachable once the language decision exists.
    markLanguageSelected("de");
    await expect(startupRedirectFor(MODEL_ONBOARDING_PATH)).resolves.toBeNull();
    await expect(startupRedirectFor("/legal/privacy")).resolves.toBeNull();
    await expect(startupRedirectFor("/account/suspended")).resolves.toBeNull();
  });

  it("never treats a persisted model preference as readiness", async () => {
    markLanguageSelected("de");
    // Persisting a preferred model is a Supabase write only.
    await savePreferences({ selected_qwen_model: "Qwen/Qwen3.8-27B" });
    expect(savePreferences).toHaveBeenCalled();
    await expect(resolveStartupDestination()).resolves.toBe(MODEL_ONBOARDING_PATH);
    // Only an explicit backend ready confirmation unlocks the app with AI.
    markAiReady("Qwen/Qwen3.8-27B");
    await expect(resolveStartupDestination()).resolves.toBe(HOME_PATH);
  });

  it("cannot bypass the language decision by opening /onboarding/model directly", async () => {
    // Fresh session, no language decision: the model screen itself redirects.
    await expect(startupRedirectFor(MODEL_ONBOARDING_PATH)).resolves.toBe(LANGUAGE_ONBOARDING_PATH);
    await expect(startupRedirectFor("/onboarding/system-admission")).resolves.toBe(
      LANGUAGE_ONBOARDING_PATH,
    );
    // The language screen stays reachable (no redirect loop).
    await expect(startupRedirectFor(LANGUAGE_ONBOARDING_PATH)).resolves.toBeNull();
  });

  it("still routes to language when an AI decision was set without a language decision", async () => {
    markNonAi();
    await expect(resolveStartupDestination()).resolves.toBe(LANGUAGE_ONBOARDING_PATH);
    await expect(startupRedirectFor("/home")).resolves.toBe(LANGUAGE_ONBOARDING_PATH);
    await expect(startupRedirectFor(MODEL_ONBOARDING_PATH)).resolves.toBe(LANGUAGE_ONBOARDING_PATH);
    clearAiSession();
    markAiReady("Qwen/Qwen3.8-27B");
    await expect(startupRedirectFor("/school/biology")).resolves.toBe(LANGUAGE_ONBOARDING_PATH);
  });

  it("opens the model screen once the language decision exists", async () => {
    markLanguageSkipped("de");
    await expect(startupRedirectFor(MODEL_ONBOARDING_PATH)).resolves.toBeNull();
    // Revisiting the language screen afterwards is still allowed.
    await expect(startupRedirectFor(LANGUAGE_ONBOARDING_PATH)).resolves.toBeNull();
  });
});
