import { beforeEach, describe, expect, it, vi } from "vitest";

const prefs = { language_onboarding_completed: false, selected_qwen_model: "Qwen/Qwen3.8-27B" };
let gateRequired = true;
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
  modelGateRequired: () => gateRequired,
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
  ADMISSION_ONBOARDING_PATH,
  COMPLIANCE_ONBOARDING_PATH,
  HOME_PATH,
  LANGUAGE_ONBOARDING_PATH,
  MODEL_ONBOARDING_PATH,
  SUSPENDED_PATH,
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
    gateRequired = true;
    admissionRequired = false;
    readFails = false;
    compliance.completed = true;
    compliance.suspended = false;
    compliance.fails = false;
  });

  it("sends a first-time user to language onboarding", async () => {
    await expect(resolveStartupDestination()).resolves.toBe(LANGUAGE_ONBOARDING_PATH);
  });

  it("sends a returning user straight home even when AI setup is pending", async () => {
    prefs.language_onboarding_completed = true;
    gateRequired = true;
    admissionRequired = true;
    await expect(resolveStartupDestination()).resolves.toBe(HOME_PATH);
  });

  it("does not repeat language onboarding once the flag is true", async () => {
    prefs.language_onboarding_completed = true;
    gateRequired = false;
    await expect(resolveStartupDestination()).resolves.toBe(HOME_PATH);
  });

  it("never blocks /home because the local AI backend is absent", async () => {
    prefs.language_onboarding_completed = true;
    gateRequired = true;
    admissionRequired = true;
    await expect(startupRedirectFor("/home")).resolves.toBeNull();
    await expect(startupRedirectFor("/planner")).resolves.toBeNull();
    await expect(startupRedirectFor("/messages")).resolves.toBeNull();
    expect(aiSetupPending()).toBe(true);
  });

  it("never treats a failed preference read as completed language onboarding", async () => {
    readFails = true;
    await expect(languageOnboardingStatus()).resolves.toBe("unknown");
    expect(startupPreferencesUnavailable()).toBe(true);
    await expect(resolveStartupDestination()).resolves.toBe(LANGUAGE_ONBOARDING_PATH);
    // /home stays unreachable while completion is unknown.
    await expect(startupRedirectFor("/home")).resolves.toBe(LANGUAGE_ONBOARDING_PATH);
  });

  it("does not cache a failed read, so a recovered read is honoured", async () => {
    readFails = true;
    await expect(resolveStartupDestination()).resolves.toBe(LANGUAGE_ONBOARDING_PATH);
    readFails = false;
    prefs.language_onboarding_completed = true;
    gateRequired = false;
    await expect(resolveStartupDestination()).resolves.toBe(HOME_PATH);
    expect(startupPreferencesUnavailable()).toBe(false);
  });

  it("keeps onboarding and auth routes reachable so guards cannot loop", async () => {
    expect(isStartupExempt(LANGUAGE_ONBOARDING_PATH)).toBe(true);
    expect(isStartupExempt(MODEL_ONBOARDING_PATH)).toBe(true);
    expect(isStartupExempt(ADMISSION_ONBOARDING_PATH)).toBe(true);
    expect(isStartupExempt("/auth/update-password")).toBe(true);
    expect(isStartupExempt("/legal/privacy")).toBe(true);
    expect(isStartupExempt("/home")).toBe(false);
    await expect(startupRedirectFor(MODEL_ONBOARDING_PATH)).resolves.toBeNull();
  });

  /* ------------------------------------------------------------ compliance */

  it("requires compliance onboarding before language onboarding", async () => {
    compliance.completed = false;
    prefs.language_onboarding_completed = true;
    await expect(resolveStartupDestination()).resolves.toBe(COMPLIANCE_ONBOARDING_PATH);
    await expect(startupRedirectFor("/home")).resolves.toBe(COMPLIANCE_ONBOARDING_PATH);
  });

  it("never treats a failed compliance read as completed", async () => {
    compliance.fails = true;
    await expect(complianceStatus()).resolves.toBe("unknown");
    expect(complianceStateUnavailable()).toBe(true);
    await expect(resolveStartupDestination()).resolves.toBe(COMPLIANCE_ONBOARDING_PATH);
    await expect(startupRedirectFor("/home")).resolves.toBe(COMPLIANCE_ONBOARDING_PATH);
  });

  it("routes a suspended account to the suspension screen from anywhere", async () => {
    compliance.suspended = true;
    prefs.language_onboarding_completed = true;
    gateRequired = false;
    await expect(resolveStartupDestination()).resolves.toBe(SUSPENDED_PATH);
    await expect(startupRedirectFor("/home")).resolves.toBe(SUSPENDED_PATH);
    await expect(startupRedirectFor("/messages")).resolves.toBe(SUSPENDED_PATH);
    // Even otherwise-exempt onboarding routes are outranked by suspension.
    await expect(startupRedirectFor(LANGUAGE_ONBOARDING_PATH)).resolves.toBe(SUSPENDED_PATH);
    await expect(startupRedirectFor(SUSPENDED_PATH)).resolves.toBeNull();
  });

  /* --------------------------------------------- optional AI readiness --- */

  it("treats system admission and model readiness as optional AI setup", async () => {
    prefs.language_onboarding_completed = true;
    admissionRequired = true;
    gateRequired = true;
    expect(aiSetupPending()).toBe(true);
    await expect(resolveStartupDestination()).resolves.toBe(HOME_PATH);

    admissionRequired = false;
    gateRequired = false;
    expect(aiSetupPending()).toBe(false);
    await expect(resolveStartupDestination()).resolves.toBe(HOME_PATH);
  });

  it("enforces the order compliance → language → home, with AI setup outside it", async () => {
    compliance.completed = false;
    admissionRequired = true;
    await expect(resolveStartupDestination()).resolves.toBe(COMPLIANCE_ONBOARDING_PATH);

    compliance.completed = true;
    invalidateStartupCache();
    await expect(resolveStartupDestination()).resolves.toBe(LANGUAGE_ONBOARDING_PATH);

    prefs.language_onboarding_completed = true;
    invalidateStartupCache();
    await expect(resolveStartupDestination()).resolves.toBe(HOME_PATH);
    // The AI setup routes stay reachable, they are just no longer forced.
    expect(isStartupExempt(ADMISSION_ONBOARDING_PATH)).toBe(true);
    expect(isStartupExempt(MODEL_ONBOARDING_PATH)).toBe(true);
  });
});
