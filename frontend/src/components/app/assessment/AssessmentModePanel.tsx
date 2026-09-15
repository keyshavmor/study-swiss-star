/**
 * Orchestrates the whole assessment lifecycle for one subject and one mode.
 *
 * All flow control comes from the lifecycle reducer. Generated questions and
 * answers live only in memory: nothing is written to localStorage, and leaving
 * the panel, changing route or signing out requests backend cleanup.
 */
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import { track } from "@/lib/telemetry";
import { getAssessmentApi, requestAbandonCleanup } from "@/lib/assessment/api";
import { createDefaultConfig, totalQuestions } from "@/lib/assessment/config";
import {
  assessmentReducer,
  createSession,
  isEphemeral,
} from "@/lib/assessment/lifecycle";
import { isPreviewAdapterEnabled } from "@/lib/assessment/preview-adapter";
import {
  isAnswered,
  publicQuestionListSchema,
  type AssessmentConfig,
  type AssessmentKind,
} from "@/lib/assessment/types";
import { AssessmentResults } from "./AssessmentResults";
import { AssessmentRunner } from "./AssessmentRunner";
import { AssessmentSetup } from "./AssessmentSetup";
import { QuickCheckSetup } from "./QuickCheckPanel";
import {
  AssessmentReadyScreen,
  GenerationWaitingRoom,
  GradingPending,
} from "./GenerationWaitingRoom";

const KIND_TITLE_KEY = {
  quick_check: "assessment.mode.quickCheck",
  practice: "assessment.mode.practice",
  quiz: "assessment.mode.quiz",
  mock_exam: "assessment.mode.mockExam",
} as const satisfies Record<AssessmentKind, string>;

const KIND_INTRO_KEY = {
  quick_check: "assessment.mode.quickCheck.intro",
  practice: "assessment.mode.practice.intro",
  quiz: "assessment.mode.quiz.intro",
  mock_exam: "assessment.mode.mockExam.intro",
} as const satisfies Record<AssessmentKind, string>;

export interface AssessmentContext {
  subjectSlug: string;
  subjectName: string;
  component?: string;
  language: string;
  schoolLevel: string | null;
  academicYear: string | null;
  topics: string[];
  learningGoals: Array<{ id: string; label: string }>;
  materials: Array<{ id: string; name: string; section: string }>;
}

export function PreviewDataNotice() {
  const { t } = useI18n();
  if (!isPreviewAdapterEnabled()) return null;
  return (
    <p className="rounded-[14px] border border-dashed border-border bg-surface-2 px-3.5 py-2.5 text-[13px] text-muted-foreground">
      {t("assessment.previewNotice")}
    </p>
  );
}

export function BackendUnavailableNotice({ onRetry }: { onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div
      role="status"
      className="rounded-[16px] border border-border bg-surface-2 px-4 py-3.5 text-[14px]"
    >
      <p className="font-medium">{t("assessment.unavailable.heading")}</p>
      <p className="mt-1 text-muted-foreground">{t("assessment.unavailable.body")}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          {t("assessment.unavailable.retry")}
        </Button>
      )}
    </div>
  );
}

