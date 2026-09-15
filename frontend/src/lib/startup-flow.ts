/**
 * Authenticated startup flow resolution.
 *
 * SIGNED OUT → sign in → language onboarding (once, Supabase flag) → model
 * readiness gate (every new browser session) → Home (AI-ready or non-AI).
 */
import { fetchPreferences } from "@/lib/account-data";
import { modelGateRequired } from "@/lib/ai-session";

export const LANGUAGE_ONBOARDING_PATH = "/onboarding/language";
export const MODEL_ONBOARDING_PATH = "/onboarding/model";
export const HOME_PATH = "/home";

/** Routes that must stay reachable while the startup flow is incomplete. */
export const STARTUP_EXEMPT_PREFIXES = ["/onboarding", "/auth"] as const;

export function isStartupExempt(pathname: string): boolean {
  return STARTUP_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// One successful read per browser session is enough; the flag only flips
// through the onboarding screen, which invalidates the cache itself.
// A FAILED read is never cached and never treated as "completed".
let languageFlagCache: boolean | null = null;
let preferencesReadFailed = false;

export function invalidateStartupCache(): void {
  languageFlagCache = null;
  preferencesReadFailed = false;
}

/** True when the last startup preference read failed and is worth retrying. */
export function startupPreferencesUnavailable(): boolean {
  return preferencesReadFailed;
}

export type LanguageOnboardingStatus = "completed" | "required" | "unknown";

/**
 * Resolves the persisted language-onboarding flag.
 *
 * A transient Supabase read failure yields `"unknown"` — it must NEVER be
 * treated as completed, otherwise a first-time user could skip the required
 * language screen.
 */
export async function languageOnboardingStatus(): Promise<LanguageOnboardingStatus> {
  if (languageFlagCache !== null) return languageFlagCache ? "completed" : "required";
  try {
    const prefs = await fetchPreferences();
    languageFlagCache = prefs.language_onboarding_completed === true;
    preferencesReadFailed = false;
    return languageFlagCache ? "completed" : "required";
  } catch {
    preferencesReadFailed = true;
    return "unknown";
  }
}

export async function languageOnboardingCompleted(): Promise<boolean> {
  return (await languageOnboardingStatus()) === "completed";
}

export type StartupDestination =
  typeof LANGUAGE_ONBOARDING_PATH | typeof MODEL_ONBOARDING_PATH | typeof HOME_PATH;

/**
 * Where an authenticated user belongs right now. While language completion is
 * unknown the user stays on the language onboarding screen, which renders a
 * localized retry state — product routes stay unreachable.
 */
export async function resolveStartupDestination(): Promise<StartupDestination> {
  if ((await languageOnboardingStatus()) !== "completed") return LANGUAGE_ONBOARDING_PATH;
  if (modelGateRequired()) return MODEL_ONBOARDING_PATH;
  return HOME_PATH;
}

/**
 * Destination a protected product page must be redirected to, or null when the
 * requested page may render.
 */
export async function startupRedirectFor(pathname: string): Promise<StartupDestination | null> {
  if (isStartupExempt(pathname)) return null;
  const destination = await resolveStartupDestination();
  return destination === HOME_PATH ? null : destination;
}

