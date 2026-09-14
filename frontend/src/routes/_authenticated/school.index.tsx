/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Plus, TriangleAlert, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/messages";
import { AcademicYearSelector } from "@/components/app/AcademicYearSelector";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { PageNav } from "@/components/app/Breadcrumbs";
import { AssessmentDialog } from "@/components/app/AssessmentDialog";
import { FailingBadge } from "@/components/app/Badges";
import { RoundingInfo } from "@/components/app/GradeDisplay";
import { EmptyState } from "@/components/app/States";
import { StatsOverviewPanel } from "@/components/app/StatsOverviewPanel";
import { SubjectGrid } from "@/components/app/SubjectCard";
import { TranscriptImportDialog } from "@/components/app/TranscriptImportDialog";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAcademicYear } from "@/lib/store/academic-year";
import { summariseSubjectView, summariseYear } from "@/lib/grade-math";
import {
  PASSING_THRESHOLD,
  ROUNDING_EXAMPLES,
  formatHalf,
  isFailing,
  roundToHalf,
} from "@/lib/mock/grades";
import { SCHOOL_SUBJECTS } from "@/lib/mock/subjects";
import { useAppData } from "@/lib/store/app-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/school/")({
  head: () => ({
    meta: [
      { title: "School — Alim's Study Assistant" },
      {
        name: "description",
        content:
          "All subjects with exact and rounded averages, editable grade history and the yearly average breakdown.",
      },
      { property: "og:title", content: "School — Alim's Study Assistant" },
      {
        property: "og:description",
        content: "Subject averages, editable grade history and yearly average breakdown.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SchoolPage,
});

type SortKey = "name" | "average-desc" | "average-asc" | "recent";
type FilterKey = "all" | "failing" | "with-grades" | "no-grades";

const SORT_KEYS: { value: SortKey; key: TranslationKey }[] = [
  { value: "name", key: "school.sort.name" },
  { value: "average-desc", key: "school.sort.averageDesc" },
  { value: "average-asc", key: "school.sort.averageAsc" },
  { value: "recent", key: "school.sort.recent" },
];

const FILTER_KEYS: { value: FilterKey; key: TranslationKey }[] = [
  { value: "all", key: "school.filter.all" },
  { value: "failing", key: "school.filter.failing" },
  { value: "with-grades", key: "school.filter.withGrades" },
  { value: "no-grades", key: "school.filter.noGrades" },
];

function SchoolPage() {
  const { t } = useI18n();
  const { assessments } = useAppData();
  const { yearId, year } = useAcademicYear();
  const [sort, setSort] = useState<SortKey>("name");
  const [filter, setFilter] = useState<FilterKey>("all");

  const yearTests = useMemo(
    () => assessments.filter((a) => a.yearId === yearId),
    [assessments, yearId],
  );

  const rows = useMemo(
    () => SCHOOL_SUBJECTS.map((s) => ({ subject: s, grades: summariseSubjectView(yearTests, s) })),
    [yearTests],
  );
  const included = rows.filter((row) => row.grades.exactAverage !== null);
  const failingSubjects = included.filter((row) => isFailing(row.grades.exactAverage));
  const summary = useMemo(() => summariseYear(yearTests, SCHOOL_SUBJECTS), [yearTests]);

  const visibleSubjects = useMemo(() => {
    const filtered = rows.filter(({ grades }) => {
      if (filter === "failing") return isFailing(grades.exactAverage);
      if (filter === "with-grades") return grades.tests.length > 0;
      if (filter === "no-grades") return grades.tests.length === 0;
      return true;
    });
    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case "average-desc":
          return (b.grades.exactAverage ?? -1) - (a.grades.exactAverage ?? -1);
        case "average-asc":
          return (a.grades.exactAverage ?? 99) - (b.grades.exactAverage ?? 99);
        case "recent":
          return (
            (b.grades.latest?.date ?? "").localeCompare(a.grades.latest?.date ?? "") ||
            a.subject.name.localeCompare(b.subject.name)
          );
        default:
          return a.subject.name.localeCompare(b.subject.name);
      }
    });
    return sorted.map((row) => row.subject);
  }, [rows, sort, filter]);

  const exactYear = summary.exactYearAverage;

  return (
    <AppShell wide>
      <PageNav
        back={{ to: "/home", label: t("nav.home") }}
        crumbs={[{ label: t("nav.home"), to: "/home" }, { label: t("nav.school") }]}
      />
      <PageHeading
        title={t("school.title")}
        description={t("school.description", {
          label: year.label,
          gradeLevel: year.gradeLevel,
          count: SCHOOL_SUBJECTS.length,
        })}
        action={
          <div className="flex gap-2">
            <AssessmentDialog
              trigger={
                <Button className="hidden sm:inline-flex">
                  <Plus className="h-4 w-4" />
                  {t("school.addTest")}
                </Button>
              }
            />
            <TranscriptImportDialog
              trigger={
                <Button variant="secondary" className="hidden sm:inline-flex">
                  <Upload className="h-4 w-4" />
                  {t("school.uploadTranscript")}
                </Button>
              }
            />
          </div>
        }
      />

      <div className="mb-5">
        <AcademicYearSelector />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground">{t("school.sortBy")}</span>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-10 w-[230px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_KEYS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {t(o.key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground">{t("school.show")}</span>
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
            <SelectTrigger className="h-10 w-[210px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTER_KEYS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {t(o.key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-[13px] text-muted-foreground">
          {t("school.subjectsCount", {
            visible: visibleSubjects.length,
            total: SCHOOL_SUBJECTS.length,
          })}
        </span>
      </div>

      {failingSubjects.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-[18px] bg-warning-soft px-4 py-3.5 text-[14px] text-warning">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          <span>
            {t(
              failingSubjects.length === 1
                ? "school.failingBanner.one"
                : "school.failingBanner.many",
              {
                count: failingSubjects.length,
                threshold: PASSING_THRESHOLD.toFixed(1),
                subjects: failingSubjects.map((row) => row.subject.name).join(", "),
              },
            )}
          </span>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <SubjectGrid subjects={visibleSubjects} />

          <section className="app-card mt-6 p-5">
            <h2 className="text-[18px] font-semibold tracking-tight">
              {t("school.yearAverage.title")}
            </h2>
            <p className="mt-1 text-[13.5px] text-muted-foreground">
              {t("school.yearAverage.description", { year: year.label })}
            </p>

            {exactYear === null ? (
              <EmptyState
                className="mt-4 border-0 bg-surface-2"
                heading={t("school.emptyState.heading")}
                description={t("school.emptyState.description")}
                action={
                  <AssessmentDialog
                    trigger={
                      <Button>
                        <Plus className="h-4 w-4" />
                        {t("school.addTest")}
                      </Button>
                    }
                  />
                }
              />
            ) : (
              <>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <Metric
                    label={t("school.metric.exactAverage")}
                    value={exactYear.toFixed(2)}
                    failing={isFailing(exactYear)}
                  />
                  <Metric
                    label={t("school.metric.roundedAverage")}
                    value={formatHalf(roundToHalf(exactYear))}
                    muted
                    info
                    failing={isFailing(roundToHalf(exactYear))}
                  />
                  <Metric
                    label={t("school.metric.testsAdded")}
                    value={String(summary.totalTests)}
                  />
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left text-[14px]">
                    <thead className="text-[12.5px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="pb-2 font-medium">{t("school.table.subject")}</th>
                        <th className="pb-2 text-right font-medium">{t("school.table.exact")}</th>
                        <th className="pb-2 text-right font-medium">{t("school.table.rounded")}</th>
                        <th className="pb-2 text-right font-medium">{t("school.table.tests")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {included.map(({ subject, grades }) => (
                        <tr key={subject.slug} className="border-t border-border">
                          <td className="py-2.5">
                            <span className="inline-flex items-center gap-2">
                              {subject.name}
                              {isFailing(grades.exactAverage) && (
                                <FailingBadge label={t("school.failingLabel")} />
                              )}
                            </span>
                          </td>
                          <td
                            className={cn(
                              "tabular py-2.5 text-right font-medium",
                              isFailing(grades.exactAverage) && "text-warning",
                            )}
                          >
                            {grades.exactAverage!.toFixed(2)}
                          </td>
                          <td
                            className={cn(
                              "tabular py-2.5 text-right font-medium",
                              isFailing(grades.roundedAverage)
                                ? "text-warning"
                                : "text-grade-muted",
                            )}
                          >
                            {formatHalf(grades.roundedAverage!)}
                          </td>
                          <td className="tabular py-2.5 text-right text-muted-foreground">
                            {grades.tests.length}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="mt-4 text-[14px] text-muted-foreground">
                  {t("school.includedSubjects", {
                    included: included.length,
                    total: SCHOOL_SUBJECTS.length,
                  })}
                </p>
              </>
            )}

            <Accordion type="single" collapsible className="mt-2">
              <AccordionItem value="method" className="border-0">
                <AccordionTrigger className="text-[14.5px]">
                  {t("school.accordion.methodTitle")}
                </AccordionTrigger>
                <AccordionContent>
                  <ol className="list-decimal space-y-1 pl-5 text-[14.5px] text-muted-foreground">
                    <li>{t("school.accordion.step1")}</li>
                    <li>{t("school.accordion.step2")}</li>
                    <li>{t("school.accordion.step3")}</li>
                    <li>{t("school.accordion.step4")}</li>
                  </ol>
                  <p className="tabular mt-3 text-[13.5px] text-muted-foreground">
                    {t("school.accordion.roundingExamples", {
                      examples: ROUNDING_EXAMPLES.join(" · "),
                    })}
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="formula" className="border-0">
                <AccordionTrigger className="text-[14.5px]">
                  {t("school.accordion.formulaTitle")}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="rounded-[14px] bg-surface-2 p-4 text-[14.5px]">
                    <p className="font-medium">{t("school.accordion.formula")}</p>
                    <p className="mt-2 text-muted-foreground">
                      {t("school.accordion.formulaRange")}
                    </p>
                    <ul className="tabular mt-2 space-y-0.5 text-muted-foreground">
                      <li>{t("school.accordion.formulaExample0")}</li>
                      <li>{t("school.accordion.formulaExample50")}</li>
                      <li>{t("school.accordion.formulaExample80")}</li>
                      <li>{t("school.accordion.formulaExample100")}</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

          </section>
        </div>

        <StatsOverviewPanel className="h-fit xl:sticky xl:top-24" yearId={yearId} />
      </div>
    </AppShell>
  );
}

function Metric({
  label,
  value,
  accent,
  muted,
  info,
  failing,
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
  info?: boolean;
  failing?: boolean;
}) {
  return (
    <div className="rounded-[18px] bg-surface-2 p-4">
      <p className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
        {label}
        {info && <RoundingInfo />}
      </p>
      <p
        className={cn(
          "tabular mt-1 text-[26px] font-bold tracking-tight",
          accent && "text-chart-3",
          muted && "text-grade-muted",
          failing && "text-warning",
        )}
      >
        {value}
      </p>
    </div>
  );
}
