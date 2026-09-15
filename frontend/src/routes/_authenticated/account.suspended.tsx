/** TanStack route module defining one Alim screen or local API boundary. */
import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useT } from "@/lib/i18n";
import { fetchAccountCompliance } from "@/lib/compliance";
import { signOutCompletely } from "@/lib/sign-out";
import { HOME_PATH } from "@/lib/startup-flow";
import { trackFailure } from "@/lib/telemetry";

export const Route = createFileRoute("/_authenticated/account/suspended")({
  head: () => ({
    meta: [
      { title: "Access limited pending review — Alim's Study Assistant" },
      {
        name: "description",
        content: "Your account access is temporarily limited while a safety report is reviewed.",
      },
      { property: "og:title", content: "Access limited pending review" },
      {
        property: "og:description",
        content: "A person is reviewing a safety report on this account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SuspendedPage,
});

function SuspendedPage() {
  const t = useT();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const refresh = useCallback(async () => {
    setChecking(true);
    setLoadFailed(false);
    try {
      const compliance = await fetchAccountCompliance();
      if (compliance?.accountStatus !== "suspended_pending_review") {
        await navigate({ to: HOME_PATH, replace: true });
        return;
      }
      setIsStudent(compliance.accountType === "student");
    } catch (err) {
      trackFailure("suspended_page_load_failed", err, { feature: "compliance" });
      setLoadFailed(true);
    } finally {
      setChecking(false);
    }
  }, [navigate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOutCompletely();
    } catch (err) {
      trackFailure("suspended_signout_failed", err, { feature: "compliance" });
    } finally {
      await navigate({ to: "/", replace: true });
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <p className="text-[14px] text-muted-foreground">{t("compliance.saving")}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[560px]">
        <div className="app-card space-y-5 p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destructive text-destructive-foreground">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-[24px] font-bold tracking-[-0.02em] text-foreground">
                {t("suspended.title")}
              </h1>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
                {t("suspended.body")}
              </p>
              {isStudent && (
                <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
                  {t("suspended.guardianNote")}
                </p>
              )}
            </div>
          </div>

          {loadFailed && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-center">
              <p className="flex items-center justify-center gap-2 text-[13px] font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" />
                {t("compliance.error.loadFailed")}
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => void refresh()}>
                {t("compliance.retry")}
              </Button>
            </div>
          )}

          <div className="rounded-xl border border-border bg-surface-2 p-4">
            <h2 className="text-[14px] font-semibold text-foreground">
              {t("suspended.helpTitle")}
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
              {t("suspended.helpAppeal")}
            </p>
            <div className="mt-3 flex flex-wrap gap-4">
              <Link
                to="/legal/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-semibold text-primary hover:text-primary-hover"
              >
                {t("suspended.helpPrivacy")}
              </Link>
              <Link
                to="/legal/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-semibold text-primary hover:text-primary-hover"
              >
                {t("suspended.helpTerms")}
              </Link>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
          >
            {t("suspended.signOut")}
          </Button>
        </div>
      </div>
    </div>
  );
}
