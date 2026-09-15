import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { speak, speechSupported } from "./speech";

const sourceRoot = resolve(import.meta.dir, "..");
const source = (relativePath: string) => readFileSync(resolve(sourceRoot, relativePath), "utf8");

describe("current-main product contracts", () => {
  test("public auth routes redirect signed-in users and preserve the /auth alias", () => {
    expect(source("routes/index.tsx")).toContain('redirect({ to: "/home" })');
    expect(source("routes/auth.tsx")).toContain('data.user ? "/home" : "/"');
  });

  test("auth supports username/email and only the approved OAuth providers", () => {
    const auth = source("components/AuthForm.tsx");
    expect(auth).toContain("username-availability");
    expect(auth).toContain("username-login");
    expect(auth).toContain("signInWithPassword");
    expect(auth).toContain('provider: "github"');
    expect(auth).toContain('provider: "linkedin_oidc"');
    expect(auth).toContain('provider: "spotify"');
    expect(auth).toContain("/^[a-z0-9._-]{3,30}$/");
  });

  test("complete sign-out clears the transient Google token even on failure", () => {
    const signOut = source("lib/sign-out.ts");
    expect(signOut).toContain("supabase.auth.signOut()");
    expect(signOut).toMatch(/finally\s*{\s*clearGoogleAccess\(\)/s);
  });

  test("Assistant persistence and feedback use their live Supabase boundaries", () => {
    const assistant = source("lib/assistant-data.ts");
    expect(assistant).toContain('from("assistant_threads")');
    expect(assistant).toContain('from("assistant_messages")');
    expect(assistant).toContain('from("assistant_attachments")');
    expect(assistant).toContain("CHAT_ATTACHMENT_BUCKET");
    expect(source("routes/_authenticated/feedback.tsx")).toContain(
      'supabase.functions.invoke("feedback-submit"',
    );
    const retention = source("lib/media-retention.ts");
    expect(retention).toContain('status: "ready"');
    expect(retention).not.toContain("descriptor_ready");
  });

  test("preferences preserve language onboarding and do not expose obsolete cleanup control", () => {
    const account = source("lib/account-data.ts");
    const settings = source("components/app/SettingsSections.tsx");
    expect(account).toContain("language_onboarding_completed");
    expect(account).not.toContain("auto_storage_cleanup");
    expect(settings).not.toContain('key: "auto_storage_cleanup"');
  });

  test("speech fails closed when the browser API is absent", () => {
    expect(speechSupported()).toBe(false);
    expect(speak({ text: "Hello", uiLanguage: "en" })).toBe("unsupported");
  });
});
