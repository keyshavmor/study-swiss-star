/**
 * The language and model decision screens are post-auth only.
 *
 * They must live under the `_authenticated` layout (which redirects an
 * unauthenticated visitor to `/auth`), must never render auth controls, and the
 * login screen must never render language/model controls.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const languageRoute = read("../routes/_authenticated/onboarding.language.tsx");
const modelRoute = read("../routes/_authenticated/onboarding.model.tsx");
const authRoute = read("../routes/auth.tsx");
const authGate = read("../routes/_authenticated/route.tsx");

describe("onboarding route protection", () => {
  it("keeps both decision screens under the authenticated layout", () => {
    expect(languageRoute).toContain('createFileRoute("/_authenticated/onboarding/language")');
    expect(modelRoute).toContain('createFileRoute("/_authenticated/onboarding/model")');
  });

  it("redirects unauthenticated visitors away from the authenticated subtree", () => {
    expect(authGate).toContain('throw redirect({ to: "/" })');
    expect(authGate).toMatch(/redirect/);
  });

  it("keeps the login screen free of language and model controls", () => {
    expect(authRoute).not.toContain("ModelReadinessPanel");
    expect(authRoute).not.toContain("SystemCapabilityPanel");
    expect(authRoute).not.toContain("markLanguageSelected");
    expect(authRoute).not.toContain("markAiReady");
  });

  it("offers sign out on both decision screens", () => {
    expect(languageRoute).toContain("signOutCompletely");
    expect(modelRoute).toContain("signOutCompletely");
  });

  it("offers skip on the language screen and a non-AI path on the model screen", () => {
    expect(languageRoute).toContain("markLanguageSkipped");
    expect(modelRoute).toContain("continueWithoutAi");
  });

  it("only enables continue-with-AI after a backend ready confirmation", () => {
    expect(modelRoute).toContain("ai.aiEnabled");
    expect(modelRoute).toContain("if (!ai.aiEnabled) return;");
  });
});

describe("recovery surfaces expose sign out", () => {
  it("shows sign out on the root error screen when a session exists", () => {
    const root = read("../routes/__root.tsx");
    expect(root).toContain("signOutCompletely");
    expect(root).toContain("nav.signOut");
  });

  it("includes sign out in the AI blocked notice without issuing AI calls", () => {
    const gate = read("../components/app/AiFeatureGate.tsx");
    expect(gate).toContain("signOutCompletely");
    expect(gate).toContain("nav.signOut");
    expect(gate).toContain("ai.blocked.retrySetup");
  });
});
