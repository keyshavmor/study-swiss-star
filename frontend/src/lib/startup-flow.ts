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

// One read per browser session is enough; the flag only flips through the
// onboarding screen, which invalidates the cache itself.
let languageFlagCache: boolean | null = null;

export function invalidateStartupCache(): void {
  languageFlagCache = null;
}

export async function languageOnboardingCompleted(): Promise<boolean> {
  if (languageFlagCache !== null) return languageFlagCache;
  try {
    const prefs = await fetchPreferences();
    languageFlagCache = prefs.language_onboarding_completed === true;
  } catch {
    // Never trap the user in onboarding because of a transient read failure.
    languageFlagCache = true;
  }
  return languageFlagCache;
}

export type StartupDestination =
  | typeof LANGUAGE_ONBOARDING_PATH
  | typeof MODEL_ONBOARDING_PATH
  | typeof HOME_PATH;

/** Where an authenticated user belongs right now. */
export async function resolveStartupDestination(): Promise<StartupDestination> {
  if (!(await languageOnboardingCompleted())) return LANGUAGE_ONBOARDING_PATH;
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
