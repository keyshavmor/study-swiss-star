/**
 * Google Calendar provider-token attribution.
 *
 * GitHub / LinkedIn / Spotify sign-ins also put a `provider_token` on the
 * Supabase session. Only a token that belongs to a Google Calendar linking
 * attempt may ever be stored as the Google Calendar token.
 */
import { beforeEach, describe, expect, it } from "vitest";
import type { Session } from "@supabase/supabase-js";
import {
  captureProviderToken,
  clearGoogleAccess,
  clearGoogleConnectPending,
  hasGoogleAccess,
  isGoogleCallbackUrl,
  isGoogleConnectPending,
  markGoogleConnectPending,
} from "./google-calendar";

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage;
}

const session = (token: string) => ({ provider_token: token }) as unknown as Session;

beforeEach(() => {
  const storage = fakeStorage();
  Object.defineProperty(globalThis, "window", {
    value: { sessionStorage: storage, location: { search: "" } },
    configurable: true,
    writable: true,
  });
});

describe("provider token attribution", () => {
  it("ignores a GitHub/Spotify-style provider token with no Google attempt", () => {
    expect(captureProviderToken(session("gho_github_token"))).toBe(false);
    expect(hasGoogleAccess()).toBe(false);
  });

  it("ignores a provider token from a plain session refresh", () => {
    markGoogleConnectPending();
    clearGoogleConnectPending();
    expect(captureProviderToken(session("spotify_token"))).toBe(false);
    expect(hasGoogleAccess()).toBe(false);
  });

  it("captures the token while a Google attempt is pending and clears the marker", () => {
    markGoogleConnectPending();
    expect(isGoogleConnectPending()).toBe(true);
    expect(captureProviderToken(session("ya29.google"))).toBe(true);
    expect(hasGoogleAccess()).toBe(true);
    expect(isGoogleConnectPending()).toBe(false);
  });

  it("captures the token on an explicit google=connected callback", () => {
    expect(captureProviderToken(session("ya29.google"), { googleCallback: true })).toBe(true);
    expect(hasGoogleAccess()).toBe(true);
  });

  it("recognises only the google=connected callback query", () => {
    expect(isGoogleCallbackUrl("?google=connected")).toBe(true);
    expect(isGoogleCallbackUrl("?tab=planner&google=connected")).toBe(true);
    expect(isGoogleCallbackUrl("?google=pending")).toBe(false);
    expect(isGoogleCallbackUrl("")).toBe(false);
  });

  it("disconnect forgets both the token and the pending marker", () => {
    markGoogleConnectPending();
    captureProviderToken(session("ya29.google"));
    clearGoogleAccess();
    expect(hasGoogleAccess()).toBe(false);
    expect(isGoogleConnectPending()).toBe(false);
  });

  it("never captures a session without a provider token", () => {
    markGoogleConnectPending();
    expect(captureProviderToken(null)).toBe(false);
    expect(captureProviderToken({} as unknown as Session)).toBe(false);
  });
});
