/** Waiting room, ready screen and grading-pending screen. */
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import type { GenerationPhase } from "@/lib/assessment/lifecycle";
import type { AssessmentConfig, AttemptStatus } from "@/lib/assessment/types";
import { totalQuestions } from "@/lib/assessment/config";

const PHASE_LABEL_KEY = {
  queued: "assessment.generation.phase.queued",
  generating: "assessment.generation.phase.generating",
  validating: "assessment.generation.phase.validating",
} as const satisfies Record<GenerationPhase, string>;

export function GenerationWaitingRoom({
  phase,
  onCancel,
}: {
  phase: GenerationPhase | null;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  return (
    <section
      className="rounded-[20px] border border-border bg-surface p-6 text-center"
      aria-live="polite"
    >
      <Loader2 className="mx-auto h-7 w-7 animate-spin text-muted-foreground" aria-hidden="true" />
      <h3 className="mt-3 text-[18px] font-semibold tracking-tight">
        {t("assessment.generation.heading")}
      </h3>
      <p className="mx-auto mt-1.5 max-w-md text-[14.5px] text-muted-foreground">
        {t("assessment.generation.duration")}
      </p>
      <p className="mx-auto mt-1 max-w-md text-[14.5px] text-muted-foreground">
        {t("assessment.generation.timerNotice")}
      </p>
      {/* A phase is shown only when the backend actually reports one. */}
      {phase && <p className="mt-3 text-[13.5px] font-medium">{t(PHASE_LABEL_KEY[phase])}</p>}
      <Button variant="secondary" className="mt-5" onClick={onCancel}>
        {t("assessment.generation.cancel")}
      </Button>
    </section>
  );
}

export function AssessmentReadyScreen({
  config,
  questionCount,
  onBegin,
  onDiscard,
}: {
  config: AssessmentConfig;
  questionCount: number;
  onBegin: () => void;
  onDiscard: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="rounded-[20px] border border-border bg-surface p-6 text-center">
      <CheckCircle2 className="mx-auto h-7 w-7 text-success" aria-hidden="true" />
      <h3 className="mt-3 text-[18px] font-semibold tracking-tight">
        {t("assessment.ready.heading")}
      </h3>
      <p className="mx-auto mt-1.5 max-w-md text-[14.5px] text-muted-foreground">
        {t("assessment.ready.summary", {
          count: questionCount || totalQuestions(config.questionMix),
          time:
            config.timeLimitMinutes === null
              ? t("assessment.setup.untimed")
              : t("assessment.setup.minutes", { count: config.timeLimitMinutes }),
        })}
      </p>
      <p className="mx-auto mt-1 max-w-md text-[14.5px] text-muted-foreground">
        {t("assessment.ready.timerNotice")}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button onClick={onBegin}>{t("assessment.ready.begin")}</Button>
        <Button variant="ghost" onClick={onDiscard}>
          {t("assessment.ready.discard")}
        </Button>
      </div>
    </section>
  );
}

export function GradingPending({
  status,
  onViewLater,
  onRetry,
}: {
  status: AttemptStatus;
  onViewLater: () => void;
  onRetry?: () => void | undefined;
}) {
  const { t } = useI18n();
  const failed = status === "grading_failed";
  return (
    <section
      className="rounded-[20px] border border-border bg-surface p-6 text-center"
      aria-live="polite"
    >
      {!failed && (
        <Loader2
          className="mx-auto h-7 w-7 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
      )}
      <h3 className="mt-3 text-[18px] font-semibold tracking-tight">
        {failed ? t("assessment.grading.failedHeading") : t("assessment.grading.heading")}
      </h3>
      <p className="mx-auto mt-1.5 max-w-md text-[14.5px] text-muted-foreground">
        {failed ? t("assessment.grading.failedBody") : t("assessment.grading.body")}
      </p>
      {!failed && (
        <p className="mx-auto mt-1 max-w-md text-[14.5px] text-muted-foreground">
          {t("assessment.grading.leaveNotice")}
        </p>
      )}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button variant="secondary" onClick={onViewLater}>
          {t("assessment.grading.close")}
        </Button>
        {failed && onRetry && <Button onClick={onRetry}>{t("assessment.grading.retry")}</Button>}
      </div>
    </section>
  );
}
