import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Info, Plus, Upload } from "lucide-react";
import { useState } from "react";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { RoundingInfo } from "@/components/app/GradeDisplay";
import { StatsOverviewPanel } from "@/components/app/StatsOverviewPanel";
import { SubjectGrid } from "@/components/app/SubjectCard";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CURRENT_YEAR_ID, SCHOOL_YEARS } from "@/lib/mock/academic";
import {
  ROUNDING_EXAMPLES,
  YEAR_SUMMARY,
  formatHalf,
  getSubjectGrades,
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

function SchoolPage() {
  const [yearId, setYearId] = useState(CURRENT_YEAR_ID);
  const year = SCHOOL_YEARS.find((y) => y.id === yearId)!;
  const isCurrent = yearId === CURRENT_YEAR_ID;

  const included = SUBJECTS.map((s) => ({ subject: s, grades: getSubjectGrades(s.slug) })).filter(
    (row) => row.grades.included,
  );
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
            <Button variant="secondary" className="hidden sm:inline-flex">
              <Plus className="h-4 w-4" />
              Add Grade
            </Button>
            <Button variant="secondary" className="hidden sm:inline-flex">
              <Upload className="h-4 w-4" />
              Upload Transcript
            </Button>
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <SubjectGrid />

          <section className="app-card mt-6 p-5">
            <h2 className="text-[18px] font-semibold tracking-tight">Current year average</h2>
            <p className="mt-1 text-[13.5px] text-muted-foreground">
              {year.label} · calculated from rounded subject grades.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Metric label="Exact yearly average" value={exactYear.toFixed(2)} />
              <Metric
                label="Rounded yearly average"
                value={formatHalf(roundToHalf(exactYear))}
                muted
                info
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
                      <td className="py-2.5">{subject.name}</td>
                      <td className="tabular py-2.5 text-right font-medium">
                        {grades.exactAverage!.toFixed(2)}
                      </td>
                      <td className="tabular py-2.5 text-right font-medium text-grade-muted">
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
                      Minimum grade: 1.0 · Maximum grade: 6.0
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
              Prototype figures — values are illustrative mock data.
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
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
  info?: boolean;
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
        )}
      >
        {value}
      </p>
    </div>
  );
}
