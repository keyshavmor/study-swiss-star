/**
 * System health panel: local AI backend capacity + Supabase aggregate health
 * + the signed-in user's own data summary. Renders only what the backends
 * report; a null/`not_exposed_by_sql` metric is shown as "Not exposed", never
 * computed or invented.
 */
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Cpu, HardDrive, MemoryStick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import { formatBytes } from "@/lib/attachment-processing";
import { fetchLocalBackendHealth, releaseMyRuntime } from "@/lib/system.functions";
import { readAdmissionSession } from "@/lib/admission-session";
import { markNonAi } from "@/lib/ai-session";
import type { LocalBackendHealth } from "@/lib/system-admission.types";
import {
  fetchMyDataSummary,
  fetchSupabaseHealth,
  isNotExposed,
  metricValue,
  NOT_EXPOSED_STATUS,
  type MyDataSummary,
  type SupabaseHealth,
} from "@/lib/system-health";
import { track, trackFailure } from "@/lib/telemetry";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3">
      <p className="text-[12.5px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-[15px] font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function LocalBackendSection() {
  const { t } = useI18n();
  const fetchHealth = useServerFn(fetchLocalBackendHealth);
  const release = useServerFn(releaseMyRuntime);
  const [health, setHealth] = useState<LocalBackendHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [releaseResult, setReleaseResult] = useState<"done" | "failed" | null>(null);

  const load = useCallback(async () => {
    try {
      setHealth(await fetchHealth());
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, [fetchHealth]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRelease = async () => {
    const lease = readAdmissionSession();
    setReleasing(true);
    setReleaseResult(null);
    try {
      const result = await release({ data: { leaseId: lease?.leaseId ?? null } });
      if (result.released) {
        markNonAi();
        setReleaseResult("done");
        track({ event_name: "system_health_release_runtime", feature: "system_health" });
        await load();
      } else {
        setReleaseResult("failed");
      }
    } catch (err) {
      trackFailure("system_health_release_failed", err, { feature: "system_health" });
      setReleaseResult("failed");
    } finally {
      setReleasing(false);
    }
  };

  if (loading) {
    return <p className="text-[14px] text-muted-foreground">{t("model.checking")}</p>;
  }

  if (!health || !health.available) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
        <p className="text-[14px] text-foreground">{t("systemHealth.local.unavailable")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label={t("systemHealth.local.activeUsers")}
          value={`${health.active_user_count ?? "—"} / ${health.max_active_users}`}
        />
        <Stat label={t("systemHealth.local.queue")} value={`${health.queue_size ?? 0}`} />
        {health.my_queue_position !== null && (
          <Stat
            label={t("systemHealth.local.queuePosition")}
            value={`${health.my_queue_position}`}
          />
        )}
      </div>

      {health.gpus.length > 0 && (
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-muted-foreground">
            {t("systemHealth.local.gpus")}
          </p>
          <div className="space-y-2">
            {health.gpus.map((gpu) => (
              <div key={gpu.gpu_id} className="rounded-xl border border-border bg-surface-2 p-3">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-[14px] font-medium">
                    <Cpu className="h-4 w-4" />
                    {gpu.name ?? t("systemHealth.local.gpu", { id: gpu.gpu_id })}
                  </p>
                  {gpu.utilisation_percent !== null && (
                    <span className="text-[13px] text-muted-foreground">
                      {t("systemHealth.local.utilisation")}: {gpu.utilisation_percent}%
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {t("systemHealth.local.vram")}: {formatBytes(gpu.used_vram_bytes)} /{" "}
                  {formatBytes(gpu.total_vram_bytes)} ({t("systemHealth.local.vram")}{" "}
                  {formatBytes(gpu.free_vram_bytes)} free)
                </p>
                {gpu.instances.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[12.5px] font-medium text-muted-foreground">
                      {t("systemHealth.local.instances")}
                    </p>
                    <ul className="space-y-1">
                      {gpu.instances.map((instance, idx) => (
                        <li
                          key={`${gpu.gpu_id}-${idx}`}
                          className="flex items-center justify-between text-[12.5px] text-muted-foreground"
                        >
                          <span>
                            {instance.model_id}
                            {instance.owned_by_me === true && (
                              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                {t("systemHealth.local.mine")}
                              </span>
                            )}
                          </span>
                          {instance.process_count !== null && (
                            <span>
                              {t("systemHealth.local.instanceProcesses", {
                                count: instance.process_count,
                              })}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {health.ram && (
          <div className="rounded-xl border border-border bg-surface-2 p-3">
            <p className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
              <MemoryStick className="h-4 w-4" />
              {t("systemHealth.local.ram")}
            </p>
            <p className="mt-1 text-[14px] font-semibold">
              {formatBytes(health.ram.used_bytes)} / {formatBytes(health.ram.total_bytes)}
              {health.ram.used_percent !== null ? ` (${health.ram.used_percent}%)` : ""}
            </p>
          </div>
        )}
        {health.disk && (
          <div className="rounded-xl border border-border bg-surface-2 p-3">
            <p className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
              <HardDrive className="h-4 w-4" />
              {t("systemHealth.local.disk")}
            </p>
            <p className="mt-1 text-[14px] font-semibold">
              {formatBytes(health.disk.used_bytes)} / {formatBytes(health.disk.total_bytes)}
              {health.disk.used_percent !== null ? ` (${health.disk.used_percent}%)` : ""}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-1 text-[13px] text-muted-foreground">
        {health.rebalance_state && (
          <p>
            {t("systemHealth.local.rebalance")}: {health.rebalance_state}
          </p>
        )}
        {health.recommended_model_id && (
          <p>
            {t("systemHealth.local.recommendation")}: {health.recommended_model_id}
            {health.recommendation_reason_code ? ` (${health.recommendation_reason_code})` : ""}
          </p>
        )}
        {health.my_preferred_model_id && (
          <p>
            {t("systemHealth.local.preferred")}: {health.my_preferred_model_id}
          </p>
        )}
        {health.my_assigned_model_id && (
          <p>
            {t("systemHealth.local.assigned")}: {health.my_assigned_model_id}
          </p>
        )}
        {health.my_preferred_model_id &&
          health.my_assigned_model_id &&
          health.my_preferred_model_id !== health.my_assigned_model_id && (
            <p className="text-warning">{t("systemHealth.local.assignedNote")}</p>
          )}
        <p>{t("systemHealth.local.noIdentities")}</p>
      </div>

      <div className="rounded-xl border border-border bg-surface-2 p-4">
        <p className="text-[14px] font-semibold">{t("systemHealth.release.title")}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">{t("systemHealth.release.body")}</p>
        <div className="mt-3 flex items-center gap-3">
          <Button variant="outline" disabled={releasing} onClick={() => void handleRelease()}>
            {releasing ? t("systemHealth.release.working") : t("systemHealth.release.action")}
          </Button>
          {releaseResult === "done" && (
            <span className="text-[13px] text-success">{t("systemHealth.release.done")}</span>
          )}
          {releaseResult === "failed" && (
            <span className="text-[13px] text-destructive">{t("systemHealth.release.failed")}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function metricLabel(
  t: ReturnType<typeof useI18n>["t"],
  used: number | null,
  quota: number | null,
  percent: number | null,
  status?: string | null,
): string {
  if (isNotExposed(used, status)) return t("systemHealth.cloud.notExposed");
  if (isNotExposed(quota, status) || quota === null) {
    return t("systemHealth.cloud.usedOnly", { used: formatBytes(used) });
  }
  return t("systemHealth.cloud.used", {
    used: formatBytes(used),
    quota: formatBytes(quota),
    percent: percent ?? Math.round(((used ?? 0) / quota) * 100),
  });
}

function CloudHealthSection() {
  const { t } = useI18n();
  const [health, setHealth] = useState<SupabaseHealth | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSupabaseHealth()
      .then(setHealth)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-[14px] text-muted-foreground">{t("model.checking")}</p>;
  if (failed || !health) {
    return <p className="text-[14px] text-destructive">{t("systemHealth.myData.loadFailed")}</p>;
  }

  // CURRENT SUPABASE (verified 2026-09-15): nested JSON groups. An absent group
  // or key renders as "Not exposed" — never as 0.
  const storage = health.object_storage ?? null;
  const database = health.database ?? null;
  const bandwidth = health.bandwidth ?? null;
  const realtime = health.realtime ?? null;
  const edge = health.edge_functions ?? null;

  const usageLabel = (usage: number | null | undefined, quota: number | null | undefined, status?: string | null) => {
    const used = metricValue(usage);
    if (used === null || status === NOT_EXPOSED_STATUS) return t("systemHealth.cloud.notExposed");
    const cap = metricValue(quota);
    if (cap === null) return `${used}`;
    return `${used} / ${cap}`;
  };

  const trigger = metricValue(storage?.cleanup_trigger_used_percent);
  const target = metricValue(storage?.cleanup_target_used_percent);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat
          label={t("systemHealth.cloud.objectStorage")}
          value={metricLabel(
            t,
            metricValue(storage?.used_bytes),
            metricValue(storage?.quota_bytes),
            metricValue(storage?.used_percent),
          )}
        />
        <Stat
          label={t("systemHealth.cloud.database")}
          value={metricLabel(
            t,
            metricValue(database?.used_bytes),
            metricValue(database?.quota_bytes),
            metricValue(database?.used_percent),
          )}
        />
        <Stat
          label={t("systemHealth.cloud.bandwidth")}
          value={metricLabel(
            t,
            metricValue(bandwidth?.used_bytes),
            metricValue(bandwidth?.quota_bytes),
            metricValue(bandwidth?.used_percent),
            bandwidth?.status ?? null,
          )}
        />
        <Stat
          label={t("systemHealth.cloud.realtime")}
          value={usageLabel(realtime?.usage, realtime?.quota, realtime?.status)}
        />
        <Stat
          label={t("systemHealth.cloud.edgeFunctions")}
          value={usageLabel(edge?.usage, edge?.quota, edge?.status)}
        />
      </div>
      {trigger !== null && target !== null && (
        <p className="text-[13px] text-muted-foreground">
          {t("systemHealth.cloud.cleanupNote", { trigger, target })}
        </p>
      )}
    </div>
  );
}

function MyDataSection() {
  const { t } = useI18n();
  const [summary, setSummary] = useState<MyDataSummary | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyDataSummary()
      .then(setSummary)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-[14px] text-muted-foreground">{t("model.checking")}</p>;
  if (failed || !summary) {
    return <p className="text-[14px] text-destructive">{t("systemHealth.myData.loadFailed")}</p>;
  }

  // CURRENT SUPABASE (verified 2026-09-15): exact keys of get_my_data_summary().
  // A key production does not return is shown as "Not exposed", not as 0.
  const notExposed = t("systemHealth.cloud.notExposed");
  const count = (value: number | null | undefined) => {
    const parsed = metricValue(value);
    return parsed === null ? notExposed : `${parsed}`;
  };
  const countWithBytes = (value: number | null | undefined, bytes: number | null | undefined) => {
    const parsed = metricValue(value);
    if (parsed === null) return notExposed;
    const parsedBytes = metricValue(bytes);
    return parsedBytes === null ? `${parsed}` : `${parsed} (${formatBytes(parsedBytes)})`;
  };

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat
        label={t("systemHealth.myData.peerMessages")}
        value={count(summary.peer_messages)}
      />
      <Stat
        label={t("systemHealth.myData.peerAttachments")}
        value={countWithBytes(summary.peer_attachments, summary.peer_attachment_bytes)}
      />
      <Stat
        label={t("systemHealth.myData.assistantMessages")}
        value={count(summary.assistant_messages)}
      />
      <Stat
        label={t("systemHealth.myData.assistantAttachments")}
        value={countWithBytes(summary.assistant_attachments, summary.assistant_attachment_bytes)}
      />
      <Stat
        label={t("systemHealth.myData.studyChatMessages")}
        value={count(summary.study_chat_messages)}
      />
      <Stat
        label={t("systemHealth.myData.documents")}
        value={countWithBytes(summary.documents, summary.document_bytes)}
      />
      <Stat
        label={t("systemHealth.myData.plannerEvents")}
        value={count(summary.planner_events)}
      />
      <Stat
        label={t("systemHealth.myData.feedbackItems")}
        value={count(summary.feedback_items)}
      />
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="app-card space-y-4 p-5 sm:p-6">
      <header className="space-y-1">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>
        {description && <p className="text-[14px] text-muted-foreground">{description}</p>}
      </header>
      {children}
    </section>
  );
}

export function SystemHealthPanel() {
  const { t } = useI18n();
  return (
    <div className="space-y-5">
      <Section title={t("systemHealth.local.title")}>
        <LocalBackendSection />
      </Section>
      <Section title={t("systemHealth.cloud.title")}>
        <CloudHealthSection />
      </Section>
      <Section title={t("systemHealth.myData.title")}>
        <MyDataSection />
      </Section>
    </div>
  );
}
