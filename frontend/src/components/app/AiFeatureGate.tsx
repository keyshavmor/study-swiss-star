/**
 * Central guard for every AI-dependent surface (CURRENT FRONTEND).
 *
 * A feature may run an AI request ONLY when the local backend explicitly
 * confirmed a ready model for this session (`useAiAvailability().aiEnabled`).
 * Neither a persisted model preference nor a selection in the picker unlocks
 * anything.
 *
 * When AI is not available the gate renders one destructive/red notice with the
 * three honest forward paths (retry model setup, use non-AI features, sign out)
 * and — by default — hides the AI action entirely so no request is even
 * attempted. Non-AI parts of the page keep working.
 */
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAiAvailability } from "@/lib/ai-availability";
import { useI18n } from "@/lib/i18n/provider";
import { MODEL_ONBOARDING_PATH } from "@/lib/startup-flow";
import { signOutCompletely } from "@/lib/sign-out";

/** True when an AI request must not be issued right now. */
export function useAiBlocked(): boolean {
  const ai = useAiAvailability();
  return !ai.aiEnabled;
}

export function AiBlockedNotice({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const ai = useAiAvailability();

  // Nothing to warn about while AI is ready or a check is still running.
  if (ai.aiEnabled || ai.status === "preparing") return null;

  if (compact) {
    return (
      <p role="status" className="text-[13px] font-medium text-destructive">
        {t("ai.blocked.short")}
      </p>
    );
  }

  return (
    <div
      role="status"
      className="rounded-[16px] border border-destructive/40 bg-destructive/10 p-4"
    >
      <p className="flex items-center gap-2 text-[15px] font-semibold text-destructive">
        <AlertTriangle className="h-4 w-4" />
        {t("ai.blocked.title")}
      </p>
      <p className="mt-1 text-[14px] text-foreground">
        {ai.status === "non-ai" ? t("ai.blocked.bodyNonAi") : t("ai.blocked.bodyUnavailable")}
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">{t("ai.blocked.useNonAi")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to={MODEL_ONBOARDING_PATH}>{t("ai.blocked.retrySetup")}</Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link to="/settings">{t("ai.blocked.openSettings")}</Link>
        </Button>
        {/* Third honest path: leave the session entirely. */}
        <Button size="sm" variant="ghost" onClick={() => void signOutCompletely()}>
          {t("nav.signOut")}
        </Button>
      </div>
    </div>
  );
}

export interface AiFeatureGateProps {
  children: ReactNode;
  /** Render the children (e.g. read-only history) below the notice anyway. */
  renderChildrenWhenBlocked?: boolean;
  compact?: boolean;
}

export function AiFeatureGate({
  children,
  renderChildrenWhenBlocked = false,
  compact = false,
}: AiFeatureGateProps) {
  const blocked = useAiBlocked();
  if (!blocked) return <>{children}</>;
  return (
    <div className="space-y-3">
      <AiBlockedNotice compact={compact} />
      {renderChildrenWhenBlocked ? children : null}
    </div>
  );
}
