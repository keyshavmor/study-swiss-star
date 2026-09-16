/**
 * System compatibility / model recommendation preflight.
 *
 * The report comes from the FUTURE local backend probe (see
 * `system-capability.types.ts`). While it is unavailable the panel says so
 * plainly: no hardware value is ever guessed in the browser, and nothing here
 * blocks authentication or the non-AI product areas.
 */
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Cpu, Info, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/provider";
import { formatBytes } from "@/lib/storage-management";
import { probeSystemCapability } from "@/lib/system-capability.functions";
import {
  unavailableCapabilityReport,
  type SystemCapabilityReport,
} from "@/lib/system-capability.types";
import { trackFailure } from "@/lib/telemetry";

interface Props {
  /** Saved model preference, so the backend can judge fit against it. */
  preferredModelId?: string | null;
  /** Called whenever a report arrives, so the model picker can consume it. */
  onReport?: (report: SystemCapabilityReport) => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-2 last:border-0">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[14px] text-foreground">{value}</span>
    </div>
  );
}

export function SystemCapabilityPanel({ preferredModelId = null, onReport }: Props) {
  const { t, formatDateTime } = useI18n();
  const probe = useServerFn(probeSystemCapability);
  const [report, setReport] = useState<SystemCapabilityReport | null>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    setBusy(true);
    try {
      const next = await probe({ data: { preferredModelId } });
      setReport(next);
      onReport?.(next);
    } catch (err) {
      trackFailure("system_capability_probe_failed", err, { feature: "ai" });
      const fallback = unavailableCapabilityReport();
      setReport(fallback);
      onReport?.(fallback);
    } finally {
      setBusy(false);
    }
  }, [onReport, preferredModelId, probe]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = busy && !report ? "pending" : (report?.status ?? "pending");
  const measured = report?.backendConnected === true;

  return (
    <section className="app-card space-y-4 p-5 sm:p-6" aria-label={t("capability.title")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Cpu className="mt-0.5 h-5 w-5 text-muted-foreground" aria-hidden />
          <div>
            <h3 className="text-[16px] font-semibold text-foreground">{t("capability.title")}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {t("capability.subtitle")}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => void run()}>
          <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />
          {t("capability.recheck")}
        </Button>
      </div>

      <p aria-live="polite" className="text-[14px] text-foreground">
        {t(`capability.status.${status}` as "capability.status.pending")}
      </p>

      {measured && report && (
        <div className="space-y-1">
          <Row label={t("capability.os")} value={report.os} />
          <Row
            label={t("capability.ram")}
            value={
              report.ram.total_bytes === null
                ? "—"
                : `${formatBytes(report.ram.available_bytes ?? 0)} / ${formatBytes(report.ram.total_bytes)}`
            }
          />
          {report.gpus.map((gpu) => (
            <Row
              key={gpu.gpu_id}
              label={`${t("capability.gpu")} — ${gpu.name ?? gpu.gpu_id}`}
              value={
                gpu.vram_total_bytes === null
                  ? "—"
                  : `${t("capability.vram")}: ${formatBytes(gpu.vram_available_bytes ?? 0)} / ${formatBytes(gpu.vram_total_bytes)}`
              }
            />
          ))}
          <Row
            label={t("capability.storage")}
            value={
              report.runtimeStorage.available_bytes === null
                ? "—"
                : formatBytes(report.runtimeStorage.available_bytes)
            }
          />
          <Row
            label={t("capability.balancing")}
            value={t(
              `capability.balancing.${report.loadBalancing.mode}` as "capability.balancing.unknown",
            )}
          />
          {report.loadBalancing.spare_capacity !== null && (
            <Row
              label={t("capability.spareCapacity", { count: report.loadBalancing.spare_capacity })}
              value=""
            />
          )}
          {report.measuredAt && (
            <p className="pt-2 text-[12px] text-muted-foreground">
              {t("capability.measuredAt", { time: formatDateTime(report.measuredAt) })}
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <p className="text-[14px] font-semibold text-foreground">{t("capability.recommended")}</p>
        {report?.recommendation.recommended_model_id ? (
          <div className="mt-2 space-y-2">
            <Badge variant="secondary">{report.recommendation.recommended_model_id}</Badge>
            {report.recommendation.fit?.headroom_fraction !== null &&
              report.recommendation.fit !== null && (
                <p className="text-[13px] text-muted-foreground">
                  {t("capability.headroom", {
                    percent: Math.round((report.recommendation.fit.headroom_fraction ?? 0) * 100),
                  })}
                </p>
              )}
            {report.recommendation.alternatives.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] text-muted-foreground">
                  {t("capability.alternatives")}
                </span>
                {report.recommendation.alternatives.map((alternative) => (
                  <Badge key={alternative.model_id} variant="outline">
                    {alternative.model_id}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-muted-foreground">
            {t("capability.noRecommendation")}
          </p>
        )}
      </div>

      <div className="flex items-start gap-2 text-[12px] text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4" aria-hidden />
        <span>
          {t("capability.noValuesNote")} {t("capability.futureNote")} {t("capability.aiOptional")}
        </span>
      </div>
    </section>
  );
}
