/**
 * Shared model readiness panel used by the authenticated startup gate and by
 * the Settings local-model section.
 *
 * It renders ONLY what the local backend reports. It never measures resources
 * itself and never claims AI is ready without an explicit backend `ready`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, HardDrive, Cpu, MemoryStick, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import { fetchModelCatalog, type ModelChoice } from "@/lib/ai-model-catalog";
import { savePreferences } from "@/lib/account-data";
import { formatBytes } from "@/lib/storage-management";
import { prepareModel, pollModelOperation } from "@/lib/model-readiness.functions";
import {
  hasResourcePressure,
  isAiReady,
  isTerminalState,
  toneForStatus,
  type ModelPreparationStatus,
  type ResourceMeasurement,
} from "@/lib/model-readiness.types";
import type { TranslationKey } from "@/lib/i18n/messages";
import { track, trackFailure } from "@/lib/telemetry";

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 400;

function CircularProgress({
  percent,
  indeterminate,
  tone,
}: {
  percent: number | null;
  indeterminate: boolean;
  tone: string;
}) {
  const size = 104;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = percent === null ? 25 : Math.min(100, Math.max(0, percent));
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className={cn(indeterminate && "animate-spin")}
        role="img"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={tone}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {percent !== null && (
        <span className="absolute inset-0 flex items-center justify-center text-[18px] font-semibold tabular-nums">
          {Math.round(percent)}%
        </span>
      )}
    </div>
  );
}

function ResourceCard({
  icon,
  label,
  measurement,
  floorPercent,
}: {
  icon: React.ReactNode;
  label: string;
  measurement: ResourceMeasurement;
  floorPercent: number;
}) {
  const { t, formatNumber } = useI18n();
  const percent = measurement.free_percent;
  const known = percent !== null;
  const healthy = known && percent >= floorPercent;
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3">
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p
        className={cn(
          "mt-1 text-[16px] font-semibold tabular-nums",
          known && (healthy ? "text-success" : "text-destructive"),
        )}
      >
        {known
          ? t("model.resource.free", { percent: formatNumber(percent, { maximumFractionDigits: 0 }) })
          : t("model.resource.unknown")}
      </p>
      {measurement.free_bytes !== null && measurement.total_bytes !== null && (
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {t("model.resource.freeOf", {
            free: formatBytes(measurement.free_bytes),
            total: formatBytes(measurement.total_bytes),
          })}
        </p>
      )}
    </div>
  );
}

const TONE_TEXT: Record<string, string> = {
  success: "text-success",
  warning: "text-warning",
  degraded: "text-warning",
  danger: "text-destructive",
  progress: "text-primary",
  neutral: "text-muted-foreground",
};

const TONE_STROKE: Record<string, string> = {
  success: "stroke-success",
  warning: "stroke-warning",
  degraded: "stroke-warning",
  danger: "stroke-destructive",
  progress: "stroke-primary",
  neutral: "stroke-muted-foreground",
};

export interface ModelReadinessPanelProps {
  /** Preferred model from Supabase preferences. */
  initialModelId: string;
  /** Called whenever the backend confirms readiness. */
  onReady?: (modelId: string) => void;
  /** Called when a check ends without AI being available. */
  onUnavailable?: (status: ModelPreparationStatus) => void;
  /** Called while a check is running. */
  onPreparing?: () => void;
  /** Run one check automatically on mount (startup gate does, Settings does not). */
  autoStart?: boolean;
}

