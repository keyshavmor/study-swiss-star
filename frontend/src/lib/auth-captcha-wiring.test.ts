import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const form = readFileSync(new URL("../components/AuthForm.tsx", import.meta.url), "utf8");
const widget = readFileSync(new URL("../components/auth/AuthCaptcha.tsx", import.meta.url), "utf8");

describe("hCaptcha password-flow wiring", () => {
  it("uses the official widget with public configuration and verification callbacks", () => {
    expect(widget).toContain('from "@hcaptcha/react-hcaptcha"');
    expect(widget).toContain("sitekey={AUTH_CAPTCHA_CONFIG.siteKey}");
    expect(widget).toContain("onVerify={(token) => onTokenRef.current(token)}");
    expect(widget).toContain("onExpire={() => onTokenRef.current(null)}");
    expect(widget).toContain("onError={() => onTokenRef.current(null)}");
  });
  it("clears tokens and resets the widget after success or failure", () => {
    expect(form).toMatch(
      /finally\s*\{\s*setIsLoading\(false\);\s*setCaptchaToken\(null\);\s*setCaptchaResetNonce/,
    );
    expect(widget).toContain("captchaRef.current?.resetCaptcha()");
    expect(widget).toContain("[resetNonce]");
    expect(widget).not.toMatch(/localStorage|sessionStorage|console\./);
  });
  it("passes CAPTCHA tokens to all four password request paths", () => {
    expect(form).toMatch(/signInWithPassword\([\s\S]*?options: verifiedCaptchaToken\(\)/);
    expect(form).toContain(
      "usernameLoginRequest(normalised, password, verifiedCaptchaTokenValue())",
    );
    expect(form).toMatch(/signUp\([\s\S]*?\.\.\.verifiedCaptchaToken\(\)/);
    expect(form).toMatch(/resetPasswordForEmail\([\s\S]*?\.\.\.verifiedCaptchaToken\(\)/);
    expect(form).toContain('outcome.kind === "captcha_required"');
    expect(form).toContain('outcome.kind === "captcha_failed"');
  });
});
