/** TanStack route module defining one Alim screen or local API boundary. */
import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useI18n } from "@/lib/i18n/provider";
import { fetchPreferences } from "@/lib/account-data";
import { checkSystemAdmission } from "@/lib/system.functions";
import { markAdmitted } from "@/lib/admission-session";
import { effectiveUtilisationCaps } from "@/lib/system-admission.types";
import type { AdmissionStatus } from "@/lib/system-admission.types";
import { signOutCompletely } from "@/lib/sign-out";
import { HOME_PATH, MODEL_ONBOARDING_PATH } from "@/lib/startup-flow";
import { track, trackFailure } from "@/lib/telemetry";

export const Route = createFileRoute("/_authenticated/onboarding/system-admission")({
  head: () => ({
    meta: [
      { title: "Checking system capacity — Alim's Study Assistant" },
      {
        name: "description",
        content: "Confirming there is room for a new session on the local server.",
      },
      { property: "og:title", content: "Checking system capacity — Alim's Study Assistant" },
      {
        property: "og:description",
        content: "The local server confirms capacity before a session starts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SystemAdmissionPage,
});

const POLL_MS = 5000;

function SystemAdmissionPage() {
  const { t, formatDateTime } = useI18n();
  const navigate = useNavigate();
  const checkAdmission = useServerFn(checkSystemAdmission);

  const [status, setStatus] = useState<AdmissionStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const admitting = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  const runCheck = useCallback(async () => {
    if (admitting.current) return;
    setBusy(true);
    try {
      const prefs = await fetchPreferences();
      const result = await checkAdmission({
        data: { preferredModelId: prefs.selected_qwen_model },
      });
      if (!mounted.current) return;
      setStatus(result);

      // FAIL CLOSED: only mark admitted when the backend confirms a lease.
      if (result.state === "admitted" && result.lease) {
        admitting.current = true;
        markAdmitted(result.lease);
        track({ event_name: "system_admission_admitted", feature: "admission" });
        await navigate({ to: MODEL_ONBOARDING_PATH, replace: true });
        return;
      }

      if (result.state === "queued") {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void runCheck(), POLL_MS);
      }
    } catch (err) {
      trackFailure("system_admission_check_failed", err, { feature: "admission" });
      if (mounted.current) setStatus(null);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [checkAdmission, navigate]);

  useEffect(() => {
    mounted.current = true;
    void runCheck();
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    if (timer.current) clearTimeout(timer.current);
    await signOutCompletely();
    await navigate({ to: "/", replace: true });
  };

  const caps = effectiveUtilisationCaps();
  const state = status?.state ?? "checking";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[560px]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em] text-foreground">
            {t("admission.title")}
          </h1>
          <p className="mx-auto mt-3 max-w-[460px] text-[15px] leading-relaxed text-muted-foreground">
            {t("admission.subtitle")}
          </p>
        </div>

        <div className="app-card space-y-4 p-5 sm:p-6">
          <p className="text-[16px] font-semibold text-foreground">
            {t(`admission.state.${state}` as "admission.state.checking")}
          </p>

          {status && status.active_user_count !== null && (
            <p className="flex items-center gap-2 text-[14px] text-muted-foreground">
              <Users className="h-4 w-4" />
              {t("admission.activeUsers", {
                count: status.active_user_count,
                max: status.max_active_users,
              })}
            </p>
          )}

          {state === "queued" && status && (
            <p className="text-[14px] text-muted-foreground">
              {t("admission.queuePosition", {
                position: status.queue_position ?? "—",
                size: status.queue_size ?? "—",
              })}
            </p>
          )}

          <p className="text-[13px] text-muted-foreground">
            {t("admission.thresholds", {
              gpu: status?.login_thresholds.gpu_free_percent ?? 50,
              ram: status?.login_thresholds.ram_free_percent ?? 50,
              storage: status?.login_thresholds.storage_free_percent ?? 50,
            })}
          </p>
          <p className="text-[13px] text-muted-foreground">
            {t("admission.caps", {
              gpu: status?.effective_caps.gpu_used_percent ?? caps.gpu_used_percent,
              ram: status?.effective_caps.ram_used_percent ?? caps.ram_used_percent,
              storage: status?.effective_caps.storage_used_percent ?? caps.storage_used_percent,
            })}
          </p>

          {status?.retry_at && (
            <p className="text-[13px] text-muted-foreground">
              {t("admission.retryAt", { time: formatDateTime(status.retry_at) })}
            </p>
          )}

          {(state === "denied_capacity" ||
            state === "denied_user_limit" ||
            state === "backend_unavailable") && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
              <p className="text-[14px] text-foreground">
                {t(`admission.state.${state}` as "admission.state.denied_capacity")}
              </p>
            </div>
          )}

          <p className="text-[12px] text-muted-foreground">{t("admission.optionalNote")}</p>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={() => void runCheck()} disabled={busy}>
              {t("admission.retry")}
            </Button>
            <Button
              variant="outline"
              onClick={() => void navigate({ to: HOME_PATH, replace: true })}
            >
              {t("onboarding.model.continueWithoutAi")}
            </Button>
            <Button variant="ghost" onClick={() => void handleLogout()}>
              {t("admission.signOut")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
