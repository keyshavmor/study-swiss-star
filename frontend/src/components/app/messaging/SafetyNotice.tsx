/** Localized fail-closed / warning / suspension banner for peer messaging. */
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ShieldAlert, ShieldOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import type { SafetyDecision } from "@/lib/safety.types";
import { cn } from "@/lib/utils";

export function SafetyNotice({
  decision,
  onRetry,
  className,
}: {
  decision: SafetyDecision;
  onRetry?: () => void;
  className?: string;
}) {
  const t = useT();

  if (decision.verdict === "allow") return null;

  if (decision.verdict === "scanning") {
    return (
      <Alert className={cn(className)}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{t("safety.checking")}</AlertDescription>
      </Alert>
    );
  }

  if (decision.verdict === "safety_unavailable") {
    return (
      <Alert variant="destructive" className={cn(className)}>
        <ShieldOff className="h-4 w-4" />
        <AlertTitle>{t("safety.unavailable.title")}</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{t("safety.unavailable.body")}</p>
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              {t("safety.unavailable.retry")}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (decision.verdict === "block_warning") {
    return (
      <Alert variant="destructive" className={cn(className)}>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>{t("safety.blocked.title")}</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{t("safety.blocked.body")}</p>
          {decision.category_code && (
            <p className="text-sm font-medium">{t(`safety.category.${decision.category_code}`)}</p>
          )}
          {typeof decision.strike_number === "number" && decision.strike_number > 0 && (
            <p className="text-sm">
              {t("safety.blocked.strike", { count: decision.strike_number })}
            </p>
          )}
          <Button asChild size="sm" variant="outline">
            <Link to="/help">{t("safety.blocked.readPolicy")}</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // block_suspend_pending_review
  return (
    <Alert variant="destructive" className={cn(className)}>
      <ShieldOff className="h-4 w-4" />
      <AlertTitle>{t("safety.suspended.title")}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{t("safety.suspended.body")}</p>
        <Button asChild size="sm" variant="outline">
          <Link to="/account/suspended">{t("safety.suspended.open")}</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
