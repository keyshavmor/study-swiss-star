/**
 * Authenticated startup flow resolution (CURRENT FRONTEND).
 *
 * Canonical post-login sequence:
 *   Supabase Auth success
 *     → COMPLIANCE / SAFETY ONBOARDING (once, durable Supabase flag)
 *     → LANGUAGE DECISION (per browser session: select or explicit skip)
 *     → MODEL DECISION (per browser session: backend-confirmed ready, or an
 *       explicit "continue without AI")
 *     → Home / product.
 *
 * AUTHENTICATION IS NEVER GATED ON THE LOCAL AI RUNTIME. The model screen is a
 * mandatory DECISION gate, not an availability gate: when the local backend is
 * absent the user can always choose "continue without AI" and use the whole
 * non-AI product. The frontend enters AI-ready mode only after an explicit
 * backend `ready` confirmation for the selected model.
 *
 * Both gates are sessionStorage-scoped, so a refresh inside the same
 * authenticated browser session keeps the decisions, while a fresh sign-in after
 * sign-out asks again.
 *
 * The durable Supabase flag `language_onboarding_completed` is LEGACY profile
 * metadata. It is still written for compatibility but it no longer decides
 * whether the language screen appears.
 *
 * A suspended account (`account_compliance.account_status =
 * 'suspended_pending_review'`) is routed to the suspended screen before every
 * ordinary product page.
 */
import { fetchPreferences } from "@/lib/account-data";
import { fetchAccountCompliance } from "@/lib/compliance";
import { modelGateRequired } from "@/lib/ai-session";
import { languageDecisionRequired } from "@/lib/language-session";
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
 * Resolves the LEGACY persisted language-onboarding flag.
 *
 * Kept for compatibility and documentation only: the language screen is now
 * gated per browser session by `languageDecisionRequired()`, so a transient
 * read failure can no longer hide or force the screen.
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
 * Where an authenticated user belongs right now:
 * suspended → compliance → language decision → model decision → home.
 *
 * The model step is reached even when the local backend is unavailable, because
 * the user still has to make an explicit AI decision for the session. There is
 * NO separate mandatory system-admission screen in the user-facing flow; system
 * capability, admission and recommendation information is shown on the model
 * screen itself.
 */
export async function resolveStartupDestination(): Promise<StartupDestination> {
  const compliance = await complianceStatus();
  if (compliance === "suspended") return SUSPENDED_PATH;
  if (compliance !== "completed") return COMPLIANCE_ONBOARDING_PATH;
  if (languageDecisionRequired()) return LANGUAGE_ONBOARDING_PATH;
  if (modelGateRequired()) return MODEL_ONBOARDING_PATH;
  return HOME_PATH;
}

/**
 * True when this browser session has not yet recorded an AI decision. Advisory
 * only: used by AI surfaces and Settings to offer the setup flow again.
 */
export function aiSetupPending(): boolean {
  return modelGateRequired();
}

/** Advisory: the optional backend admission lease is still missing. */
export function admissionSetupPending(): boolean {
  return admissionGateRequired();
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
