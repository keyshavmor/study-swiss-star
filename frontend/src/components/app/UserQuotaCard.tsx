/**
 * Per-user combined 50 MB allowance (database + Storage), read from the live
 * Supabase RPC `get_my_quota_status()`. Never estimated in the browser.
 */
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, HardDrive, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/lib/i18n/provider";
import { formatBytes } from "@/lib/storage-management";
import { fetchMyQuotaStatus, quotaPercent, type QuotaStatus } from "@/lib/user-quota";

export function UserQuotaCard() {
  const { t } = useI18n();
  const [status, setStatus] = useState<QuotaStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setStatus(await fetchMyQuotaStatus());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const percent = status ? quotaPercent(status) : 0;

  return (
    <section className="app-card space-y-4 p-5 sm:p-6" aria-label={t("quota.title")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <HardDrive className="mt-0.5 h-5 w-5 text-muted-foreground" aria-hidden />
          <div>
            <h3 className="text-[16px] font-semibold text-foreground">{t("quota.title")}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {t("quota.subtitle")}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => void load()}>
          <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />
          {t("quota.refresh")}
        </Button>
      </div>

      {failed && !status && (
        <p className="text-[14px] text-muted-foreground">{t("quota.unavailable")}</p>
      )}

      {status && (
        <div className="space-y-3">
          <Progress value={percent} aria-label={t("quota.title")} />
          <p className="text-[14px] text-foreground">
            {t("quota.used", {
              used: formatBytes(status.totalBytes),
              total: formatBytes(status.limitBytes),
              percent,
            })}
          </p>
          <p className="text-[13px] text-muted-foreground">
            {t("quota.remaining", { remaining: formatBytes(status.remainingBytes) })}
          </p>
          <dl className="grid grid-cols-2 gap-3 text-[13px]">
            <div>
              <dt className="text-muted-foreground">{t("quota.database")}</dt>
              <dd className="text-foreground">{formatBytes(status.databaseBytes)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("quota.storage")}</dt>
              <dd className="text-foreground">{formatBytes(status.storageBytes)}</dd>
            </div>
          </dl>

          {(status.warning || status.atLimit) && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" aria-hidden />
              <p className="text-[14px] text-foreground">
                {status.atLimit ? t("quota.full") : t("quota.warning", { percent })}
              </p>
            </div>
          )}

          <p className="text-[12px] text-muted-foreground">{t("quota.systemNote")}</p>
        </div>
      )}
    </section>
  );
}
