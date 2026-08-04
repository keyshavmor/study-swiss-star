import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { AcademicYearSelector } from "@/components/app/AcademicYearSelector";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { PageNav } from "@/components/app/Breadcrumbs";
import { AssessmentActions } from "@/components/app/AssessmentActions";
import { AssessmentDialog } from "@/components/app/AssessmentDialog";
import { DemoModeBanner, DemoModeButton } from "@/components/app/DemoMode";
import { EmptyState } from "@/components/app/States";
import { MiniTrendChart } from "@/components/app/StatsOverviewPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAcademicYear } from "@/lib/store/academic-year";
import {
  formatDate,
  gradeOf,
  monthlySeries,
  percentageOf,
  summariseSubject,
  summariseYear,
} from "@/lib/grade-math";
import { isFailing } from "@/lib/mock/grades";
import { SUBJECTS, getSubject } from "@/lib/mock/subjects";
import { useAppData } from "@/lib/store/app-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/stats")({
  head: () => ({
    meta: [
      { title: "Statistics — Alim's Study Assistant" },
      {
        name: "description",
        content:
          "Academic statistics: school-year averages, subject comparison and every test you added, all editable.",
      },
      { property: "og:title", content: "Statistics — Alim's Study Assistant" },
      {
        property: "og:description",
        content: "School-year averages, subject comparison and full grade history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StatsPage,
});

function StatsPage() {
  const { assessments } = useAppData();
  const { yearId, year } = useAcademicYear();
  const [subject, setSubject] = useState("all");

  const yearTests = useMemo(
    () => assessments.filter((a) => a.yearId === yearId),
    [assessments, yearId],
  );
  const summary = useMemo(() => summariseYear(yearTests, SUBJECTS), [yearTests]);
  const series = useMemo(() => monthlySeries(yearTests), [yearTests]);
  const rows = yearTests
    .filter((a) => subject === "all" || a.subjectSlug === subject)
    .sort((a, b) => b.date.localeCompare(a.date));

  const subjectsWithGrades = SUBJECTS.map((s) => ({
    subject: s,
    summary: summariseSubject(yearTests, s.slug),
  })).filter((x) => x.summary.exactAverage !== null);

  return (
    <AppShell wide>
      <PageNav
        back={{ to: "/school", label: "School" }}
        crumbs={[{ label: "Home", to: "/home" }, { label: "School", to: "/school" }, { label: "Statistics" }]}
      />
      <PageHeading
        title="Statistics"
        description="Averages, trends and every test you added — all of it editable."
        action={
          <div className="flex gap-2">
            <AssessmentDialog
              trigger={
                <Button>
                  <Plus className="h-4 w-4" />
                  Add Test
                </Button>
              }
            />
            <DemoModeButton className="hidden sm:inline-flex" />
          </div>
        }
      />

      <DemoModeBanner />

      <div className="mb-6 flex flex-wrap gap-3">
        <AcademicYearSelector />
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {SUBJECTS.map((s) => (
              <SelectItem key={s.slug} value={s.slug}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {yearTests.length === 0 ? (
        <EmptyState
          heading={`No tests in ${year.label}`}
          description="Add a test, or upload a transcript, to build your statistics for this school year."
          action={
            <AssessmentDialog
              trigger={
                <Button>
                  <Plus className="h-4 w-4" />
                  Add Test
                </Button>
              }
            />
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KPI
              label="School-year average"
              value={summary.exactYearAverage?.toFixed(2) ?? "—"}
              failing={isFailing(summary.exactYearAverage)}
            />
            <KPI label="Tests added" value={String(summary.totalTests)} />
            <KPI label="Highest grade" value={summary.highestGrade?.toFixed(2) ?? "—"} />
            <KPI
              label="Lowest grade"
              value={summary.lowestGrade?.toFixed(2) ?? "—"}
              failing={isFailing(summary.lowestGrade)}
            />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <section className="app-card p-5">
              <h2 className="text-[18px] font-semibold tracking-tight">Average over time</h2>
              <MiniTrendChart className="mt-4" data={series} />
            </section>

            <section className="app-card p-5">
              <h2 className="text-[18px] font-semibold tracking-tight">Subject comparison</h2>
              {subjectsWithGrades.length === 0 ? (
                <p className="mt-3 text-[14px] text-muted-foreground">No subject averages yet.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {subjectsWithGrades.map(({ subject: s, summary: sum }) => (
                    <li
                      key={s.slug}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium">{s.name}</p>
                        <div className="mt-1 h-2 rounded-full bg-surface-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${(((sum.exactAverage ?? 1) - 1) / 5) * 100}%`,
                              backgroundColor: s.accent,
                            }}
                          />
                        </div>
                      </div>
                      <span
                        className={cn(
                          "tabular text-[14px] font-semibold",
                          isFailing(sum.exactAverage) && "text-warning",
                        )}
                      >
                        {sum.exactAverage!.toFixed(1)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="app-card mt-5 p-5">
            <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <h2 className="text-[18px] font-semibold tracking-tight">Your tests</h2>
              <Badge variant="secondary">{rows.length} entries</Badge>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Test</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Grade</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((a) => {
                    const grade = gradeOf(a);
                    const pct = percentageOf(a);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDate(a.date)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium">
                          {getSubject(a.subjectSlug)?.name ?? a.subjectSlug}
                        </TableCell>
                        <TableCell>{a.title}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {a.type}
                        </TableCell>
                        <TableCell className="tabular text-right">
                          {a.points === null ? "—" : `${a.points}/${a.maxPoints}`}
                        </TableCell>
                        <TableCell className="tabular text-right">
                          {pct === null ? "—" : `${pct}%`}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "tabular text-right font-semibold",
                            isFailing(grade) && "text-warning",
                          )}
                        >
                          {grade === null ? "—" : grade.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="whitespace-nowrap text-[11.5px]">
                            {a.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <AssessmentActions record={a} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="mt-5 rounded-[18px] bg-surface-2 p-4 text-[14.5px]">
              <p className="font-medium">Grade = 1.0 + 5.0 × (achieved points ÷ maximum points)</p>
              <p className="mt-1 text-muted-foreground">
                Minimum 1.0 · Maximum 6.0 · Passing 4.0 · 0% → 1.0 · 50% → 3.5 · 80% → 5.0 · 100% →
                6.0
              </p>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}

function KPI({
  label,
  value,
  accent,
  failing,
}: {
  label: string;
  value: string;
  accent?: boolean;
  failing?: boolean;
}) {
  return (
    <div className="app-card p-5">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tabular mt-1 text-[30px] font-bold tracking-tight",
          accent && "text-chart-3",
          failing && "text-warning",
        )}
      >
        {value}
      </p>
    </div>
  );
}
