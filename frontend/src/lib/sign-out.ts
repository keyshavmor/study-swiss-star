/** Shared sign-out: end the Supabase session and clear transient app state. */
import { supabase } from "@/integrations/supabase/client";
import { clearGoogleAccess } from "@/lib/google-calendar";
import { logActivity, trackFailure } from "@/lib/telemetry";

/**
 * Signs the user out. Telemetry is sent before the session ends so the event is
 * still attributed, then the Google provider token is cleared.
 */
export async function signOutCompletely(): Promise<void> {
  await logActivity({ event_name: "auth_signout", feature: "auth" });
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (err) {
    trackFailure("auth_signout_failed", err, { feature: "auth" });
    throw err;
  } finally {
    clearGoogleAccess();
  }
}
