import { beforeEach, describe, expect, it, vi } from "vitest";

const prefs = { language_onboarding_completed: false, selected_qwen_model: "Qwen/Qwen3.8-27B" };
let gateRequired = true;

vi.mock("@/lib/account-data", () => ({
  fetchPreferences: () => Promise.resolve(prefs),
}));
vi.mock("@/lib/ai-session", () => ({
  modelGateRequired: () => gateRequired,
}));

const {
  HOME_PATH,
  LANGUAGE_ONBOARDING_PATH,
  MODEL_ONBOARDING_PATH,
  invalidateStartupCache,
  isStartupExempt,
  resolveStartupDestination,
  startupRedirectFor,
} = await import("./startup-flow");

describe("authenticated startup flow", () => {
  beforeEach(() => {
    invalidateStartupCache();
    prefs.language_onboarding_completed = false;
    gateRequired = true;
  });

  it("sends a first-time user to language onboarding", async () => {
    await expect(resolveStartupDestination()).resolves.toBe(LANGUAGE_ONBOARDING_PATH);
  });

  it("sends a returning user straight to the session model gate", async () => {
    prefs.language_onboarding_completed = true;
    await expect(resolveStartupDestination()).resolves.toBe(MODEL_ONBOARDING_PATH);
  });

  it("does not repeat language onboarding once the flag is true", async () => {
    prefs.language_onboarding_completed = true;
    gateRequired = false;
    await expect(resolveStartupDestination()).resolves.toBe(HOME_PATH);
  });

  it("blocks a direct /home navigation until the model gate is passed", async () => {
    prefs.language_onboarding_completed = true;
    await expect(startupRedirectFor("/home")).resolves.toBe(MODEL_ONBOARDING_PATH);
    gateRequired = false;
    invalidateStartupCache();
    await expect(startupRedirectFor("/home")).resolves.toBeNull();
  });

  it("keeps onboarding and auth routes reachable so guards cannot loop", async () => {
    expect(isStartupExempt(LANGUAGE_ONBOARDING_PATH)).toBe(true);
    expect(isStartupExempt(MODEL_ONBOARDING_PATH)).toBe(true);
    expect(isStartupExempt("/auth/update-password")).toBe(true);
    expect(isStartupExempt("/home")).toBe(false);
    await expect(startupRedirectFor(MODEL_ONBOARDING_PATH)).resolves.toBeNull();
  });
});
