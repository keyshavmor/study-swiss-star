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

    // The per-session language and model decision gates must
    // not be bypassed by navigating straight to a product or later onboarding page.
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
