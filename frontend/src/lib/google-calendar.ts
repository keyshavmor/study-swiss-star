/**
 * Read-only Google Calendar integration for the Planner.
 *
 * The Google account is linked to the existing Supabase user with
 * `supabase.auth.linkIdentity`, requesting only the read-only Calendar scope.
 * The Google provider access token is kept in `sessionStorage` for the current
 * browser session only — never in the database, localStorage or telemetry.
 * Calendar titles, descriptions and locations are never logged.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import type { Occurrence } from "@/lib/store/app-data";
import type { PlannerEvent } from "@/lib/store/types";

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
export const GOOGLE_EVENT_COLOR = "#4285F4";

const TOKEN_KEY = "alim.google-calendar.provider-token";
/**
 * Set immediately before Google identity linking starts. Other providers
 * (GitHub / LinkedIn / Spotify) also put a `provider_token` on the session, so a
 * token is only ever accepted as a Google Calendar token while this marker is
 * present or the callback URL explicitly says `google=connected`.
 */
const PENDING_KEY = "alim.google-calendar.connect-pending";

export type GoogleCalendarErrorCode =
  | "not-connected"
  | "session-expired"
  | "access-expired"
  | "request-failed"
  | "manual-linking-disabled"
  | "provider-not-enabled"
  | "connect-failed";

export class GoogleCalendarAuthError extends Error {
  code: GoogleCalendarErrorCode;
  constructor(code: GoogleCalendarErrorCode, message: string) {
    super(message);
    this.name = "GoogleCalendarAuthError";
    this.code = code;
  }
}

export class GoogleCalendarError extends Error {
  code: GoogleCalendarErrorCode;
  constructor(code: GoogleCalendarErrorCode, message: string) {
    super(message);
    this.name = "GoogleCalendarError";
    this.code = code;
  }
}

interface StoredToken {
  token: string;
  /** Epoch seconds after which the token is treated as unusable. */
  expiresAt: number;
}

function readStored(): StoredToken | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredToken>;
    if (typeof parsed.token !== "string" || typeof parsed.expiresAt !== "number") return null;
    if (parsed.expiresAt * 1000 <= Date.now()) {
      window.sessionStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return { token: parsed.token, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

/** True when a usable Google provider token is available this session. */
export function hasGoogleAccess(): boolean {
  return readStored() !== null;
}

/** Mark a Google-linking attempt as in flight (called just before linkIdentity). */
export function markGoogleConnectPending(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PENDING_KEY, "1");
  } catch {
    // Ignore storage failures.
  }
}

/** True while a Google Calendar linking attempt is in flight. */
export function isGoogleConnectPending(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

/** Forget the in-flight marker (successful capture, disconnect, terminal error). */
export function clearGoogleConnectPending(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Ignore storage failures.
  }
}

/** Forget the provider token (sign-out, disconnect, or expiry). */
export function clearGoogleAccess(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage failures.
  }
  clearGoogleConnectPending();
}

/** True when the current URL is the Google Calendar linking callback. */
export function isGoogleCallbackUrl(search?: string): boolean {
  const query = search ?? (typeof window === "undefined" ? "" : window.location.search);
  return /(^|[?&])google=connected(&|$)/.test(query);
}

/**
 * Store the Google provider token from a Supabase session, but ONLY when this
 * session really came from a Google Calendar linking attempt. GitHub, LinkedIn
 * and Spotify sign-ins also carry a `provider_token`, and a plain token refresh
 * can replay one, so an unattributed token is always ignored.
 * Returns true when a token was captured.
 */
export function captureProviderToken(
  session: Session | null,
  options?: { googleCallback?: boolean },
): boolean {
  if (typeof window === "undefined") return false;
  const token = session?.provider_token;
  if (!token) return false;
  if (!options?.googleCallback && !isGoogleConnectPending()) return false;
  // Google access tokens live for roughly an hour; stay conservative.
  const expiresAt = Math.floor(Date.now() / 1000) + 55 * 60;
  try {
    window.sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token, expiresAt }));
    clearGoogleConnectPending();
    return true;
  } catch {
    return false;
  }
}

/**
 * Try to pick up a provider token from the current session, attributing it to
 * Google only via the pending marker or an explicit `google=connected` callback.
 */
export async function refreshProviderTokenFromSession(options?: {
  googleCallback?: boolean;
}): Promise<boolean> {
  const googleCallback = options?.googleCallback ?? isGoogleCallbackUrl();
  if (!googleCallback && !isGoogleConnectPending()) return false;
  const { data } = await supabase.auth.getSession();
  return captureProviderToken(data.session ?? null, { googleCallback });
}

/**
 * Start Google account linking with the read-only Calendar scope. Resolves
 * after the browser has been handed to Google, or throws a readable error when
 * the provider or manual linking is not enabled in the Supabase project.
 */
