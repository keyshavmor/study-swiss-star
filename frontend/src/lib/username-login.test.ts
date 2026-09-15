/**
 * `username-login` v3 payload contract: expected bad credentials are an HTTP 200
 * body, never an Edge Function 401, and an unavailable auth service must not be
 * reported as wrong credentials.
 */
import { describe, expect, it } from "vitest";
import {
  classifyUsernameLogin,
  isDuplicateUsernameAfterSignupError,
  usernameLoginRequest,
} from "./username-login";

describe("classifyUsernameLogin", () => {
  it("returns a session for ok:true with both tokens", () => {
    expect(
      classifyUsernameLogin(
        {
          ok: true,
          access_token: "at",
          refresh_token: "rt",
          expires_in: 3600,
          token_type: "bearer",
        },
        null,
      ),
    ).toEqual({ kind: "session", accessToken: "at", refreshToken: "rt" });
  });

  it("treats ok:false invalid_credentials as invalid credentials, not an error", () => {
    expect(classifyUsernameLogin({ ok: false, error_code: "invalid_credentials" }, null)).toEqual({
      kind: "invalid_credentials",
    });
  });

  it("treats authentication_unavailable as a service problem, not wrong credentials", () => {
    expect(
      classifyUsernameLogin({ ok: false, error_code: "authentication_unavailable" }, null),
    ).toEqual({ kind: "unavailable" });
  });

  it("never classifies an unrecognised error code as a challenge outcome", () => {
    expect(classifyUsernameLogin({ ok: false, error_code: "captcha_required" }, null)).toEqual({
      kind: "invalid_credentials",
    });
  });



  it("treats a transport/runtime failure or missing body as unavailable", () => {
    expect(classifyUsernameLogin(null, new Error("boom"))).toEqual({ kind: "unavailable" });
    expect(classifyUsernameLogin(undefined, null)).toEqual({ kind: "unavailable" });
  });
});

describe("isDuplicateUsernameAfterSignupError", () => {
  it("only reports a duplicate when the re-check confirms it", () => {
    expect(isDuplicateUsernameAfterSignupError({ data: { available: false } })).toBe(true);
  });

  it("does not blame the username for an outage or an unreadable re-check", () => {
    expect(isDuplicateUsernameAfterSignupError({ data: { available: true } })).toBe(false);
    expect(isDuplicateUsernameAfterSignupError({ error: new Error("down"), data: null })).toBe(
      false,
    );
    expect(isDuplicateUsernameAfterSignupError({ data: null })).toBe(false);
  });
});

describe("usernameLoginRequest", () => {
  it("sends only username and password (v4, no CAPTCHA token)", () => {
    expect(usernameLoginRequest("student", "secret")).toEqual({
      username: "student",
      password: "secret",
    });
    expect(Object.keys(usernameLoginRequest("a", "b")).sort()).toEqual(["password", "username"]);
  });
});
