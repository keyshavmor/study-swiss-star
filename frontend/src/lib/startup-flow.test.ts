import { beforeEach, describe, expect, it, vi } from "vitest";

const prefs = { language_onboarding_completed: false, selected_qwen_model: "Qwen/Qwen3.8-27B" };
let aiDecisionRequired = true;
let languageRequired = true;
let admissionRequired = false;
let readFails = false;

const compliance = {
  completed: true,
  suspended: false,
  fails: false,
};

vi.mock("@/lib/account-data", () => ({
  fetchPreferences: () =>
    readFails ? Promise.reject(new Error("read failed")) : Promise.resolve(prefs),
}));
vi.mock("@/lib/ai-session", () => ({
  modelGateRequired: () => aiDecisionRequired,
}));
vi.mock("@/lib/language-session", () => ({
  languageDecisionRequired: () => languageRequired,
}));
vi.mock("@/lib/admission-session", () => ({
  admissionGateRequired: () => admissionRequired,
}));
vi.mock("@/lib/compliance", () => ({
  fetchAccountCompliance: () =>
    compliance.fails
      ? Promise.reject(new Error("read failed"))
      : Promise.resolve({
          complianceOnboardingCompleted: compliance.completed,
          accountStatus: compliance.suspended ? "suspended_pending_review" : "active",
        }),
}));

const {
  COMPLIANCE_ONBOARDING_PATH,
  HOME_PATH,
  LANGUAGE_ONBOARDING_PATH,
  MODEL_ONBOARDING_PATH,
  SUSPENDED_PATH,
  admissionSetupPending,
  aiSetupPending,
  complianceStateUnavailable,
  complianceStatus,
  invalidateStartupCache,
  isStartupExempt,
  languageOnboardingStatus,
  startupPreferencesUnavailable,
  resolveStartupDestination,
  startupRedirectFor,
} = await import("./startup-flow");

describe("authenticated startup flow", () => {
  beforeEach(() => {
    invalidateStartupCache();
    prefs.language_onboarding_completed = false;
    aiDecisionRequired = true;
    languageRequired = true;
    admissionRequired = false;
    readFails = false;
    compliance.completed = true;
    compliance.suspended = false;
    compliance.fails = false;
  });

  it("sends every fresh authenticated session to the language screen", async () => {
    await expect(resolveStartupDestination()).resolves.toBe(LANGUAGE_ONBOARDING_PATH);
  });

  it("sends a decided language but undecided AI session to the model screen", async () => {
    languageRequired = false;
    await expect(resolveStartupDestination()).resolves.toBe(MODEL_ONBOARDING_PATH);
    expect(aiSetupPending()).toBe(true);
  });

  it("sends a fully decided session home", async () => {
    languageRequired = false;
    aiDecisionRequired = false;
    await expect(resolveStartupDestination()).resolves.toBe(HOME_PATH);
    await expect(startupRedirectFor("/home")).resolves.toBeNull();
    await expect(startupRedirectFor("/planner")).resolves.toBeNull();
    await expect(startupRedirectFor("/messages")).resolves.toBeNull();
    expect(aiSetupPending()).toBe(false);
  });

  it("ignores the legacy language_onboarding_completed flag as a session gate", async () => {
    prefs.language_onboarding_completed = true;
    languageRequired = true;
    await expect(resolveStartupDestination()).resolves.toBe(LANGUAGE_ONBOARDING_PATH);
    await expect(languageOnboardingStatus()).resolves.toBe("completed");
  });

  it("does not let a failed preference read change the session gates", async () => {
    readFails = true;
    languageRequired = false;
    aiDecisionRequired = false;
    await expect(languageOnboardingStatus()).resolves.toBe("unknown");
    expect(startupPreferencesUnavailable()).toBe(true);
    await expect(resolveStartupDestination()).resolves.toBe(HOME_PATH);
  });

  it("does not insert a mandatory admission screen between language and model", async () => {
    languageRequired = false;
    aiDecisionRequired = true;
    admissionRequired = true;
    await expect(resolveStartupDestination()).resolves.toBe(MODEL_ONBOARDING_PATH);
    expect(admissionSetupPending()).toBe(true);
  });

  it("routes a suspended account to the suspended screen before everything", async () => {
    compliance.suspended = true;
    languageRequired = false;
    aiDecisionRequired = false;
    await expect(resolveStartupDestination()).resolves.toBe(SUSPENDED_PATH);
    await expect(startupRedirectFor("/onboarding/language")).resolves.toBe(SUSPENDED_PATH);
    await expect(startupRedirectFor(SUSPENDED_PATH)).resolves.toBeNull();
  });

  it("never treats a failed compliance read as completed", async () => {
    compliance.fails = true;
    await expect(complianceStatus()).resolves.toBe("unknown");
    expect(complianceStateUnavailable()).toBe(true);
    await expect(resolveStartupDestination()).resolves.toBe(COMPLIANCE_ONBOARDING_PATH);
  });

  it("exempts onboarding, auth, account and legal routes", () => {
    expect(isStartupExempt("/onboarding/model")).toBe(true);
    expect(isStartupExempt("/auth")).toBe(true);
    expect(isStartupExempt("/legal/terms")).toBe(true);
    expect(isStartupExempt("/account/suspended")).toBe(true);
    expect(isStartupExempt("/home")).toBe(false);
  });
});
