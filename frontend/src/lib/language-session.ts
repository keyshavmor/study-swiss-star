/**
 * Per-browser-session language decision (CURRENT FRONTEND).
 *
 * The DURABLE language preference lives in Supabase
 * (`user_preferences.preferences.app_language`) and is the default/preselection.
 * This module only records that the signed-in user made a language DECISION in
 * THIS browser session (either picking a language or explicitly skipping).
 *
 * Why sessionStorage: the post-login flow is
 *   Supabase Auth → language decision → model decision → app,
 * and every fresh sign-in must ask again. A page refresh inside the same
 * authenticated browser session keeps the decision; sign-out clears it.
 *
 * The legacy Supabase flag `language_onboarding_completed` is profile metadata
 * only — it is NEVER the session gate.
 */

export const LANGUAGE_SESSION_STORAGE_KEY = "alim.language_session.v1";
export const LANGUAGE_SESSION_EVENT = "alim:language-session-changed";

export type LanguageDecisionKind = "selected" | "skipped";

export interface LanguageSessionState {
  decision: LanguageDecisionKind;
  /** Language active after the decision (persisted default when skipped). */
  languageCode: string | null;
  /** ISO timestamp, diagnostics only. */
  decidedAt: string;
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readLanguageSession(): LanguageSessionState | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(LANGUAGE_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const decision = parsed["decision"];
    if (decision !== "selected" && decision !== "skipped") return null;
    return {
      decision,
      languageCode: typeof parsed["languageCode"] === "string" ? parsed["languageCode"] : null,
      decidedAt: typeof parsed["decidedAt"] === "string" ? parsed["decidedAt"] : "",
    };
  } catch {
    return null;
  }
}

function write(state: LanguageSessionState): LanguageSessionState {
  try {
    storage()?.setItem(LANGUAGE_SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private-mode storage failures must not break the gate */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LANGUAGE_SESSION_EVENT));
  }
  return state;
}

/** The user picked a language in this session (already persisted to Supabase). */
export function markLanguageSelected(languageCode: string): LanguageSessionState {
  return write({
    decision: "selected",
    languageCode,
    decidedAt: new Date().toISOString(),
  });
}

/** The user explicitly skipped, keeping the persisted/current language. */
export function markLanguageSkipped(languageCode: string | null): LanguageSessionState {
  return write({
    decision: "skipped",
    languageCode,
    decidedAt: new Date().toISOString(),
  });
}

export function clearLanguageSession(): void {
  try {
    storage()?.removeItem(LANGUAGE_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LANGUAGE_SESSION_EVENT));
  }
}

/** True while this browser session still owes a language decision. */
export function languageDecisionRequired(): boolean {
  return readLanguageSession() === null;
}
