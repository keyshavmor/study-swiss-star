/**
 * STRICT INITIAL SYSTEM-ASSESSMENT GATE.
 *
 * On /onboarding/model the model picker / prepare controls must not be usable
 * until the FIRST capability probe resolves (real report OR truthful
 * unavailable fallback). Preparation is never auto-started, a late
 * recommendation is advisory only, and Continue without AI / Sign out stay
 * available while the probe is unavailable or failing.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const modelRoute = read("../routes/_authenticated/onboarding.model.tsx");
const capabilityPanel = read("../components/app/SystemCapabilityPanel.tsx");
const readinessPanel = read("../components/app/ModelReadinessPanel.tsx");
const languageRoute = read("../routes/_authenticated/onboarding.language.tsx");

describe("initial capability gate on the model screen", () => {
  it("tracks whether the first capability probe has resolved", () => {
    expect(modelRoute).toContain("initialProbeResolved");
    expect(modelRoute).toContain("setInitialProbeResolved(true)");
  });

  it("does not mount the model picker before the first report resolves", () => {
    expect(modelRoute).toMatch(
      /preferredModel !== null && initialProbeResolved \?[\s\S]*<ModelReadinessPanel/,
    );
    expect(modelRoute).toContain('t("capability.status.pending")');
  });

  it("resolves the gate for the truthful unavailable fallback too", () => {
    // The panel reports the unavailable fallback through the same onReport
    // callback, so a failing probe can never trap the user behind the gate.
    expect(capabilityPanel).toContain("unavailableCapabilityReport()");
    expect(capabilityPanel).toMatch(/onReport\?\.\(fallback\)/);
  });

  it("keeps the recommendation advisory and never auto-starts preparation", () => {
    expect(modelRoute).not.toContain("autoStart");
    expect(readinessPanel).toContain("manuallyChosen");
    expect(readinessPanel).toContain("recommendedModelId");
  });

  it("keeps Continue without AI and Sign out available regardless of the probe", () => {
    expect(modelRoute).toContain("continueWithoutAi");
    expect(modelRoute).toContain("signOutCompletely");
  });
});

describe("saved language is only a visual default hint", () => {
  it("never describes the persisted language as a preselection", () => {
    expect(languageRoute).not.toContain("preselection");
    expect(languageRoute).toContain("SAVED DEFAULT VISUAL HINT");
  });
});
