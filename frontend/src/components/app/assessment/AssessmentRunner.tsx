/**
 * Focused assessment runner.
 *
 * Mock Exam presentation is deliberately quiet: no tutor, no AI help, no
 * correctness, no hints, no celebration effects. Practice may show immediate
 * feedback only when the configuration asks for it.
 */
import { ChevronLeft, ChevronRight, Eye, EyeOff, ListChecks, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import { isAnswered, type PublicQuestion, type StudentAnswer } from "@/lib/assessment/types";
import type { AssessmentSession } from "@/lib/assessment/lifecycle";
import { cn } from "@/lib/utils";
import { QuestionNavigator } from "./QuestionNavigator";
import { QuestionRenderer } from "./QuestionRenderer";
import { QuitAssessmentDialog, SubmissionReview } from "./SubmissionReview";

function formatClock(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function AssessmentRunner({
  session,
  title,
  onAnswer,
  onToggleMark,
  onGoTo,
  onSubmit,
  onQuit,
}: {
  session: AssessmentSession;
  title: string;
  onAnswer: (answer: StudentAnswer) => void;
  onToggleMark: (questionId: string) => void;
  onGoTo: (index: number) => void;
  onSubmit: () => void;
  onQuit: () => void;
}) {
  const { t } = useI18n();
  const [timerVisible, setTimerVisible] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const quiet = session.config?.kind === "mock_exam";
  const questions: PublicQuestion[] = session.questions;
  const question = questions[session.currentIndex];
  const locked = session.state !== "in_progress";
  const answeredIds = questions.filter((q) => isAnswered(session.answers[q.id])).map((q) => q.id);

  // Announce the last minute for screen-reader users.
  const [announced, setAnnounced] = useState(false);
  useEffect(() => {
    if (session.secondsRemaining !== null && session.secondsRemaining <= 60 && !announced) {
      setAnnounced(true);
    }
  }, [session.secondsRemaining, announced]);

  if (!question) return null;

  return (
    <div className={cn("space-y-4", quiet && "assessment-quiet")}>
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-border bg-surface px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">{title}</p>
          <p className="text-[13px] text-muted-foreground">
            {session.config?.subjectName} ·{" "}
            {t("assessment.runner.progress", {
              index: session.currentIndex + 1,
              total: questions.length,
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {session.secondsRemaining !== null && (
            <>
              <p
                className="tabular text-[16px] font-semibold"
                aria-live={announced ? "polite" : "off"}
                aria-label={t("assessment.runner.timeRemaining")}
              >
                {timerVisible ? formatClock(session.secondsRemaining) : "—"}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={!timerVisible}
                aria-label={
                  timerVisible ? t("assessment.runner.hideTimer") : t("assessment.runner.showTimer")
                }
                onClick={() => setTimerVisible((visible) => !visible)}
              >
                {timerVisible ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            </>
          )}
          <Button type="button" variant="secondary" size="sm" onClick={() => setReviewOpen(true)}>
            <ListChecks className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {t("assessment.runner.review")}
          </Button>
          <QuitAssessmentDialog
            onConfirm={onQuit}
            trigger={
              <Button type="button" variant="ghost" size="sm">
                <LogOut className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {t("assessment.quit")}
              </Button>
            }
          />
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_200px]">
        <section className="rounded-[18px] border border-border bg-surface p-5">
          <QuestionRenderer
            question={question}
            index={session.currentIndex}
            total={questions.length}
            answer={session.answers[question.id]}
            onChange={onAnswer}
            disabled={locked}
            quiet={quiet}
            marked={session.markedForReview.includes(question.id)}
            onToggleMark={() => onToggleMark(question.id)}
          />

          <div className="mt-6 flex items-center justify-between gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="secondary"
              disabled={session.currentIndex === 0}
              onClick={() => onGoTo(session.currentIndex - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
              {t("assessment.runner.previous")}
            </Button>
            {session.currentIndex === questions.length - 1 ? (
              <Button type="button" onClick={() => setReviewOpen(true)}>
                {t("assessment.runner.finish")}
              </Button>
            ) : (
              <Button type="button" onClick={() => onGoTo(session.currentIndex + 1)}>
                {t("assessment.runner.next")}
                <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </section>

        <aside className="rounded-[18px] border border-border bg-surface p-4 xl:sticky xl:top-24 xl:h-fit">
          <QuestionNavigator
            questions={questions}
            answers={session.answers}
            markedForReview={session.markedForReview}
            currentIndex={session.currentIndex}
            onSelect={onGoTo}
          />
        </aside>
      </div>

      <SubmissionReview
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        questions={questions}
        answeredIds={answeredIds}
        markedIds={session.markedForReview}
        onGoTo={onGoTo}
        onSubmit={onSubmit}
      />
    </div>
  );
}
