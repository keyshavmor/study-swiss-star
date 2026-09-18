/**
 * The auth error mapper must never surface a raw provider message, and must key
 * only off the stable Supabase `code` (with HTTP status as a fallback).
 */
import { describe, expect, it } from "vitest";
import { localizedAuthError } from "./auth-errors";
import { dictionaries } from "./i18n/messages";
import type { TranslationKey } from "./i18n/messages";

const t = ((key: TranslationKey) => dictionaries.en[key]) as never;
const RAW = "Invalid login credentials for keyshavmor2611@gmail.com";

describe("localizedAuthError", () => {
  it("maps invalid credentials without echoing the message", () => {
    const message = localizedAuthError(t, {
      code: "invalid_credentials",
      status: 400,
      message: RAW,
    });
    expect(message).toBe(dictionaries.en["auth.errorInvalidCredentials"]);
    expect(message).not.toContain("@");
    expect(message).not.toContain(RAW);
  });

  it("maps unconfirmed email, rate limits, duplicates and weak passwords", () => {
    expect(localizedAuthError(t, { code: "email_not_confirmed" })).toBe(
      dictionaries.en["auth.errorEmailNotConfirmed"],
    );
    expect(localizedAuthError(t, { code: "over_request_rate_limit" })).toBe(
      dictionaries.en["auth.errorRateLimited"],
    );
    expect(localizedAuthError(t, { code: "user_already_exists" })).toBe(
      dictionaries.en["auth.errorEmailInUse"],
    );
    expect(localizedAuthError(t, { code: "weak_password" })).toBe(
      dictionaries.en["auth.errorWeakPassword"],
    );
  });

  it("maps an already-linked identity to the safe account-in-use copy", () => {
    expect(localizedAuthError(t, { code: "identity_already_exists" })).toBe(
      dictionaries.en["auth.errorEmailInUse"],
    );
  });

  it("never turns a validation failure or a 500 into wrong credentials", () => {
    expect(localizedAuthError(t, { code: "validation_failed", status: 400 })).toBe(
      dictionaries.en["auth.errorGeneric"],
    );
    expect(localizedAuthError(t, { code: "unexpected_failure", status: 500 })).toBe(
      dictionaries.en["auth.errorGeneric"],
    );
  });

  it("maps a challenge-shaped provider error to the generic message", () => {
    const message = localizedAuthError(t, {
      code: "captcha_failed",
      status: 400,
      message: "provider detail that must stay hidden",
    });
    expect(message).toBe(dictionaries.en["auth.errorGeneric"]);
    expect(message).not.toContain("provider detail");
  });

  it("maps expired recovery links", () => {
    expect(localizedAuthError(t, { code: "otp_expired" })).toBe(
      dictionaries.en["auth.recoveryLinkInvalid"],
    );
  });

  it("falls back on status, then to a generic message", () => {
    expect(localizedAuthError(t, { status: 429 })).toBe(dictionaries.en["auth.errorRateLimited"]);
    expect(localizedAuthError(t, { status: 401 })).toBe(
      dictionaries.en["auth.errorInvalidCredentials"],
    );
    // 400/403/422 also occur in signup, reset and recovery: they must not
    // falsely claim wrong credentials or an existing account.
    for (const status of [400, 403, 422]) {
      expect(localizedAuthError(t, { status })).toBe(dictionaries.en["auth.errorGeneric"]);
    }
    expect(localizedAuthError(t, { message: RAW })).toBe(dictionaries.en["auth.errorGeneric"]);
    expect(localizedAuthError(t, "boom")).toBe(dictionaries.en["auth.errorGeneric"]);
  });

  it("is localized in every supported language", () => {
    for (const [language, dictionary] of Object.entries(dictionaries)) {
      const localT = ((key: TranslationKey) => dictionary[key]) as never;
      expect(localizedAuthError(localT, { code: "invalid_credentials" })).toBe(
        dictionary["auth.errorInvalidCredentials"],
      );
      if (language === "gsw") {
        expect(dictionary["auth.errorGeneric"]).not.toContain("ß");
      }
    }
  });
});
