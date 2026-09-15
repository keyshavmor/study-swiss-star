/** Renders one validated question: stimulus, prompt, media, sources and input. */
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import type { PublicQuestion, StudentAnswer } from "@/lib/assessment/types";
import { cn } from "@/lib/utils";
import { AnswerEditor } from "./AnswerInputs";
import { AssessmentMediaView } from "./AssessmentMediaView";
import { ScientificContentRenderer } from "./ScientificContentRenderer";

export const QUESTION_TYPE_LABEL_KEY = {
  multiple_choice: "assessment.type.multipleChoice",
  true_false: "assessment.type.trueFalse",
  short_answer: "assessment.type.shortAnswer",
  matching: "assessment.type.matching",
  essay: "assessment.type.essay",
  calculation: "assessment.type.calculation",
} as const;

export const DIFFICULTY_LABEL_KEY = {
  easy: "assessment.difficulty.easy",
  medium: "assessment.difficulty.medium",
  advanced: "assessment.difficulty.advanced",
  very_advanced: "assessment.difficulty.veryAdvanced",
} as const;

export function QuestionRenderer({
  question,
  index,
  total,
  answer,
  onChange,
  disabled,
  marked,
  onToggleMark,
  quiet,
}: {
  question: PublicQuestion;
  index: number;
  total: number;
  answer: StudentAnswer | undefined;
  onChange: (answer: StudentAnswer) => void;
  disabled?: boolean | undefined;
  marked?: boolean | undefined;
  onToggleMark?: () => void | undefined;
  /** Mock Exam presentation: no decorative extras. */
  quiet?: boolean | undefined;
}) {
  const { t } = useI18n();
  const mediaFor = (mediaId: string, description?: string) => {
    const media = question.media.find((entry) => entry.id === mediaId);
    if (!media) return null;
    return <AssessmentMediaView media={media} description={description} />;
  };

  return (
    <article className="space-y-4" aria-label={t("assessment.question.aria", { index: index + 1, total })}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
          <span className="font-semibold text-foreground">
            {t("assessment.question.counter", { index: index + 1, total })}
          </span>
          {!quiet && <span>· {t(QUESTION_TYPE_LABEL_KEY[question.type])}</span>}
          <span>· {t("assessment.question.points", { count: question.points })}</span>
          {question.accessibility?.screenReaderHint && (
            <span className="sr-only">{question.accessibility.screenReaderHint}</span>
          )}
        </div>
        {onToggleMark && (
          <Button
            type="button"
            variant={marked ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={marked}
            onClick={onToggleMark}
            disabled={disabled}
          >
            <Flag className={cn("mr-1.5 h-4 w-4", marked && "text-warning")} aria-hidden="true" />
            {t("assessment.markForReview")}
          </Button>
        )}
      </header>

      {question.stimulus && (
        <div className="rounded-[16px] border border-border bg-surface-2 p-4">
          <ScientificContentRenderer content={question.stimulus} renderMedia={mediaFor} />
        </div>
      )}

      <div className="text-[15.5px] leading-[1.65]">
        <ScientificContentRenderer content={question.prompt} renderMedia={mediaFor} />
      </div>

      {question.media
        .filter((media) => media.purpose === "stimulus" || media.purpose === "question_illustration")
        .map((media) => (
          <AssessmentMediaView key={media.id} media={media} />
        ))}

      <AnswerEditor question={question} answer={answer} onChange={onChange} disabled={disabled} />

      {!quiet && question.sources.length > 0 && (
        <footer className="border-t border-border pt-2.5 text-[13px] text-muted-foreground">
          <p className="font-medium">{t("assessment.question.sources")}</p>
          <ul className="mt-1 space-y-0.5">
            {question.sources.map((source) => (
              <li key={source.id}>
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline underline-offset-2"
                  >
                    {source.label}
                  </a>
                ) : (
                  source.label
                )}
                {source.publisher ? ` · ${source.publisher}` : ""}
                {source.page ? ` · ${t("assessment.question.page", { page: source.page })}` : ""}
              </li>
            ))}
          </ul>
        </footer>
      )}
    </article>
  );
}
