/**
 * Regression guard for the post-signup handoff.
 *
 * When production requires email confirmation, `signUp` returns no session. The
 * sign-in form must then prefill the EMAIL address, never the username: a
 * username retry goes through `username-login`, which deliberately answers with
 * generic invalid credentials for an unconfirmed account and makes a successful
 * signup look broken. With the email prefilled, an early retry runs through
 * normal Supabase email auth and surfaces the localized `email_not_confirmed`
 * message instead.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8");

const authForm = read("src/components/AuthForm.tsx");
const authMessages = read("src/lib/i18n/messages/auth.ts");

const LOCALES = ["en", "de", "gsw", "ru", "es", "fr", "it"];

describe("post-signup confirmation-pending handoff", () => {
  it("prefills the signup email as the sign-in identifier", () => {
    expect(authForm).toContain("const pendingEmail = signupEmail.trim();");
    expect(authForm).toContain("setIdentifier(pendingEmail);");
    expect(authForm).toContain("setPendingConfirmationEmail(pendingEmail);");
  });

  it("never prefills the username after a no-session signup", () => {
    expect(authForm).not.toContain("setIdentifier(normalised)");
  });

  it("keeps the check-email toast", () => {
    expect(authForm).toContain('toast.success(t("auth.checkEmailToConfirm"));');
  });

  it("renders a persistent localized confirmation notice on the sign-in form", () => {
    expect(authForm).toContain('data-testid="confirmation-pending-notice"');
    expect(authForm).toContain(
      't("auth.confirmationPending", { email: pendingConfirmationEmail })',
    );
  });

  it("clears the notice as soon as the identifier changes", () => {
    expect(authForm).toMatch(
      /if \(pendingConfirmationEmail && e\.target\.value\.trim\(\) !== pendingConfirmationEmail\)/,
    );
    expect(authForm).toContain('setPendingConfirmationEmail("")');
  });

  it("translates the notice in all seven languages", () => {
    const occurrences = authMessages.match(/"auth\.confirmationPending":/g) ?? [];
    expect(occurrences).toHaveLength(LOCALES.length);
    expect(authMessages).not.toMatch(/"auth\.confirmationPending": "[^"]*ß/);
  });
});
