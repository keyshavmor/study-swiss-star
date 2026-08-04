import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Info, Plus, TriangleAlert, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { AddGradeDialog } from "@/components/app/AddGradeDialog";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { DemoBadge, FailingBadge } from "@/components/app/Badges";
import { RoundingInfo } from "@/components/app/GradeDisplay";
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
import { CURRENT_YEAR_ID, SCHOOL_YEARS } from "@/lib/mock/academic";
import {
  PASSING_THRESHOLD,
  ROUNDING_EXAMPLES,
  YEAR_SUMMARY,
  formatHalf,
  getSubjectGrades,
  isFailing,
  roundToHalf,
} from "@/lib/mock/grades";
import { SUBJECTS } from "@/lib/mock/subjects";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/school/")({
  head: () => ({
    meta: [
      { title: "School — Alim's Study Assistant" },
      {
        name: "description",
        content:
          "All subjects with exact and rounded averages, grade history, upcoming exams and the yearly average breakdown.",
      },
      { property: "og:title", content: "School — Alim's Study Assistant" },
      {
        property: "og:description",
        content: "Subject averages, grade history and yearly average breakdown.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SchoolPage,
});

type SortKey = "name" | "average-desc" | "average-asc" | "recent" | "next-exam";
type FilterKey = "all" | "failing" | "with-grades" | "no-grades";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Subject name (A–Z)" },
  { value: "average-desc", label: "Average — highest first" },
  { value: "average-asc", label: "Average — lowest first" },
  { value: "recent", label: "Most recent test activity" },
  { value: "next-exam", label: "Next exam date" },
];

const FILTER_OPTIONS: { value: FilterKey; label: string }[] = [
  { value: "all", label: "All subjects" },
  { value: "failing", label: "Below passing grade" },
  { value: "with-grades", label: "With recorded grades" },
  { value: "no-grades", label: "Without grades" },
];

function SchoolPage() {
  const [yearId, setYearId] = useState(CURRENT_YEAR_ID);
  const [sort, setSort] = useState<SortKey>("name");
  const [filter, setFilter] = useState<FilterKey>("all");
  const year = SCHOOL_YEARS.find((y) => y.id === yearId)!;
  const isCurrent = yearId === CURRENT_YEAR_ID;

  const rows = SUBJECTS.map((s) => ({ subject: s, grades: getSubjectGrades(s.slug) }));
  const included = rows.filter((row) => row.grades.included);
  const failingSubjects = included.filter((row) => isFailing(row.grades.exactAverage));

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
          return b.grades.tests.length - a.grades.tests.length;
        case "next-exam":
          return (a.subject.nextExamInDays ?? 999) - (b.subject.nextExamInDays ?? 999);
        default:
          return a.subject.name.localeCompare(b.subject.name);
      }
    });
    return sorted.map((row) => row.subject);
  }, [rows, sort, filter]);

  const exactYear = isCurrent ? YEAR_SUMMARY.exactYearAverage : year.average;
  const previous = isCurrent ? YEAR_SUMMARY.previousMonthAverage : year.average - year.monthlyChange;

  return (
    <AppShell wide>
      <PageHeading
        title="School"
        description={`${year.label} · ${year.gradeLevel} — ${SUBJECTS.length} subjects`}
        breadcrumb={
          <span className="inline-flex items-center gap-1">
            <Link to="/home" className="hover:text-foreground">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground">School</span>
          </span>
        }
        action={
          <div className="flex gap-2">
            <AddGradeDialog
              trigger={
                <Button variant="secondary" className="hidden sm:inline-flex">
                  <Plus className="h-4 w-4" />
                  Add Grade
                </Button>
              }
            />
            <TranscriptImportDialog
              trigger={
                <Button variant="secondary" className="hidden sm:inline-flex">
                  <Upload className="h-4 w-4" />
                  Upload Transcript
                </Button>
              }
            />
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {SCHOOL_YEARS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setYearId(option.id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[13.5px] font-medium transition-colors duration-200",
              option.id === yearId
                ? "border-border-strong bg-surface text-foreground"
                : "border-border text-muted-foreground hover:bg-hover",
            )}
          >
            {option.label.replace("Academic Year ", "")} · {option.gradeLevel}
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground">Sort by</span>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-10 w-[230px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground">Show</span>
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
            <SelectTrigger className="h-10 w-[210px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-[13px] text-muted-foreground">
          {visibleSubjects.length} of {SUBJECTS.length} subjects
        </span>
      </div>

      {failingSubjects.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-[18px] bg-warning-soft px-4 py-3.5 text-[14px] text-warning">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          <span>
            {failingSubjects.length === 1 ? "1 subject is" : `${failingSubjects.length} subjects are`}{" "}
            below the passing grade of {PASSING_THRESHOLD.toFixed(1)}:{" "}
            {failingSubjects.map((row) => row.subject.name).join(", ")}.
          </span>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <SubjectGrid subjects={visibleSubjects} />

          <section className="app-card mt-6 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[18px] font-semibold tracking-tight">Current year average</h2>
              <DemoBadge label="Demo data" />
            </div>
            <p className="mt-1 text-[13.5px] text-muted-foreground">
              {year.label} · calculated from rounded subject grades.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Metric
                label="Exact yearly average"
                value={exactYear.toFixed(2)}
                failing={isFailing(exactYear)}
              />
              <Metric
                label="Rounded yearly average"
                value={formatHalf(roundToHalf(exactYear))}
                muted
                info
                failing={isFailing(roundToHalf(exactYear))}
              />
              <Metric
                label="Change vs last month"
                value={`${exactYear - previous >= 0 ? "+" : ""}${(exactYear - previous).toFixed(2)}`}
                accent
              />
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-[14px]">
                <thead className="text-[12.5px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-medium">Subject</th>
                    <th className="pb-2 text-right font-medium">Exact</th>
                    <th className="pb-2 text-right font-medium">Rounded</th>
                    <th className="pb-2 text-right font-medium">Tests</th>
                  </tr>
                </thead>
                <tbody>
                  {included.map(({ subject, grades }) => (
                    <tr key={subject.slug} className="border-t border-border">
                      <td className="py-2.5">
                        <span className="inline-flex items-center gap-2">
                          {subject.name}
                          {isFailing(grades.exactAverage) && <FailingBadge label="Failing" />}
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
                          isFailing(grades.roundedAverage) ? "text-warning" : "text-grade-muted",
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
              Subjects included: {YEAR_SUMMARY.includedCount} of {YEAR_SUMMARY.totalCount}
              {YEAR_SUMMARY.missing.length > 0 && (
                <> · No grades yet: {YEAR_SUMMARY.missing.join(", ")}</>
              )}
            </p>

            <Accordion type="single" collapsible className="mt-2">
              <AccordionItem value="method" className="border-0">
                <AccordionTrigger className="text-[14.5px]">
                  How the yearly average is calculated
                </AccordionTrigger>
                <AccordionContent>
                  <ol className="list-decimal space-y-1 pl-5 text-[14.5px] text-muted-foreground">
                    <li>Calculate the exact average of all school tests in each subject.</li>
                    <li>Round every subject average to the nearest 0.5.</li>
                    <li>Average those rounded subject grades to get the yearly average.</li>
                    <li>Subjects without grades are excluded from the calculation.</li>
                  </ol>
                  <p className="tabular mt-3 text-[13.5px] text-muted-foreground">
                    Rounding examples: {ROUNDING_EXAMPLES.join(" · ")}
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="formula" className="border-0">
                <AccordionTrigger className="text-[14.5px]">
                  How was a single grade calculated?
                </AccordionTrigger>
                <AccordionContent>
                  <div className="rounded-[14px] bg-surface-2 p-4 text-[14.5px]">
                    <p className="font-medium">
                      Grade = 1.0 + 5.0 × (achieved points ÷ maximum points)
                    </p>
                    <p className="mt-2 text-muted-foreground">
                      Minimum grade: 1.0 · Maximum grade: 6.0 · Passing grade: 4.0
                    </p>
                    <ul className="tabular mt-2 space-y-0.5 text-muted-foreground">
                      <li>0% → 1.0</li>
                      <li>50% → 3.5</li>
                      <li>80% → 5.0</li>
                      <li>100% → 6.0</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <p className="mt-3 inline-flex items-start gap-2 text-[13px] text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              Demonstration figures — example subjects and grades are part of the prototype and
              cannot be removed.
            </p>
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