export function ModelReadinessPanel({
  initialModelId,
  onReady,
  onUnavailable,
  onPreparing,
  autoStart = false,
}: ModelReadinessPanelProps) {
  const { t } = useI18n();
  const prepare = useServerFn(prepareModel);
  const poll = useServerFn(pollModelOperation);

  const [choices, setChoices] = useState<ModelChoice[]>([]);
  const [usedFallback, setUsedFallback] = useState(false);
  const [modelId, setModelId] = useState(initialModelId);
  const [status, setStatus] = useState<ModelPreparationStatus | null>(null);
  const [running, setRunning] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const cancelled = useRef(false);
  const started = useRef(false);

  useEffect(() => {
    void fetchModelCatalog().then((result) => {
      setChoices(result.choices);
      setUsedFallback(result.usedFallback);
      setModelId((current) =>
        result.choices.some((choice) => choice.modelId === current)
          ? current
          : (result.choices[0]?.modelId ?? current),
      );
    });
    return () => {
      cancelled.current = true;
    };
  }, []);

  const runCheck = useCallback(
    async (target: string) => {
      setRunning(true);
      setStatus(null);
      onPreparing?.();
      try {
        let current = await prepare({ data: { modelId: target } });
        setStatus(current);
        let polls = 0;
        while (!isTerminalState(current.state) && current.operation_id && polls < MAX_POLLS) {
          if (cancelled.current) return;
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
          polls += 1;
          current = await poll({
            data: { modelId: target, operationId: current.operation_id },
          });
          setStatus(current);
        }
        if (isAiReady(current)) {
          track({
            event_name: "model_readiness_ready",
            feature: "ai",
            properties: { state: current.state },
          });
          onReady?.(current.model_id);
        } else {
          track({
            event_name: "model_readiness_unavailable",
            feature: "ai",
            properties: { state: current.state },
          });
          onUnavailable?.(current);
        }
      } catch (err) {
        trackFailure("model_readiness_check_failed", err, { feature: "ai" });
        const { unavailableStatus } = await import("@/lib/model-readiness.types");
        const fallback = unavailableStatus(target);
        setStatus(fallback);
        onUnavailable?.(fallback);
      } finally {
        setRunning(false);
      }
    },
    [onPreparing, onReady, onUnavailable, poll, prepare],
  );

  useEffect(() => {
    if (!autoStart || started.current || !modelId) return;
    started.current = true;
    void runCheck(modelId);
  }, [autoStart, modelId, runCheck]);

  const handleModelChange = async (next: string) => {
    setModelId(next);
    setStatus(null);
    setSaveError(false);
    try {
      await savePreferences({ selected_qwen_model: next });
    } catch {
      setSaveError(true);
    }
  };

  const tone = status ? toneForStatus(status) : "neutral";
  const phaseLabel = status
    ? t(`model.state.${status.state}` as TranslationKey)
    : running
      ? t("model.checking")
      : t("model.notCheckedYet");
  const indeterminate = running && (status === null || status.progress_percent === null);
  const fatal =
    status !== null &&
    (status.state === "failed" ||
      status.state === "blocked" ||
      status.state === "backend_unavailable");

  const floors = useMemo(
    () => status?.runtime_floors ?? { gpu_free_percent: 30, ram_free_percent: 25, storage_free_percent: 30 },
    [status],
  );

  return (
    <div className="space-y-5">
      <div className="max-w-md space-y-2">
        <Label htmlFor="modelReadinessSelect">{t("model.label")}</Label>
        <Select
          value={modelId}
          onValueChange={(value) => void handleModelChange(value)}
          disabled={running || !choices.length}
        >
          <SelectTrigger id="modelReadinessSelect">
            <SelectValue placeholder={t("model.placeholder")} />
          </SelectTrigger>
          <SelectContent>
            {choices.map((choice) => (
              <SelectItem key={choice.modelId} value={choice.modelId}>
                {choice.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {usedFallback && (
          <p className="text-[13px] text-muted-foreground">{t("model.catalogFallback")}</p>
        )}
        {saveError && <p className="text-[13px] text-destructive">{t("model.saveError")}</p>}
        <p className="text-[13px] text-muted-foreground">
          {t("settings.localModel.readinessHint")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <CircularProgress
          percent={status?.progress_percent ?? null}
          indeterminate={indeterminate}
          tone={TONE_STROKE[tone] ?? TONE_STROKE["neutral"]!}
        />
        <div className="min-w-[220px] space-y-1">
          <p className={cn("text-[16px] font-semibold", TONE_TEXT[tone])}>{phaseLabel}</p>
          {status?.progress_percent === null && running && (
            <p className="text-[13px] text-muted-foreground">
              {t("model.progress.indeterminate")}
            </p>
          )}
          {status?.model_present_on_disk === true && (
            <p className="text-[13px] text-muted-foreground">{t("model.presentOnDisk")}</p>
          )}
          {status?.shared_download === true && (
            <p className="text-[13px] text-muted-foreground">{t("model.sharedDownload")}</p>
          )}
          {status?.shared_download !== true && status?.model_download_in_progress === true && (
            <p className="text-[13px] text-muted-foreground">{t("model.downloadInProgress")}</p>
          )}
          {typeof status?.active_user_count === "number" && (
            <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {t("model.activeUsers", { count: status.active_user_count })}
            </p>
          )}
        </div>
      </div>

      {status && isAiReady(status) && (
        <div className="flex items-start gap-2 rounded-xl border border-success/30 bg-success/10 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
          <div>
            <p className="text-[15px] font-semibold text-success">{t("model.ready.title")}</p>
            <p className="text-[13px] text-muted-foreground">
              {t("model.ready.body", { model: status.model_id })}
            </p>
          </div>
        </div>
      )}

      {fatal && (
        <div
          className={cn(
            "rounded-xl border p-4",
            status.state === "backend_unavailable"
              ? "border-destructive/30 bg-destructive/10"
              : "border-destructive/40 bg-destructive/10",
          )}
        >
          <p className="flex items-center gap-2 text-[18px] font-bold text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {status.state === "backend_unavailable"
              ? t("model.unavailable.title")
              : t("model.warning.cannotStart")}
          </p>
          <p className="mt-1 text-[14px] text-foreground">
            {status.state === "backend_unavailable"
              ? t("model.unavailable.body")
              : t(`model.state.${status.state}` as TranslationKey)}
          </p>
          <ul className="mt-2 space-y-1 text-[13px] text-muted-foreground">
            {status.blocking_reasons.map((reason) => (
              <li key={reason}>{t(`model.reason.${reason}` as TranslationKey)}</li>
            ))}
          </ul>
          {hasResourcePressure(status) && (
            <p className="mt-2 text-[13px] font-medium text-warning">
              {t("model.warning.resourcePressure")}
            </p>
          )}
        </div>
      )}

      {status?.resources ? (
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-muted-foreground">
            {t("model.resource.title")}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <ResourceCard
              icon={<Cpu className="h-3.5 w-3.5" />}
              label={t("model.resource.gpu")}
              measurement={status.resources.gpu_vram}
              floorPercent={floors.gpu_free_percent}
            />
            <ResourceCard
              icon={<MemoryStick className="h-3.5 w-3.5" />}
              label={t("model.resource.ram")}
              measurement={status.resources.ram}
              floorPercent={floors.ram_free_percent}
            />
            <ResourceCard
              icon={<HardDrive className="h-3.5 w-3.5" />}
              label={t("model.resource.storage")}
              measurement={status.resources.storage}
              floorPercent={floors.storage_free_percent}
            />
          </div>
        </div>
      ) : (
        status !== null && (
          <p className="text-[13px] text-muted-foreground">{t("model.resource.unavailable")}</p>
        )
      )}

      <div className="space-y-1 text-[12px] text-muted-foreground">
        <p>
          {t("model.policy.admission", {
            gpu: status?.admission.gpu_free_percent ?? 50,
            ram: status?.admission.ram_free_percent ?? 50,
            storage: status?.admission.storage_free_percent ?? 50,
          })}
        </p>
        <p>
          {t("model.policy.runtime", {
            gpu: floors.gpu_free_percent,
            ram: floors.ram_free_percent,
            storage: floors.storage_free_percent,
          })}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void runCheck(modelId)} disabled={running || !modelId}>
          {running ? t("model.checking") : status ? t("model.retry") : t("model.checkPrepare")}
        </Button>
      </div>
    </div>
  );
}
