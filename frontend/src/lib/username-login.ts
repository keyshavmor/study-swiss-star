/**
 * Pure classification of the production `username-login` Edge Function reply.
 *
 * CURRENT SUPABASE (`username-login` v3, verified 2026-09-15):
 * - success            → HTTP 200 `{ ok: true, access_token, refresh_token, expires_in, token_type }`
 * - bad credentials    → HTTP 200 `{ ok: false, error_code: "invalid_credentials" }`
 * - missing challenge  → HTTP 200 `{ ok: false, error_code: "captcha_required" }`
 * - rejected challenge → HTTP 200 `{ ok: false, error_code: "captcha_failed" }`
 * - service/config out → HTTP 200 `{ ok: false, error_code: "authentication_unavailable" }`
 *
 * v3 performs the password grant with `options.captchaToken`, so username sign
 * in is subject to the same production CAPTCHA policy as email sign in and the
 * request body must carry `captcha_token`.
 *
 * Expected bad credentials are deliberately NOT an HTTP 401 any more, so a
 * simple typo can never surface as an Edge Function runtime error / blank
 * screen. Nothing here reveals whether the username exists, and the account
 * email is never part of the reply.
 */
export interface UsernameLoginPayload {
  ok?: boolean;
  error_code?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

/** Exact request contract of `username-login` v3. */
export interface UsernameLoginRequest {
  username: string;
  password: string;
  captcha_token: string;
}

export function usernameLoginRequest(
  username: string,
  password: string,
  captchaToken: string,
): UsernameLoginRequest {
  return { username, password, captcha_token: captchaToken };
}

export type UsernameLoginOutcome =
  | { kind: "session"; accessToken: string; refreshToken: string }
  | { kind: "invalid_credentials" }
  | { kind: "captcha_required" }
  | { kind: "captcha_failed" }
  | { kind: "unavailable" };


export function classifyUsernameLogin(
  data: UsernameLoginPayload | null | undefined,
  transportError: unknown,
): UsernameLoginOutcome {
  if (transportError || !data) return { kind: "unavailable" };
  if (data.ok === true && data.access_token && data.refresh_token) {
    return {
      kind: "session",
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }
  if (data.error_code === "authentication_unavailable") return { kind: "unavailable" };
  if (data.error_code === "captcha_required") return { kind: "captcha_required" };
  if (data.error_code === "captcha_failed") return { kind: "captcha_failed" };
  if (data.error_code === "invalid_credentials") return { kind: "invalid_credentials" };
  if (data.access_token && data.refresh_token) {
    return {
      kind: "session",
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }
  return { kind: "invalid_credentials" };
}

/**
 * Signup failure classification for a `unexpected_failure` / HTTP 500 reply.
 *
 * A 500 can equally be a database or service outage, so it must NOT be blanket
 * mapped to "username taken". Only a post-error availability check that clearly
 * says the exact username is unavailable justifies that message.
 */
export function isDuplicateUsernameAfterSignupError(recheck: {
  error?: unknown;
  data?: { available?: boolean } | null;
}): boolean {
  if (recheck.error) return false;
  return recheck.data?.available === false;
}
