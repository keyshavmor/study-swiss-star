import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <span className="text-xl font-bold">S</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome to StudyMate</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to start preparing for your exams.</p>
        </div>
        <AuthForm />
      </div>
    </div>
  );
}
