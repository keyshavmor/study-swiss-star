/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AiAvailabilityProvider } from "@/lib/ai-availability";
import { startupRedirectFor } from "@/lib/startup-flow";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/" });

    // Language onboarding (once) and the per-session model readiness gate must
    // not be bypassed by navigating straight to a product page.
    const destination = await startupRedirectFor(location.pathname);
    if (destination) throw redirect({ to: destination, replace: true });

    return { user: data.user };
  },
  component: () => (
    <AiAvailabilityProvider>
      <Outlet />
    </AiAvailabilityProvider>
  ),
});
