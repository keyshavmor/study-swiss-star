import { afterEach, describe, expect, test } from "bun:test";
import {
  captureProviderToken,
  clearGoogleAccess,
  GOOGLE_CALENDAR_SCOPE,
  googleOccurrences,
  hasGoogleAccess,
  isGoogleOccurrence,
} from "./google-calendar";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

describe("Google Calendar boundary", () => {
  test("requests only the read-only Calendar scope", () => {
    expect(GOOGLE_CALENDAR_SCOPE).toBe("https://www.googleapis.com/auth/calendar.readonly");
  });

  test("maps external events to immutable planner occurrences", () => {
    const [occurrence] = googleOccurrences([
      {
        id: "event-1",
        title: "Private event",
        date: "2026-09-15",
        start: "08:00",
        end: "09:00",
        allDay: false,
      },
    ]);
    expect(occurrence?.event).toMatchObject({
      id: "google:event-1",
      externalSource: "google",
      readOnly: true,
    });
    expect(occurrence && isGoogleOccurrence(occurrence)).toBe(true);
  });

  test("keeps the provider token in session storage and clears it", () => {
    const values = new Map<string, string>();
    const sessionStorage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { sessionStorage },
    });

    expect(captureProviderToken({ provider_token: "private-provider-token" } as never)).toBe(true);
    expect(hasGoogleAccess()).toBe(true);
    clearGoogleAccess();
    expect(hasGoogleAccess()).toBe(false);
  });
});
