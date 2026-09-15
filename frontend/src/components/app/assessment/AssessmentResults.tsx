/** Analytical results and per-question review for a graded attempt. */
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import type { AssessmentResult, QuestionResult, StudentAnswer } from "@/lib/assessment/types";
import { cn } from "@/lib/utils";
import { ScientificContentRenderer } from "./ScientificContentRenderer";
import { AssessmentMediaView } from "./AssessmentMediaView";
import { DIFFICULTY_LABEL_KEY, QUESTION_TYPE_LABEL_KEY } from "./QuestionRenderer";

const CORRECTNESS_LABEL_KEY = {
  correct: "assessment.result.correct",
  partial: "assessment.result.partial",
  incorrect: "assessment.result.incorrect",
  unanswered: "assessment.result.unanswered",
  pending: "assessment.result.pending",
} as const;

export function AssessmentResults({
  result,
  onPracticeIncorrect,
  onQuizWeakTopics,
  onAddToStudyPlan,
  onClose,
}: {
  result: AssessmentResult;
  onPracticeIncorrect?: () => void;
  onQuizWeakTopics?: () => void;
  onAddToStudyPlan?: () => void;
  onClose?: () => void;
}) {
  const { t, formatDate } = useI18n();

  return (
    <div className="space-y-5">
      <section className="rounded-[18px] border border-border bg-surface p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[13px] text-muted-foreground">{t("assessment.result.score")}</p>
            <p className="tabular text-[30px] font-bold tracking-tight">
              {result.awardedPoints}
              <span className="text-[18px] text-muted-foreground">/{result.maxPoints}</span>
            </p>
            <p className="tabular text-[14px] text-muted-foreground">
              {t("assessment.result.percentage", { value: result.percentage })}
            </p>
          </div>
          <dl className="grid gap-3 text-right sm:grid-cols-2">
            <Meta
              label={t("assessment.result.swissGrade")}
              value={
                result.swissGrade === null
                  ? t("assessment.result.notSupplied")
                  : result.swissGrade.toFixed(1)
              }
            />
            <Meta
              label={t("assessment.result.timeTaken")}
              value={
                result.timeTakenSeconds === null
                  ? "—"
                  : t("assessment.result.minutes", {
                      count: Math.round(result.timeTakenSeconds / 60),
                    })
              }
            />
            <Meta label={t("assessment.result.subject")} value={result.subjectName} />
            <Meta
              label={t("assessment.result.difficulty")}
              value={t(DIFFICULTY_LABEL_KEY[result.difficulty])}
            />
          </dl>
        </div>

        <p className="mt-3 text-[13px] text-muted-foreground">
          {t("assessment.result.submittedAt", { date: formatDate(result.submittedAt.slice(0, 10)) })}
          {!result.includeInStats && ` · ${t("assessment.result.notInAverages")}`}
        </p>
      </section>

      {result.byQuestionType.length > 0 && (
        <section className="rounded-[18px] border border-border bg-surface p-5">
          <h3 className="text-[15px] font-semibold">{t("assessment.result.byType")}</h3>
          <ul className="mt-3 space-y-2">
            {result.byQuestionType.map((entry) => (
              <li key={entry.type} className="flex items-center justify-between gap-3 text-[14px]">
                <span>{t(QUESTION_TYPE_LABEL_KEY[entry.type])}</span>
                <span className="tabular font-medium">
                  {entry.awarded}/{entry.max}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(result.strengths.length > 0 || result.improvements.length > 0) && (
        <section className="grid gap-4 sm:grid-cols-2">
          <ListCard title={t("assessment.result.strengths")} items={result.strengths} />
          <ListCard title={t("assessment.result.improvements")} items={result.improvements} />
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-[15px] font-semibold">{t("assessment.result.review")}</h3>
        {result.questions.map((question, index) => {
          const questionResult = result.results.find((entry) => entry.questionId === question.id);
          const answer = result.answers.find((entry) => entry.questionId === question.id);
          return (
            <QuestionReview
              key={question.id}
              index={index}
              total={result.questions.length}
              question={question}
              answer={answer}
              result={questionResult}
            />
          );
        })}
      </section>

      <section className="flex flex-wrap gap-2">
        {onPracticeIncorrect && (
          <Button variant="secondary" onClick={onPracticeIncorrect}>
            {t("assessment.result.practiceIncorrect")}
          </Button>
        )}
        {onQuizWeakTopics && (
          <Button variant="secondary" onClick={onQuizWeakTopics}>
            {t("assessment.result.quizWeakTopics")}
          </Button>
        )}
        {onAddToStudyPlan && (
          <Button variant="secondary" onClick={onAddToStudyPlan}>
            {t("assessment.result.addToStudyPlan")}
          </Button>
        )}
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            {t("assessment.result.close")}
          </Button>
        )}
      </section>
    </div>
  );
}

function QuestionReview({
  question,
  answer,
  result,
  index,
  total,
}: {
  question: AssessmentResult["questions"][number];
  answer: StudentAnswer | undefined;
  result: QuestionResult | undefined;
  index: number;
  total: number;
}) {
  const { t } = useI18n();
  const correctness = result?.correctness ?? "pending";
  return (
    <article className="rounded-[18px] border border-border bg-surface p-5">
      <header className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted-foreground">
        <span className="font-semibold text-foreground">
          {t("assessment.question.counter", { index: index + 1, total })}
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[12.5px] font-medium",
            correctness === "correct" && "bg-success/15 text-success",
            correctness === "partial" && "bg-warning/15 text-warning",
            (correctness === "incorrect" || correctness === "unanswered") &&
              "bg-destructive/10 text-destructive",
            correctness === "pending" && "bg-surface-2",
          )}
        >
          {t(CORRECTNESS_LABEL_KEY[correctness])} ·{" "}
          {t("assessment.result.pointsAwarded", {
            awarded: result?.awardedPoints ?? 0,
            max: result?.maxPoints ?? question.points,
          })}
        </span>
      </header>

      <div className="mt-3 text-[15px]">
        <ScientificContentRenderer content={question.prompt} />
      </div>

      {question.media.map((media) => (
        <AssessmentMediaView key={media.id} media={media} />
      ))}

      <div className="mt-3 space-y-3 text-[14.5px]">
        <Block label={t("assessment.result.yourAnswer")}>
          <StudentAnswerView question={question} answer={answer} />
        </Block>
        {result?.modelAnswer && (
          <Block label={t("assessment.result.modelAnswer")}>
            <ScientificContentRenderer content={result.modelAnswer} />
          </Block>
        )}
        {result?.explanation && (
          <Block label={t("assessment.result.explanation")}>
            <ScientificContentRenderer content={result.explanation} />
          </Block>
        )}
        {result?.improvement && (
          <Block label={t("assessment.result.improvement")}>
            <ScientificContentRenderer content={result.improvement} />
          </Block>
        )}
        {result?.rubricFeedback && result.rubricFeedback.length > 0 && (
          <Block label={t("assessment.result.rubric")}>
            <ul className="space-y-1">
              {result.rubricFeedback.map((entry) => (
                <li key={entry.criterionId} className="flex justify-between gap-3">
                  <span>{entry.description}</span>
                  <span className="tabular font-medium">
                    {entry.awarded}/{entry.max}
                  </span>
                </li>
              ))}
            </ul>
          </Block>
        )}
        {result?.sources && result.sources.length > 0 && (
          <Block label={t("assessment.question.sources")}>
            <ul className="space-y-0.5 text-[13.5px] text-muted-foreground">
              {result.sources.map((source) => (
                <li key={source.id}>{source.label}</li>
              ))}
            </ul>
          </Block>
        )}
      </div>
    </article>
  );
}

function StudentAnswerView({
  question,
  answer,
}: {
  question: AssessmentResult["questions"][number];
  answer: StudentAnswer | undefined;
}) {
  const { t } = useI18n();
  if (!answer) return <p className="text-muted-foreground">{t("assessment.result.unanswered")}</p>;
  switch (answer.type) {
    case "multiple_choice": {
      if (question.type !== "multiple_choice") return null;
      const chosen = question.options.filter((option) =>
        answer.selectedOptionIds.includes(option.id),
      );
      if (chosen.length === 0)
        return <p className="text-muted-foreground">{t("assessment.result.unanswered")}</p>;
      return (
        <ul className="space-y-1">
          {chosen.map((option) => (
            <li key={option.id}>
              <ScientificContentRenderer content={option.content} inline />
            </li>
          ))}
        </ul>
      );
    }
    case "true_false":
      return (
        <p>
          {answer.value === null
            ? t("assessment.result.unanswered")
            : answer.value
              ? t("assessment.trueFalse.true")
              : t("assessment.trueFalse.false")}
        </p>
      );
    case "short_answer":
    case "essay":
      return <p className="whitespace-pre-wrap">{answer.text}</p>;
    case "matching":
      return (
        <ul className="space-y-1">
          {answer.pairs.map((pair) => (
            <li key={`${pair.leftId}-${pair.rightId}`}>
              {pair.leftId} → {pair.rightId}
            </li>
          ))}
        </ul>
      );
    case "calculation":
      return (
        <div className="space-y-1">
          <ScientificContentRenderer content={[{ kind: "math", latex: answer.latex }]} inline />
          {answer.unit && <p className="text-[13.5px] text-muted-foreground">{answer.unit}</p>}
          {answer.workings && <p className="whitespace-pre-wrap">{answer.workings}</p>}
        </div>
      );
  }
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] bg-surface-2 p-3.5">
      <p className="mb-1 text-[12.5px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  const { t } = useI18n();
  return (
    <div className="rounded-[18px] border border-border bg-surface p-5">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-[14px] text-muted-foreground">{t("assessment.result.noneYet")}</p>
      ) : (
        <ul className="mt-2 space-y-1 text-[14px]">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12.5px] text-muted-foreground">{label}</dt>
      <dd className="tabular text-[15px] font-semibold">{value}</dd>
    </div>
  );
}
