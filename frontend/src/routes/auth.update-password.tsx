/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/provider";
import { localizedAuthError } from "@/lib/auth-errors";
import { invalidateStartupCache, resolveStartupDestination } from "@/lib/startup-flow";
import { track, trackFailure } from "@/lib/telemetry";

export const Route = createFileRoute("/auth/update-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Alim's Study Assistant" },
      { name: "description", content: "Set a new password for your study assistant account." },
      { property: "og:title", content: "Choose a new password — Alim's Study Assistant" },
      {
        property: "og:description",
        content: "Set a new password for your study assistant account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: UpdatePasswordPage,
});

function UpdatePasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // A recovery link must have established a session before the password can be
  // changed; without one we show a localized invalid/expired state.
  const [sessionState, setSessionState] = useState<"checking" | "ready" | "invalid">("checking");

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSessionState(data.session ? "ready" : "invalid");
      })
      .catch(() => {
        if (active) setSessionState("invalid");
      });
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || session) setSessionState("ready");
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error(t("auth.passwordsDoNotMatch"));
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) {
      // Never surface the raw provider message.
      trackFailure("auth_password_update_failed", error, { feature: "auth" });
      toast.error(localizedAuthError(t, error));
      return;
    }
    toast.success(t("auth.passwordUpdated"));
    track({ event_name: "auth_password_updated", feature: "auth" });
    // Compliance/language/admission/model gates may all still be pending.
    invalidateStartupCache();
    navigate({ to: await resolveStartupDestination() });
  };

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
            {t("auth.newPasswordTitle")}
          </h1>
          <p className="mt-3 text-[15px] text-muted-foreground">{t("auth.newPasswordSubtitle")}</p>
        </div>
        {sessionState === "invalid" ? (
          <div className="app-card space-y-5 p-7">
            <p className="text-[15px] text-destructive">{t("auth.recoveryLinkInvalid")}</p>
            <Button className="w-full" onClick={() => navigate({ to: "/auth" })}>
              {t("auth.backToSignIn")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="app-card space-y-5 p-7">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[13px] font-semibold text-muted-foreground">
                {t("auth.newPasswordLabel")}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-[13px] font-semibold text-muted-foreground">
                {t("auth.repeatPasswordLabel")}
              </Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || sessionState === "checking"}
            >
              {isLoading ? t("auth.saving") : t("auth.updatePassword")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
