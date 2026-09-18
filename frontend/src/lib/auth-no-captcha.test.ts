/**
 * Regression guard: the frontend must have NO CAPTCHA dependency in any password
 * flow. Password signup, email sign in, username sign in and password recovery
 * all call Supabase Auth (or `username-login` v4) without a challenge token.
 *
 * CURRENT SUPABASE DASHBOARD prerequisite (manual, outside this repository):
 * Bot and Abuse Protection must be disabled, otherwise Supabase itself rejects
 * these calls with a challenge error.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8");

const authForm = read("src/components/AuthForm.tsx");

describe("auth surface has no CAPTCHA dependency", () => {
  it("does not render a challenge widget or hold a challenge token", () => {
    expect(authForm).not.toMatch(/AuthCaptcha|captchaToken|captcha_token|hcaptcha/i);
  });

  it("calls the plain Supabase password APIs", () => {
    expect(authForm).toContain("supabase.auth.signInWithPassword({");
    expect(authForm).toContain("supabase.auth.signUp({");
    expect(authForm).toContain("supabase.auth.resetPasswordForEmail(email, {");
  });

  it("sends only username and password to username-login", () => {
    expect(authForm).toContain("usernameLoginRequest(normalised, password)");
  });

  it("keeps raw provider payloads out of logs", () => {
    expect(authForm).not.toMatch(/console\.(log|error|warn)/);
  });

  it("has no CAPTCHA environment configuration left", () => {
    for (const envFile of ["../.env", ".env"]) {
      expect(read(envFile)).not.toMatch(/VITE_AUTH_CAPTCHA_/);
    }
  });
});
