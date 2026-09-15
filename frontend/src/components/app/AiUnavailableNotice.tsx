/**
 * Localized notice shown wherever an AI-dependent feature cannot run because
 * the session is in non-AI mode or the local backend is unavailable.
 *
 * It never fabricates an answer and never crashes the page: the rest of the app
 * stays usable and the user gets a way back to the readiness check.
 */
import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAiAvailability } from "@/lib/ai-availability";
import { useI18n } from "@/lib/i18n/provider";
import { MODEL_ONBOARDING_PATH } from "@/lib/startup-flow";

export function AiUnavailableNotice({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const ai = useAiAvailability();

  if (ai.aiEnabled || ai.status === "preparing") return null;

  if (compact) {
    return (
      <p className="text-[13px] text-muted-foreground">{t("ai.unavailable.short")}</p>
    );
  }

  return (
    <div className="rounded-xl border border-degraded/40 bg-degraded-soft p-4">
      <p className="flex items-center gap-2 text-[15px] font-semibold text-degraded">
        <AlertTriangle className="h-4 w-4" />
        {t("ai.unavailable.title")}
      </p>
      <p className="mt-1 text-[14px] text-muted-foreground">{t("ai.unavailable.body")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to={MODEL_ONBOARDING_PATH}>{t("ai.unavailable.openGate")}</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to="/settings">{t("ai.unavailable.retryInSettings")}</Link>
        </Button>
      </div>
    </div>
  );
}
