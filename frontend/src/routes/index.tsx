/** Public entry point: welcome + sign-in / sign-up. Signed-in users go to /home. */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { LiveClock } from "@/components/app/LiveClock";
import { ThemeToggle } from "@/components/ThemeToggle";

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
    if (data.user) throw redirect({ to: "/home" });
  },
  component: WelcomeAuthPage,
});

export function WelcomeAuthScreen() {
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
            Alim's Study Assistant
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            Your calm workspace for Swiss Gymnasium exams — guided study sessions, subject and grade
            overviews, and a planner that keeps every exam and revision block in one place.
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
