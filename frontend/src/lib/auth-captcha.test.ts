import { describe, expect, it } from "vitest";
import {
  captchaAuthOptions,
  requireAuthCaptchaToken,
  resolveAuthCaptchaConfig,
} from "./auth-captcha";

describe("production Auth CAPTCHA configuration", () => {
  it("accepts only a supported provider with a public site key", () => {
    expect(resolveAuthCaptchaConfig({ provider: "hcaptcha", siteKey: "public-key" })).toEqual({
      provider: "hcaptcha",
      siteKey: "public-key",
    });
  });

  it("fails closed when either public setting is absent or unsupported", () => {
    expect(resolveAuthCaptchaConfig({ provider: "hcaptcha" })).toBeNull();
    expect(resolveAuthCaptchaConfig({ siteKey: "public-key" })).toBeNull();
    expect(resolveAuthCaptchaConfig({ provider: "other", siteKey: "public-key" })).toBeNull();
    expect(resolveAuthCaptchaConfig({ provider: "turnstile", siteKey: "public-key" })).toBeNull();
    expect(resolveAuthCaptchaConfig({ provider: "hcaptcha", siteKey: "  " })).toBeNull();
  });

  it("never lets a password Auth request proceed without a challenge token", () => {
    expect(() => requireAuthCaptchaToken(null)).toThrow("captcha_required");
    expect(requireAuthCaptchaToken("verified-token")).toBe("verified-token");
    expect(captchaAuthOptions("verified-token")).toEqual({ captchaToken: "verified-token" });
  });
});
