/** Alim application component for study, planning, profile, or navigation workflows. */
import { Link } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import {
  ArrowRight,
  ChevronDown,
  Minus,
  Plus,
  TrendingDown,
  TrendingUp,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { AssessmentActions } from "@/components/app/AssessmentActions";
import { AssessmentDialog } from "@/components/app/AssessmentDialog";
import { FailingBadge } from "@/components/app/Badges";
import { AverageWithRounded } from "@/components/app/GradeDisplay";
import { TranscriptImportDialog } from "@/components/app/TranscriptImportDialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import { ASSESSMENT_TYPE_LABEL_KEY, GRADE_SOURCE_LABEL_KEY } from "@/lib/store/types";
import { gradeOf, summariseSubjectView } from "@/lib/grade-math";
import { isFailing } from "@/lib/mock/grades";
import type { Subject } from "@/lib/mock/subjects";
import { SCHOOL_SUBJECTS, TREND_LABEL_KEY, getSubject } from "@/lib/mock/subjects";
import { useAppData } from "@/lib/store/app-data";
import { cn } from "@/lib/utils";

function TrendBadge({ trend, change }: { trend: string | null; change: number | null }) {
  const { t } = useI18n();
  if (!trend) return null;
  const map: Record<string, { icon: Icons.LucideIcon; className: string }> = {
    Improving: { icon: TrendingUp, className: "text-chart-3" },
    Stable: { icon: Minus, className: "text-muted-foreground" },
    "Needs focus": { icon: TrendingDown, className: "text-chart-4" },
  };
  const entry = map[trend] ?? map["Stable"]!;
  const Icon = entry.icon;
  const labelKey = TREND_LABEL_KEY[trend as keyof typeof TREND_LABEL_KEY];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-[13px] font-medium", entry.className)}
    >
      <Icon className="h-4 w-4" />
      {labelKey ? t(labelKey) : trend}
      {change !== null && Math.abs(change) >= 0.05 && (
        <span className="tabular">
          ({change >= 0 ? "+" : ""}
          {change.toFixed(1)})
        </span>
      )}
    </span>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${100 - ((v - 1) / 5) * 100}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-8 w-20" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function SubjectCard({ subject }: { subject: Subject }) {
  const { t, formatDate } = useI18n();
  const [open, setOpen] = useState(false);
  const { assessments, materials, events } = useAppData();
  const Icon =
    (Icons as unknown as Record<string, Icons.LucideIcon>)[subject.icon] ?? Icons.BookOpen;
  const grades = summariseSubjectView(assessments, subject);
  const slugs = subject.components?.length ? subject.components : [subject.slug];
  const failing = isFailing(grades.exactAverage);
  const fileCount = materials.filter((m) => slugs.includes(m.subjectSlug) && !m.archived).length;
  const nextExam = events
    .filter((e) => e.subjectSlug && slugs.includes(e.subjectSlug) && e.category === "School exam")
    .map((e) => e.date)
    .sort()
    .find((d) => d >= new Date().toISOString().slice(0, 10));

  return (
    <article
      className={cn(
        "app-card app-card-interactive group relative flex flex-col gap-4 p-5",
        failing && "border-warning/40",
      )}
    >
      <Link
        to="/school/$subject"
        params={{ subject: subject.slug }}
        className="absolute inset-0 z-0 rounded-[inherit]"
        aria-label={t("school.card.openAriaLabel", { name: subject.name })}
      />

      <div className="pointer-events-none relative z-10 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${subject.accent}1A`, color: subject.accent }}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-[16.5px] font-semibold tracking-tight">
                  {subject.name}
                </p>
              </div>
              <p className="text-[13px] text-muted-foreground">
                {subject.subtitle ??
                  `${subject.language}${subject.languageBadge ? ` · ${subject.languageBadge}` : ""}`}
              </p>
            </div>
          </div>
          <ArrowRight className="mt-3 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
        </div>

        {grades.exactAverage === null ? (
          <div className="rounded-[18px] bg-surface-2 p-4">
            <p className="text-[14px] text-muted-foreground">{t("school.card.noTests")}</p>
            <div className="pointer-events-auto mt-3 flex flex-wrap gap-2">
              <AssessmentDialog
                subjectSlug={subject.slug}
                trigger={
                  <Button size="sm" variant="secondary">
                    <Plus className="h-4 w-4" />
                    {t("school.addTest")}
                  </Button>
                }
              />
              <TranscriptImportDialog
                subjectSlug={subject.slug}
                trigger={
                  <Button size="sm" variant="ghost">
                    <Upload className="h-4 w-4" />
                    {t("school.uploadTranscript")}
                  </Button>
                }
              />
            </div>
          </div>
        ) : (
          <div className="rounded-[18px] bg-surface-2 p-4">
            {subject.components?.length ? (
              <p className="text-[12.5px] text-muted-foreground">
                {t("school.card.combinedAverage")}
              </p>
            ) : null}
            <AverageWithRounded exact={grades.exactAverage} rounded={grades.roundedAverage} />
            {grades.parts.length > 0 && (
              <dl className="mt-3 space-y-1.5 border-t border-border pt-3">
                {grades.parts.map((part) => (
                  <div key={part.slug} className="flex items-center justify-between gap-3">
                    <dt className="truncate text-[13.5px] text-muted-foreground">
                      {getSubject(part.slug)?.name ?? part.slug}
                    </dt>
                    <dd
                      className={cn(
                        "tabular text-[14px] font-semibold",
                        isFailing(part.summary.exactAverage) && "text-warning",
                      )}
                    >
                      {part.summary.exactAverage === null
                        ? "—"
                        : part.summary.exactAverage.toFixed(2)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12.5px] text-muted-foreground">
                  {t("school.card.lastThreeTests")}
                </p>
                <p className="tabular text-[14px] font-medium">
                  {grades.lastThree.map((g, i) => (
                    <span key={`${g}-${i}`}>
                      <span className={cn(isFailing(g) && "text-warning")}>{g.toFixed(1)}</span>
                      {i < grades.lastThree.length - 1 && <span> → </span>}
                    </span>
                  ))}
                </p>
              </div>
              <Sparkline values={grades.lastThree} />
            </div>
          </div>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
          <div>
            <dt className="text-muted-foreground">{t("school.card.latestTest")}</dt>
            <dd
              className={cn(
                "tabular font-semibold",
                isFailing(grades.latest ? gradeOf(grades.latest) : null) && "text-warning",
              )}
            >
              {grades.latest ? (gradeOf(grades.latest)?.toFixed(1) ?? "—") : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("school.card.testsAdded")}</dt>
            <dd className="tabular font-semibold">{grades.tests.length}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("school.card.nextExam")}</dt>
            <dd className="font-medium">
              {nextExam ? formatDate(nextExam) : t("school.card.nonePlanned")}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("school.card.materials")}</dt>
            <dd className="font-medium">
              {fileCount === 0
                ? t("school.card.noneAdded")
                : fileCount === 1
                  ? t("school.card.fileCount", { count: fileCount })
                  : t("school.card.filesCount", { count: fileCount })}
            </dd>
          </div>
        </dl>

        <TrendBadge trend={grades.trend} change={grades.monthlyChange} />

        {grades.tests.length > 0 && (
          <div className="pointer-events-auto border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-2 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("school.card.gradeHistory", { count: grades.tests.length })}
              <ChevronDown
                className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")}
              />
            </button>

            {open && (
              <div className="mt-3 space-y-2">
                {grades.tests.map((test) => {
                  const grade = gradeOf(test);
                  return (
                    <div key={test.id} className="rounded-[14px] bg-surface-2 px-3.5 py-3">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium">{test.title}</p>
                          <p className="text-[12.5px] text-muted-foreground">
                            {formatDate(test.date)} · {t(ASSESSMENT_TYPE_LABEL_KEY[test.type])}
                          </p>
                          <p className="text-[12.5px] text-muted-foreground">
                            {t(GRADE_SOURCE_LABEL_KEY[test.source])}
                          </p>
                          {!test.includeInStats && (
                            <p className="mt-1 text-[12px] text-muted-foreground">
                              {t("school.card.notIncludedInStats")}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p
                            className={cn(
                              "tabular text-[15px] font-semibold",
                              isFailing(grade) && "text-warning",
                            )}
                          >
                            {grade === null ? "—" : grade.toFixed(1)}
                          </p>
                          <p className="tabular text-[12.5px] text-muted-foreground">
                            {test.points === null ? "—" : `${test.points} / ${test.maxPoints}`}
                          </p>
                          {isFailing(grade) && (
                            <div className="mt-1.5 flex justify-end">
                              <FailingBadge label={t("school.failingLabel")} />
                            </div>
                          )}
                        </div>
                        <AssessmentActions record={test} />
                      </div>
                    </div>
                  );
                })}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <AssessmentDialog
                    subjectSlug={subject.slug}
                    trigger={
                      <Button size="sm" variant="secondary">
                        <Plus className="h-4 w-4" />
                        {t("school.addTest")}
                      </Button>
                    }
                  />
                  <Link
                    to="/school/$subject"
                    params={{ subject: subject.slug }}
                    className="inline-flex items-center gap-1.5 text-[14px] font-medium text-primary hover:underline"
                  >
                    {t("school.card.viewFullStatistics", { name: subject.name })}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function SubjectGrid({ subjects = SCHOOL_SUBJECTS }: { subjects?: Subject[] }) {
  const { t } = useI18n();
  if (subjects.length === 0) {
    return (
      <div className="app-card p-8 text-center">
        <p className="text-[15px] font-medium">{t("school.grid.emptyHeading")}</p>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          {t("school.grid.emptyDescription")}
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      {subjects.map((subject) => (
        <SubjectCard key={subject.slug} subject={subject} />
      ))}
    </div>
  );
}
