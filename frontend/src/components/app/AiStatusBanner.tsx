/**
 * CURRENT FRONTEND: compact, read-only AI readiness indicator.
 *
 * Rendering it never probes the backend and never issues an AI request — it only
 * reflects the session state owned by `useAiAvailability()` and links to the
 * canonical model setup page, which alone owns capability probe, recommendation
 * and model preparation.
 */
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAiAvailability } from "@/lib/ai-availability";
import { useI18n } from "@/lib/i18n/provider";
import { MODEL_ONBOARDING_PATH } from "@/lib/startup-flow";
import { cn } from "@/lib/utils";

export function AiStatusBanner({ className }: { className?: string }) {
  const { t } = useI18n();
  const ai = useAiAvailability();

  if (ai.status === "ready") {
    return (
      <div
        role="status"
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-[16px] border border-success/40 bg-success-soft px-4 py-3 text-[14px] text-success",
          className,
        )}
      >
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span className="font-semibold">{t("ai.status.readyTitle")}</span>
        {ai.modelId && (
          <span className="text-[13px] text-muted-foreground">
            {t("ai.status.readyModel", { model: ai.modelId })}
          </span>
        )}
      </div>
    );
  }

  if (ai.status === "preparing") {
    return (
      <div
        role="status"
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-[16px] border border-border bg-surface-2 px-4 py-3 text-[14px]",
          className,
        )}
      >
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        <span className="font-semibold">{t("ai.status.preparingTitle")}</span>
        <span className="text-[13px] text-muted-foreground">{t("ai.status.preparingBody")}</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      className={cn(
        "rounded-[16px] border border-destructive/40 bg-destructive/10 p-4",
        className,
      )}
    >
      <p className="flex items-center gap-2 text-[15px] font-semibold text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {t("ai.status.blockedTitle")}
      </p>
      <p className="mt-1 text-[14px] text-foreground">{t("ai.status.blockedBody")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to={MODEL_ONBOARDING_PATH}>{t("ai.status.openSetup")}</Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link to="/settings">{t("ai.blocked.openSettings")}</Link>
        </Button>
      </div>
    </div>
  );
}
