/** Shared sign-out: release local runtime, end the session, clear app state. */
import { supabase } from "@/integrations/supabase/client";
import { clearGoogleAccess } from "@/lib/google-calendar";
import { clearAiSession } from "@/lib/ai-session";
import { clearAdmissionSession, readAdmissionSession } from "@/lib/admission-session";
import { clearMessagingSessionState } from "@/lib/messaging-session";
import { clearLanguageSession } from "@/lib/language-session";
import { invalidateStartupCache } from "@/lib/startup-flow";
import { logActivity, trackFailure } from "@/lib/telemetry";

/**
 * Signs the user out.
 *
 * Order matters:
 * 1. BEST-EFFORT runtime release through the server adapter, so the local
 *    backend can free the user's model process / VRAM / session context while
 *    the bearer token is still valid. A failure never blocks sign-out.
 * 2. Telemetry (still attributable).
 * 3. Supabase sign-out.
 * 4. Clear the session-scoped language decision, AI session, admission lease,
 *    Google provider token, transient
 *    messaging notification state and any object URLs.
 *
 * BACKEND TODO FOR CODEX: because a browser can be closed mid-flight, the local
 * backend still needs a heartbeat/lease TTL sweeper so abandoned sessions are
 * cleaned up even when this release call never arrives. That sweeper is NOT
 * implemented today.
 */
export async function signOutCompletely(): Promise<void> {
  const lease = readAdmissionSession();

  // Ephemeral assessment content must be cleaned up before the token dies.
  try {
    const { abandonActiveAssessment } = await import("@/lib/assessment/api");
    abandonActiveAssessment();
  } catch {
    /* best effort only */
  }
  try {
    const { releaseMyRuntime } = await import("@/lib/system.functions");
    await releaseMyRuntime({ data: { leaseId: lease?.leaseId ?? null } });
  } catch {
    /* best effort only — the local backend may be unavailable */
  }

  await logActivity({ event_name: "auth_signout", feature: "auth" });
  try {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
  } catch (err) {
    trackFailure("auth_signout_failed", err, { feature: "auth" });
    throw err;
  } finally {
    clearGoogleAccess();
    // Per-session gates and cached onboarding flags must not survive sign-out.
    clearAiSession();
    clearLanguageSession();
    clearAdmissionSession();
    clearMessagingSessionState();
    invalidateStartupCache();
  }
}