export async function connectGoogleCalendar(redirectTo: string): Promise<void> {
  // Marked BEFORE the redirect so the returning session's provider_token can be
  // attributed to Google and nothing else.
  markGoogleConnectPending();
  const { error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: {
      scopes: GOOGLE_CALENDAR_SCOPE,
      redirectTo,
      queryParams: { access_type: "online", prompt: "consent" },
    },
  });
  if (!error) return;

  // Terminal connect failure: no Google token can arrive for this attempt.
  clearGoogleConnectPending();
  const message = error.message || "";
  if (/manual linking/i.test(message)) {
    throw new GoogleCalendarError(
      "manual-linking-disabled",
      "Google Calendar cannot be connected yet: manual account linking is disabled in the authentication settings.",
    );
  }
  if (/not enabled|unsupported provider/i.test(message)) {
    throw new GoogleCalendarError(
      "provider-not-enabled",
      "Google Calendar cannot be connected yet: the Google sign-in provider is not enabled in the authentication settings.",
    );
  }
  throw new GoogleCalendarError(
    "connect-failed",
    message || "Google Calendar could not be connected.",
  );
}

/* --------------------------------------------------------- calendar API --- */

interface GoogleApiEvent {
  id?: string;
  status?: string;
  summary?: string;
  location?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  /** Local ISO date, `yyyy-mm-dd`. */
  date: string;
  /** Local `HH:MM`. */
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  link?: string;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function localIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toEvent(raw: GoogleApiEvent): GoogleCalendarEvent | null {
  if (!raw.id || raw.status === "cancelled") return null;
  const title = raw.summary?.trim() || "Busy";

  if (raw.start?.date) {
    return {
      id: raw.id,
      title,
      date: raw.start.date,
      start: "00:00",
      end: "23:59",
      allDay: true,
      ...(raw.location ? { location: raw.location } : {}),
      ...(raw.htmlLink ? { link: raw.htmlLink } : {}),
    };
  }

  if (!raw.start?.dateTime) return null;
  const startDate = new Date(raw.start.dateTime);
  const endDate = raw.end?.dateTime ? new Date(raw.end.dateTime) : new Date(startDate.getTime());
  if (Number.isNaN(startDate.getTime())) return null;

  const sameDayEnd =
    localIsoDate(endDate) === localIsoDate(startDate) ? localTime(endDate) : "23:59";

  return {
    id: raw.id,
    title,
    date: localIsoDate(startDate),
    start: localTime(startDate),
    end: sameDayEnd > localTime(startDate) ? sameDayEnd : localTime(startDate),
    allDay: false,
    ...(raw.location ? { location: raw.location } : {}),
    ...(raw.htmlLink ? { link: raw.htmlLink } : {}),
  };
}

/**
 * Fetch the primary calendar's events between two ISO dates (inclusive).
 * Throws `GoogleCalendarAuthError` when the token is missing or rejected.
 */
export async function fetchGoogleCalendarEvents(
  fromIso: string,
  toIso: string,
): Promise<GoogleCalendarEvent[]> {
  const stored = readStored();
  if (!stored) {
    throw new GoogleCalendarAuthError(
      "not-connected",
      "Google Calendar is not connected in this browser session.",
    );
  }

  const timeMin = new Date(`${fromIso}T00:00:00`).toISOString();
  const timeMax = new Date(`${toIso}T23:59:59`).toISOString();
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "250");

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${stored.token}` },
  });

  if (response.status === 401 || response.status === 403) {
    clearGoogleAccess();
    throw new GoogleCalendarAuthError(
      "access-expired",
      "Google Calendar access has expired. Reconnect to sync again.",
    );
  }
  if (!response.ok) {
    throw new GoogleCalendarError(
      "request-failed",
      `Google Calendar request failed (${response.status}).`,
    );
  }

  const payload = (await response.json()) as { items?: GoogleApiEvent[] };
  const items = payload.items ?? [];
  return items.map(toEvent).filter((event): event is GoogleCalendarEvent => event !== null);
}

/* --------------------------------------------- planner occurrence bridge --- */

/**
 * Convert Google events into read-only planner occurrences. These are never
 * written into the editable planner state — they are merged for rendering only.
 */
export function googleOccurrences(events: GoogleCalendarEvent[]): Occurrence[] {
  return events.map((event) => {
    const plannerEvent: PlannerEvent = {
      id: `google:${event.id}`,
      title: event.title,
      category: "Extracurricular activity",
      date: event.date,
      start: event.start,
      end: event.end,
      recurrence: "none",
      color: GOOGLE_EVENT_COLOR,
      externalSource: "google",
      readOnly: true,
      ...(event.location ? { location: event.location } : {}),
    };
    return {
      event: plannerEvent,
      date: event.date,
      originalDate: event.date,
      start: event.start,
      end: event.end,
      title: event.title,
    };
  });
}

/** True for occurrences that came from Google Calendar. */
export function isGoogleOccurrence(occurrence: Occurrence): boolean {
  return occurrence.event.externalSource === "google";
}
