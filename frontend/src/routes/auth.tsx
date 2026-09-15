/** `/auth` is kept as an alias so old links keep working; `/` owns the screen. */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/", replace: true });
    const { resolveStartupDestination } = await import("@/lib/startup-flow");
    throw redirect({ to: await resolveStartupDestination(), replace: true });
  },
});
