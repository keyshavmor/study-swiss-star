/**
 * Knowledge Profile: the mastery foundation that consumes graded practice,
 * quiz and mock-exam outcomes.
 *
 * Mastery is never inferred from a single question, uncertainty is shown
 * explicitly, and AI practice mastery is kept separate from official school
 * grades.
 */
import { useI18n } from "@/lib/i18n/provider";
import { MIN_OBSERVATIONS_FOR_MASTERY, type MasteryEntry } from "@/lib/assessment/types";
import { cn } from "@/lib/utils";

const DIMENSION_LABEL_KEY = {
  subject: "assessment.knowledge.dimension.subject",
  topic: "assessment.knowledge.dimension.topic",
  subtopic: "assessment.knowledge.dimension.subtopic",
  learning_goal: "assessment.knowledge.dimension.learningGoal",
  question_type: "assessment.knowledge.dimension.questionType",
  difficulty: "assessment.knowledge.dimension.difficulty",
} as const;

const CONFIDENCE_LABEL_KEY = {
  insufficient: "assessment.knowledge.confidence.insufficient",
  low: "assessment.knowledge.confidence.low",
  medium: "assessment.knowledge.confidence.medium",
  high: "assessment.knowledge.confidence.high",
} as const;

export function KnowledgeProfile({
  entries,
  subjectName,
}: {
  entries: MasteryEntry[];
  subjectName: string;
}) {
  const { t } = useI18n();
  const dimensions = Object.keys(DIMENSION_LABEL_KEY) as Array<MasteryEntry["dimension"]>;

  return (
    <div className="space-y-4">
      <p className="text-[14.5px] text-muted-foreground">
        {t("assessment.knowledge.body", { name: subjectName })}
      </p>
      <p className="rounded-[14px] bg-surface-2 px-3.5 py-2.5 text-[13px] text-muted-foreground">
        {t("assessment.knowledge.separateNotice")}
      </p>

      {entries.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-border px-4 py-8 text-center">
          <p className="text-[15px] font-medium">{t("assessment.knowledge.noData")}</p>
          <p className="mt-1 text-[14px] text-muted-foreground">
            {t("assessment.knowledge.noDataBody", { count: MIN_OBSERVATIONS_FOR_MASTERY })}
          </p>
        </div>
      ) : (
        dimensions.map((dimension) => {
          const group = entries.filter((entry) => entry.dimension === dimension);
          if (group.length === 0) return null;
          return (
            <section key={dimension} className="rounded-[16px] border border-border bg-surface p-4">
              <h3 className="text-[15px] font-semibold">{t(DIMENSION_LABEL_KEY[dimension])}</h3>
              <ul className="mt-3 space-y-2.5">
                {group.map((entry) => (
                  <li key={entry.id}>
                    <div className="flex items-center justify-between gap-3 text-[14px]">
                      <span className="min-w-0 truncate">{entry.label}</span>
                      <span className="tabular text-muted-foreground">
                        {entry.mastery === null || entry.confidence === "insufficient"
                          ? t("assessment.knowledge.notEnough")
                          : `${Math.round(entry.mastery * 100)}%`}
                      </span>
                    </div>
                    <div
                      className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
                      role="presentation"
                    >
                      <div
                        className={cn(
                          "h-full rounded-full",
                          entry.confidence === "insufficient" ? "bg-border" : "bg-primary",
                        )}
                        style={{ width: `${Math.round((entry.mastery ?? 0) * 100)}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                      {t("assessment.knowledge.observations", { count: entry.observations })} ·{" "}
                      {t(CONFIDENCE_LABEL_KEY[entry.confidence])}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
