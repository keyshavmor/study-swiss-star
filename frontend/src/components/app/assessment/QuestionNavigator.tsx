/** Question navigator showing answered, unanswered, marked and current states. */
import { useI18n } from "@/lib/i18n/provider";
import { isAnswered, type PublicQuestion, type StudentAnswer } from "@/lib/assessment/types";
import { cn } from "@/lib/utils";

export function QuestionNavigator({
  questions,
  answers,
  markedForReview,
  currentIndex,
  onSelect,
}: {
  questions: PublicQuestion[];
  answers: Record<string, StudentAnswer>;
  markedForReview: string[];
  currentIndex: number;
  onSelect: (index: number) => void;
}) {
  const { t } = useI18n();
  return (
    <nav aria-label={t("assessment.navigator.aria")} className="space-y-2.5">
      <p className="text-[13px] font-medium text-muted-foreground">
        {t("assessment.navigator.heading")}
      </p>
      <ol className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 xl:grid-cols-5">
        {questions.map((question, index) => {
          const answered = isAnswered(answers[question.id]);
          const marked = markedForReview.includes(question.id);
          const current = index === currentIndex;
          const stateLabel = marked
            ? t("assessment.navigator.marked")
            : answered
              ? t("assessment.navigator.answered")
              : t("assessment.navigator.unanswered");
          return (
            <li key={question.id}>
              <button
                type="button"
                onClick={() => onSelect(index)}
                aria-current={current ? "true" : undefined}
                aria-label={`${t("assessment.navigator.questionN", { index: index + 1 })} — ${stateLabel}`}
                className={cn(
                  "tabular relative h-9 w-full rounded-[10px] border text-[13.5px] font-semibold transition-colors",
                  answered
                    ? "border-transparent bg-thread-active text-foreground"
                    : "border-border bg-surface text-muted-foreground",
                  current && "ring-2 ring-ring",
                )}
              >
                {index + 1}
                {marked && (
                  <span
                    aria-hidden="true"
                    className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-warning"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <ul className="space-y-1 text-[12.5px] text-muted-foreground">
        <li>
          <span
            aria-hidden="true"
            className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[4px] bg-thread-active align-middle"
          />
          {t("assessment.navigator.answered")}
        </li>
        <li>
          <span
            aria-hidden="true"
            className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[4px] border border-border align-middle"
          />
          {t("assessment.navigator.unanswered")}
        </li>
        <li>
          <span
            aria-hidden="true"
            className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-warning align-middle"
          />
          {t("assessment.navigator.marked")}
        </li>
      </ul>
    </nav>
  );
}