export function AssessmentModePanel({
  kind,
  context,
}: {
  kind: AssessmentKind;
  context: AssessmentContext;
}) {
  const { t } = useI18n();
  const [config, setConfig] = useState<AssessmentConfig>(() =>
    createDefaultConfig({
      kind,
      subjectSlug: context.subjectSlug,
      subjectName: context.subjectName,
      component: context.component,
      language: context.language,
      schoolLevel: context.schoolLevel,
      academicYear: context.academicYear,
    }),
  );
  const [session, dispatch] = useReducer(assessmentReducer, undefined, () => createSession(null));
  const [failure, setFailure] = useState<string | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    track({ event_name: "assessment_setup_opened", feature: "assessment", properties: { kind } });
  }, [kind]);

  // Best-effort cleanup of ephemeral generated content when the student leaves.
  useEffect(() => {
    const cleanup = () => {
      const current = sessionRef.current;
      if (!isEphemeral(current.state)) return;
      requestAbandonCleanup({
        jobId: current.jobId ?? undefined,
        attemptId: current.attemptId ?? undefined,
      });
      track({
        event_name: "assessment_abandoned",
        feature: "assessment",
        properties: { kind, reason: "left_page" },
      });
    };
    window.addEventListener("pagehide", cleanup);
    return () => {
      window.removeEventListener("pagehide", cleanup);
      cleanup();
    };
  }, [kind]);

  /* --------------------------------------------------------- generation */

  const startGeneration = useCallback(async () => {
    setFailure(null);
    dispatch({ type: "configure", config });
    dispatch({ type: "request_generation" });
    track({
      event_name: "assessment_generation_requested",
      feature: "assessment",
      properties: { kind, questions: totalQuestions(config.questionMix) },
    });
    const response = await getAssessmentApi().createGenerationJob(config);
    if (!response.ok) {
      setFailure(response.failure);
      dispatch({ type: "generation_failed", errorKey: "assessment.unavailable.heading" });
      return;
    }
    dispatch({ type: "generation_accepted", jobId: response.data.jobId });
  }, [config, kind]);

  // Poll generation status while a job is running.
  useEffect(() => {
    if (session.state !== "generating" || !session.jobId) return;
    let active = true;
    const jobId = session.jobId;
    const timer = window.setInterval(async () => {
      const response = await getAssessmentApi().getGenerationStatus(jobId);
      if (!active) return;
      if (!response.ok) {
        setFailure(response.failure);
        dispatch({ type: "generation_failed", errorKey: "assessment.unavailable.heading" });
        return;
      }
      const status = response.data;
      if (status.state === "ready" && status.questions && status.attemptId) {
        const parsed = publicQuestionListSchema.safeParse(status.questions);
        if (!parsed.success) {
          dispatch({ type: "generation_failed", errorKey: "assessment.invalidQuestions" });
          return;
        }
        dispatch({
          type: "generation_ready",
          questions: parsed.data,
          attemptId: status.attemptId,
        });
        track({ event_name: "assessment_ready", feature: "assessment", properties: { kind } });
        return;
      }
      if (status.state === "failed" || status.state === "expired") {
        dispatch({ type: "generation_failed", errorKey: "assessment.generation.failed" });
        return;
      }
      if (status.phase) dispatch({ type: "generation_phase", phase: status.phase });
    }, 1500);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [session.state, session.jobId, kind]);

  /* ------------------------------------------------------------- timer */

  useEffect(() => {
    if (session.state !== "in_progress" || session.secondsRemaining === null) return;
    const timer = window.setInterval(() => dispatch({ type: "tick" }), 1000);
    return () => window.clearInterval(timer);
  }, [session.state, session.secondsRemaining === null]);

  /* -------------------------------------------------------- submission */

  const submit = useCallback(
    async (autoSubmitted: boolean) => {
      const current = sessionRef.current;
      if (!current.config || !current.attemptId || !current.startedAt) return;
      const submittedAt = new Date().toISOString();
      const timeTakenSeconds =
        current.config.timeLimitMinutes === null
          ? Math.round((Date.now() - new Date(current.startedAt).getTime()) / 1000)
          : current.config.timeLimitMinutes * 60 - (current.secondsRemaining ?? 0);

      const response = await getAssessmentApi().submitAssessment({
        attemptId: current.attemptId,
        config: current.config,
        questions: current.questions,
        answers: Object.values(current.answers),
        startedAt: current.startedAt,
        submittedAt,
        timeTakenSeconds,
        autoSubmitted,
      });
      if (!response.ok) {
        setFailure(response.failure);
        dispatch({ type: "grading_failed", errorKey: "assessment.unavailable.heading" });
        return;
      }
      dispatch({ type: "submitted", attemptId: response.data.attemptId });
      dispatch({ type: "grading" });
      track({
        event_name: "assessment_submitted",
        feature: "assessment",
        properties: { kind, auto: autoSubmitted },
      });
    },
    [kind],
  );

  // Auto-submit once the reducer moves into `submitting`.
  useEffect(() => {
    if (session.state !== "submitting") return;
    void submit(session.secondsRemaining === 0);
  }, [session.state, session.secondsRemaining, submit]);

  // Poll grading status; the student may safely leave this screen.
  useEffect(() => {
    if (session.state !== "grading" || !session.attemptId) return;
    const attemptId = session.attemptId;
    let active = true;
    const timer = window.setInterval(async () => {
      const status = await getAssessmentApi().getGradingStatus(attemptId);
      if (!active || !status.ok) return;
      if (status.data.status === "graded") {
        const result = await getAssessmentApi().getResult(attemptId);
        if (!active || !result.ok) return;
        dispatch({ type: "graded", result: result.data });
        track({ event_name: "grading_completed", feature: "assessment", properties: { kind } });
      }
      if (status.data.status === "grading_failed") {
        dispatch({ type: "grading_failed", errorKey: "assessment.grading.failedHeading" });
        track({ event_name: "grading_failed", feature: "assessment", properties: { kind } });
      }
    }, 2000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [session.state, session.attemptId, kind]);

  /* ------------------------------------------------------------ actions */

  function begin() {
    dispatch({
      type: "begin",
      startedAt: new Date().toISOString(),
      secondsRemaining:
        session.config?.timeLimitMinutes === null || session.config === null
          ? null
          : session.config.timeLimitMinutes * 60,
    });
    track({ event_name: "assessment_started", feature: "assessment", properties: { kind } });
  }

  function cancelGeneration() {
    if (session.jobId) void getAssessmentApi().cancelGeneration(session.jobId);
    requestAbandonCleanup({
      jobId: session.jobId ?? undefined,
      attemptId: session.attemptId ?? undefined,
    });
    dispatch({ type: "cancel_generation" });
    track({
      event_name: "assessment_generation_cancelled",
      feature: "assessment",
      properties: { kind },
    });
  }

  function quit() {
    requestAbandonCleanup({
      jobId: session.jobId ?? undefined,
      attemptId: session.attemptId ?? undefined,
    });
    dispatch({ type: "abandon" });
    track({
      event_name: "assessment_abandoned",
      feature: "assessment",
      properties: { kind, reason: "quit" },
    });
  }

  /* --------------------------------------------------------------- view */

  const title = t(KIND_TITLE_KEY[kind]);

  if (session.state === "in_progress" || session.state === "submitting") {
    return (
      <AssessmentRunner
        session={session}
        title={title}
        onAnswer={(answer) => {
          dispatch({ type: "answer", answer });
          track({
            event_name: "question_answered",
            feature: "assessment",
            properties: { kind, index: session.currentIndex },
          });
        }}
        onToggleMark={(questionId) => {
          dispatch({ type: "toggle_review", questionId });
          track({
            event_name: "question_marked_for_review",
            feature: "assessment",
            properties: { kind },
          });
        }}
        onGoTo={(index) => {
          if (!isAnswered(session.answers[session.questions[session.currentIndex]?.id ?? ""])) {
            track({ event_name: "question_skipped", feature: "assessment", properties: { kind } });
          }
          dispatch({ type: "goto", index });
        }}
        onSubmit={() => dispatch({ type: "submit" })}
        onQuit={quit}
      />
    );
  }

  if (session.state === "submitted" || session.state === "grading") {
    return (
      <div className="space-y-3">
        <PreviewDataNotice />
        <GradingPending status="grading" onViewLater={() => dispatch({ type: "reset" })} />
      </div>
    );
  }

  if (session.state === "grading_failed") {
    return (
      <div className="space-y-3">
        <GradingPending
          status="grading_failed"
          onViewLater={() => dispatch({ type: "reset" })}
          onRetry={() => dispatch({ type: "reset" })}
        />
        {failure && <BackendUnavailableNotice />}
      </div>
    );
  }

  if (session.state === "graded" && session.result) {
    return (
      <div className="space-y-3">
        <PreviewDataNotice />
        <AssessmentResults
          result={session.result}
          onClose={() => dispatch({ type: "reset" })}
          onPracticeIncorrect={undefined}
          onQuizWeakTopics={undefined}
          onAddToStudyPlan={undefined}
        />
      </div>
    );
  }

  if (session.state === "generating" || session.state === "generation_requested") {
    return (
      <div className="space-y-3">
        <PreviewDataNotice />
        <GenerationWaitingRoom phase={session.phase} onCancel={cancelGeneration} />
      </div>
    );
  }

  if (session.state === "ready" && session.config) {
    return (
      <div className="space-y-3">
        <PreviewDataNotice />
        <AssessmentReadyScreen
          config={session.config}
          questionCount={session.questions.length}
          onBegin={begin}
          onDiscard={cancelGeneration}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PreviewDataNotice />
      {(session.state === "generation_failed" || failure) && (
        <BackendUnavailableNotice onRetry={() => void startGeneration()} />
      )}
      {session.state === "abandoned" && (
        <p role="status" className="text-[14px] text-muted-foreground">
          {t("assessment.quitConfirm.recorded")}
        </p>
      )}
      <p className="text-[14.5px] text-muted-foreground">{t(KIND_INTRO_KEY[kind])}</p>
      {kind === "quick_check" ? (
        <QuickCheckSetup
          config={config}
          onChange={setConfig}
          onGenerate={() => void startGeneration()}
          materials={context.materials}
          topics={context.topics}
        />
      ) : (
      <AssessmentSetup
        config={config}
        onChange={setConfig}
        onGenerate={() => void startGeneration()}
        materials={context.materials}
        topics={context.topics}
        learningGoals={context.learningGoals}
      />
      )}
    </div>
  );
}
