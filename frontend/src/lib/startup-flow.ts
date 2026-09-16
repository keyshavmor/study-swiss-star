/**
 * Authenticated startup flow resolution.
 *
 * SIGNED OUT → sign in → COMPLIANCE / SAFETY ONBOARDING (once, Supabase flag)
 * → LANGUAGE ONBOARDING (once, Supabase flag) → Home.
 *
 * AUTHENTICATION IS NEVER GATED ON THE LOCAL AI RUNTIME. The system admission
 * gate and the model readiness gate are AI-readiness surfaces, not login
 * requirements: a signed-in user always reaches `/home` and every non-AI
 * product area, even when the future local backend is absent. `aiSetupPending()`
 * only tells the UI whether the optional AI setup flow is still worth offering.
 *
 * A suspended account (`account_compliance.account_status =
 * 'suspended_pending_review'`) is routed to the suspended screen before every
 * ordinary product page.
 */
import { fetchPreferences } from "@/lib/account-data";
import { fetchAccountCompliance } from "@/lib/compliance";
import { modelGateRequired } from "@/lib/ai-session";
import { admissionGateRequired } from "@/lib/admission-session";

export const COMPLIANCE_ONBOARDING_PATH = "/onboarding/compliance";
export const LANGUAGE_ONBOARDING_PATH = "/onboarding/language";
export const ADMISSION_ONBOARDING_PATH = "/onboarding/system-admission";
export const MODEL_ONBOARDING_PATH = "/onboarding/model";
export const SUSPENDED_PATH = "/account/suspended";
export const HOME_PATH = "/home";

/** Routes that must stay reachable while the startup flow is incomplete. */
export const STARTUP_EXEMPT_PREFIXES = ["/onboarding", "/auth", "/account", "/legal"] as const;

export function isStartupExempt(pathname: string): boolean {
  return STARTUP_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// One successful read per browser session is enough; the flags only flip
// through onboarding screens, which invalidate the cache themselves.
// A FAILED read is never cached and never treated as "completed".
let languageFlagCache: boolean | null = null;
let complianceCache: { completed: boolean; suspended: boolean } | null = null;
let preferencesReadFailed = false;
let complianceReadFailed = false;

export function invalidateStartupCache(): void {
  languageFlagCache = null;
  complianceCache = null;
  preferencesReadFailed = false;
  complianceReadFailed = false;
}

/** True when the last startup preference read failed and is worth retrying. */
export function startupPreferencesUnavailable(): boolean {
  return preferencesReadFailed;
}

/** True when the last compliance read failed and is worth retrying. */
export function complianceStateUnavailable(): boolean {
  return complianceReadFailed;
}

export type LanguageOnboardingStatus = "completed" | "required" | "unknown";
export type ComplianceStatus = "completed" | "required" | "suspended" | "unknown";

/**
 * Resolves the persisted compliance state. A transient read failure yields
 * `"unknown"` and is NEVER treated as completed — compliance must never be
 * inferred from auth metadata or from a failed request.
 */
export async function complianceStatus(): Promise<ComplianceStatus> {
  if (complianceCache) {
    if (complianceCache.suspended) return "suspended";
    return complianceCache.completed ? "completed" : "required";
  }
  try {
    const compliance = await fetchAccountCompliance();
    const suspended = compliance?.accountStatus === "suspended_pending_review";
    const completed = compliance?.complianceOnboardingCompleted === true;
    complianceCache = { completed, suspended };
    complianceReadFailed = false;
    if (suspended) return "suspended";
    return completed ? "completed" : "required";
  } catch {
    complianceReadFailed = true;
    return "unknown";
  }
}

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
  | typeof COMPLIANCE_ONBOARDING_PATH
  | typeof LANGUAGE_ONBOARDING_PATH
  | typeof ADMISSION_ONBOARDING_PATH
  | typeof MODEL_ONBOARDING_PATH
  | typeof SUSPENDED_PATH
  | typeof HOME_PATH;

/**
 * Where an authenticated user belongs right now. While a mandatory flag is
 * unknown the user stays on the corresponding onboarding screen, which renders
 * a localized retry state. AI readiness is deliberately NOT part of this
 * decision: it can never keep a signed-in user out of the product.
 */
export async function resolveStartupDestination(): Promise<StartupDestination> {
  const compliance = await complianceStatus();
  if (compliance === "suspended") return SUSPENDED_PATH;
  if (compliance !== "completed") return COMPLIANCE_ONBOARDING_PATH;
  if ((await languageOnboardingStatus()) !== "completed") return LANGUAGE_ONBOARDING_PATH;
  return HOME_PATH;
}

/**
 * True when this browser session has not yet completed the OPTIONAL AI setup
 * flow (system admission + model readiness). Purely advisory: the UI may offer
 * the AI setup screens, but product access never depends on it.
 */
export function aiSetupPending(): boolean {
  return admissionGateRequired() || modelGateRequired();
}

/**
 * Destination a protected product page must be redirected to, or null when the
 * requested page may render.
 */
export async function startupRedirectFor(pathname: string): Promise<StartupDestination | null> {
  const destination = await resolveStartupDestination();
  // The suspended screen outranks every exemption except itself.
  if (destination === SUSPENDED_PATH) return pathname === SUSPENDED_PATH ? null : SUSPENDED_PATH;
  if (isStartupExempt(pathname)) return null;
  return destination === HOME_PATH ? null : destination;
}
