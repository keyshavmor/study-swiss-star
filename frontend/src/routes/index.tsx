/**
 * Public entry point: welcome + sign-in / sign-up. Signed-in users are sent to
 * the correct startup destination (language onboarding, model gate or Home).
 */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { LiveClock } from "@/components/app/LiveClock";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useI18n } from "@/lib/i18n/provider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — Alim's Study Assistant" },
      {
        name: "description",
        content:
          "Sign in to Alim's Study Assistant: guided study sessions, subject overviews, grades and an exam planner for Swiss Gymnasium students.",
      },
      { property: "og:title", content: "Sign in — Alim's Study Assistant" },
      {
        property: "og:description",
        content: "Study sessions, subject overviews and an exam planner for Gymnasium students.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  beforeLoad: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      // Resolve the correct authenticated startup destination instead of
      // blindly landing on Home.
      const { resolveStartupDestination } = await import("@/lib/startup-flow");
      throw redirect({ to: await resolveStartupDestination(), replace: true });
    }
  },
  component: WelcomeAuthPage,
});

export function WelcomeAuthScreen() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="absolute right-6 top-6 flex items-center gap-3">
        <LiveClock />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[400px]">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-[30px] font-bold tracking-[-0.02em] text-foreground">
            {t("auth.appName")}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {t("auth.welcomeSubtitle")}
          </p>
        </div>
        <AuthForm />
      </div>
    </div>
  );
}

function WelcomeAuthPage() {
  return <WelcomeAuthScreen />;
}
