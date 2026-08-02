import { createFileRoute, redirect } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — StudyMate" },
      { name: "description", content: "Sign in to StudyMate to start your exam prep." },
      { property: "og:title", content: "Sign in — StudyMate" },
      { property: "og:description", content: "Sign in to StudyMate to start your exam prep." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  beforeLoad: async () => {
    const { data } = await import("@/integrations/supabase/client").then((m) => m.supabase.auth.getUser());
    if (data.user) throw redirect({ to: "/chat" });
  },
  component: AuthPage,
});

function AuthPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="absolute right-6 top-6">
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
          <p className="mt-3 text-[15px] text-muted-foreground">
            Sign in to continue preparing for your exams.
          </p>
        </div>
        <AuthForm />
      </div>
    </div>
  );
}
