/**
 * Acceptance coverage for the post-login decision contract:
 *  - the language screen requires an explicit choice or an explicit skip;
 *  - every authenticated / recovery surface offers sign-out and lands the user
 *    deterministically on the public auth page;
 *  - the model screen sequences preference → capability probe → advisory
 *    recommendation → explicit prepare, and never auto-starts a download;
 *  - a late recommendation never clobbers a manual model selection;
 *  - the capability contract carries active_user_count + model_catalog;
 *  - only runtime-availability failures downgrade central AI availability.
 *
 * Route/component sources are asserted as text so a future edit cannot quietly
 * remove a guard.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isRuntimeUnavailableError, isRuntimeUnavailableFailure } from "./ai-runtime-errors";
import { normaliseCapabilityPayload } from "./system-capability.server";
import { unavailableCapabilityReport } from "./system-capability.types";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const languageRoute = read("../routes/_authenticated/onboarding.language.tsx");
const modelRoute = read("../routes/_authenticated/onboarding.model.tsx");
const complianceRoute = read("../routes/_authenticated/onboarding.compliance.tsx");
const rootRoute = read("../routes/__root.tsx");
const readinessPanel = read("../components/app/ModelReadinessPanel.tsx");
const capabilityPanel = read("../components/app/SystemCapabilityPanel.tsx");
const capabilityFn = read("./system-capability.functions.ts");
const statusBanner = read("../components/app/AiStatusBanner.tsx");
const studyChat = read("../components/StudyChat.tsx");
const assessmentPanel = read("../components/app/assessment/AssessmentModePanel.tsx");

describe("language screen requires an explicit decision", () => {
  it("disables Continue until the user selects a language in this session", () => {
    expect(languageRoute).toContain("disabled={selected === null || saving}");
  });

  it("never treats a persisted default or the current UI language as the selection", () => {
    expect(languageRoute).not.toContain("selected ?? persisted");
    expect(languageRoute).not.toContain("highlighted");
    expect(languageRoute).toContain("const active = selected === entry.code");
  });

  it("shows the saved language only as a default hint", () => {
    expect(languageRoute).toContain("onboarding.language.savedDefault");
    expect(languageRoute).toContain("onboarding.language.mustChoose");
  });

  it("keeps skip available and records it as a skip, not a selection", () => {
    expect(languageRoute).toContain("markLanguageSkipped");
    expect(languageRoute).toContain("markLanguageSelected(target)");
  });
});

describe("deterministic sign-out on authenticated and recovery surfaces", () => {
  it("awaits signOutCompletely and then lands on the auth page", () => {
    for (const source of [languageRoute, modelRoute, complianceRoute]) {
      expect(source).toContain("await signOutCompletely()");
      expect(source).toContain('navigate({ to: "/", replace: true })');
    }
  });

  it("offers sign-out in compliance checking and load-failure states", () => {
    const signOutButtons = complianceRoute.match(/handleSignOut\(\)/g) ?? [];
    expect(signOutButtons.length).toBeGreaterThanOrEqual(3);
  });

  it("offers sign-out on the root error boundary and on not-found when signed in", () => {
    expect(rootRoute).toContain("RecoverySignOutButton");
    expect(rootRoute.match(/hasSession && <RecoverySignOutButton \/>/g)?.length).toBe(2);
  });

  it("shows sign-out on the blocked AI status banner", () => {
    expect(statusBanner).toContain("signOutCompletely");
    expect(statusBanner).toContain("ai.status.nonAiNote");
  });
});

describe("model screen sequencing", () => {
  it("loads the durable preference before probing and rendering the picker", () => {
    expect(modelRoute).toContain("setPreferredModel(prefs.selected_qwen_model)");
    expect(modelRoute).toContain("preferredModelId={preferredModel}");
    expect(modelRoute).toContain("recommendedModelId={recommendedModel}");
  });

  it("never auto-starts preparation from a persisted preference", () => {
    expect(modelRoute).not.toContain("autoStart");
  });

  it("only unlocks AI from an explicit backend ready confirmation", () => {
    expect(modelRoute).toContain("ai.setReady(modelId)");
    expect(readinessPanel).toContain("isAiReady(current)");
  });

  it("syncs a late recommendation but never over a manual selection", () => {
    expect(readinessPanel).toContain("manuallyChosen");
    expect(readinessPanel).toContain("if (!recommendedModelId || manuallyChosen.current) return;");
    expect(readinessPanel).toContain("manuallyChosen.current = true;");
  });

  it("bounds polling so a missing backend can never hang the screen", () => {
    expect(readinessPanel).toContain("MAX_POLLS");
  });
});

describe("system capability contract", () => {
  it("exposes a nullable active user count", () => {
    expect(unavailableCapabilityReport().activeUserCount).toBeNull();
    const report = normaliseCapabilityPayload({
      status: "ready",
      active_user_count: 3,
      measured_at: new Date().toISOString(),
    });
    expect(report.activeUserCount).toBe(3);
    expect(
      normaliseCapabilityPayload({ status: "ready", active_user_count: "many" }).activeUserCount,
    ).toBeNull();
  });

  it("shows the active user count in the capability panel", () => {
    expect(capabilityPanel).toContain("capability.activeUsers");
  });

  it("forwards the enabled Supabase catalogue as model_catalog", () => {
    expect(capabilityFn).toContain('from("ai_model_catalog")');
    expect(capabilityFn).toContain("modelCatalog");
    expect(read("./system-capability.server.ts")).toContain("model_catalog: input.modelCatalog");
  });

  it("never infers readiness from the catalogue or the recommendation", () => {
    expect(capabilityPanel).not.toContain("setReady");
    expect(capabilityFn).not.toContain("markAiReady");
  });
});

describe("mid-session runtime loss", () => {
  it("recognises runtime-availability failures", () => {
    expect(isRuntimeUnavailableFailure("backend_unavailable")).toBe(true);
    for (const failure of ["invalid_payload", "not_implemented", "cancelled", null]) {
      expect(isRuntimeUnavailableFailure(failure)).toBe(false);
    }
    expect(isRuntimeUnavailableError(new Error("model_not_loaded"))).toBe(true);
    expect(isRuntimeUnavailableError(new Error("fetch failed"))).toBe(true);
    expect(isRuntimeUnavailableError({ status: 503 })).toBe(true);
    expect(isRuntimeUnavailableError(new Error("request timed out"))).toBe(true);
  });

  it("ignores safety, validation, authorisation and cancellation errors", () => {
    expect(isRuntimeUnavailableError(new Error("safety_blocked"))).toBe(false);
    expect(isRuntimeUnavailableError(new Error("validation failed"))).toBe(false);
    expect(isRuntimeUnavailableError({ status: 401, message: "unauthorized" })).toBe(false);
    expect(isRuntimeUnavailableError(new Error("AbortError: cancelled"))).toBe(false);
    expect(isRuntimeUnavailableError(null)).toBe(false);
  });

  it("downgrades central AI availability from chat runtime loss only", () => {
    expect(studyChat).toContain("isRuntimeUnavailableError(err)");
    expect(studyChat).toContain("ai.setUnavailable()");
  });

  it("downgrades central AI availability from assessment backend_unavailable only", () => {
    expect(assessmentPanel).toContain("isRuntimeUnavailableFailure(failure)");
    expect(assessmentPanel).toContain("ai.setUnavailable()");
    expect(assessmentPanel).toContain("noteFailure(response.failure)");
  });
});
