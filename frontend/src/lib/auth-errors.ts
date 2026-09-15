/**
 * Safe, localized mapping of Supabase Auth failures.
 *
 * Raw `error.message` strings from Supabase/GoTrue or an OAuth provider are
 * English, unstable, and can echo back the identifier the user typed. They are
 * NEVER shown. Only the stable `code` (and HTTP `status` as a fallback) decide
 * which localized message the user sees; everything else falls back to a
 * generic localized message.
 */
import type { I18nValue } from "@/lib/i18n/provider";

type TranslateFn = I18nValue["t"];

/** The shape we rely on — matches `AuthError` without importing it. */
export interface AuthErrorLike {
  code?: string | undefined;
  status?: number | undefined;
  name?: string | undefined;
}

function readAuthError(error: unknown): AuthErrorLike {
  if (!error || typeof error !== "object") return {};
  const candidate = error as Record<string, unknown>;
  const out: AuthErrorLike = {};
  if (typeof candidate["code"] === "string") out.code = candidate["code"];
  if (typeof candidate["status"] === "number") out.status = candidate["status"];
  if (typeof candidate["name"] === "string") out.name = candidate["name"];
  return out;
}

/**
 * Localized, user-safe text for an auth failure. Never includes the email,
 * username, provider text or the raw backend message.
 */
export function localizedAuthError(t: TranslateFn, error: unknown): string {
  const { code, status, name } = readAuthError(error);

  switch (code) {
    case "invalid_credentials":
    case "invalid_grant":
    case "user_not_found":
      return t("auth.errorInvalidCredentials");
    case "email_not_confirmed":
    case "phone_not_confirmed":
      return t("auth.errorEmailNotConfirmed");
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
    case "over_sms_send_rate_limit":
      return t("auth.errorRateLimited");
    case "user_already_exists":
    case "email_exists":
    case "phone_exists":
      return t("auth.errorEmailInUse");
    case "weak_password":
      return t("auth.errorWeakPassword");
    case "otp_expired":
    case "flow_state_expired":
    case "flow_state_not_found":
    case "session_not_found":
      return t("auth.recoveryLinkInvalid");
    default:
      break;
  }

  if (name === "AuthRetryableFetchError" || name === "TypeError") {
    return t("auth.errorNetwork");
  }
  if (status === 400 || status === 401 || status === 403) {
    return t("auth.errorInvalidCredentials");
  }
  if (status === 422) return t("auth.errorEmailInUse");
  if (status === 429) return t("auth.errorRateLimited");
  return t("auth.errorGeneric");
}
