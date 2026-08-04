import { createFileRoute } from "@tanstack/react-router";
import { Info, Plus } from "lucide-react";
import { useState } from "react";
import { AddGradeDialog } from "@/components/app/AddGradeDialog";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { DemoBadge, LockedBadge } from "@/components/app/Badges";
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
import { ASSESSMENTS, CURRENT_YEAR_ID, SCHOOL_YEARS } from "@/lib/mock/academic";
import { isFailing } from "@/lib/mock/grades";
import { SUBJECTS } from "@/lib/mock/subjects";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/stats")({
  head: () => ({
    meta: [
      { title: "Statistics — Alim's Study Assistant" },
      {
        name: "description",
        content:
          "Academic statistics: school-year averages, subject comparison, grade history and assessment records.",
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
  const [yearId, setYearId] = useState(CURRENT_YEAR_ID);
  const [subject, setSubject] = useState("all");
  const year = SCHOOL_YEARS.find((y) => y.id === yearId)!;
  const rows = ASSESSMENTS.filter((a) => subject === "all" || a.subject === subject);

  return (
    <AppShell wide>
      <PageHeading
        title="Statistics"
        description="Averages, trends and every recorded assessment in one place."
        action={
          <AddGradeDialog
            trigger={
              <Button>
                <Plus className="h-4 w-4" />
                Add Grade
              </Button>
            }
          />
        }
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <Select value={yearId} onValueChange={setYearId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCHOOL_YEARS.map((y) => (
              <SelectItem key={y.id} value={y.id}>
                {y.label} · {y.gradeLevel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {SUBJECTS.map((s) => (
              <SelectItem key={s.slug} value={s.name}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPI
          label="School-year average"
          value={year.average.toFixed(1)}
          failing={isFailing(year.average)}
        />
        <KPI label="Monthly change" value={`+${year.monthlyChange.toFixed(2)}`} accent />
        <KPI label="Assessments" value={String(year.assessments)} />
        <KPI label="Highest grade" value={year.highestGrade.toFixed(2)} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="app-card p-5">
          <h2 className="text-[18px] font-semibold tracking-tight">Average over time</h2>
          <MiniTrendChart className="mt-4" />
        </section>

        <section className="app-card p-5">
          <h2 className="text-[18px] font-semibold tracking-tight">Subject comparison</h2>
          <ul className="mt-4 space-y-3">
            {SUBJECTS.slice(0, 8).map((s) => (
              <li key={s.slug} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium">{s.name}</p>
                  <div className="mt-1 h-2 rounded-full bg-surface-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${(((s.average ?? 1) - 1) / 5) * 100}%`,
                        backgroundColor: s.accent,
                      }}
                    />
                  </div>
                </div>
                <span
                  className={cn(
                    "tabular text-[14px] font-semibold",
                    isFailing(s.average) && "text-warning",
                  )}
                >
                  {s.average?.toFixed(1) ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="app-card mt-5 p-5">
        <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[18px] font-semibold tracking-tight">Assessment records</h2>
            <DemoBadge label="Demo data" />
          </div>
          <Badge variant="secondary">{rows.length} entries</Badge>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Assessment</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-right">Grade</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{a.date}</TableCell>
                  <TableCell className="whitespace-nowrap font-medium">{a.subject}</TableCell>
                  <TableCell>{a.title}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{a.type}</TableCell>
                  <TableCell className="tabular text-right">
                    {a.points === null ? "—" : `${a.points}/${a.maxPoints}`}
                  </TableCell>
                  <TableCell className="tabular text-right">
                    {a.percentage === null ? "—" : `${a.percentage}%`}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "tabular text-right font-semibold",
                      isFailing(a.grade) && "text-warning",
                    )}
                  >
                    {a.grade.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="whitespace-nowrap text-[11.5px]">
                      {a.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <LockedBadge label="Permanent" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-5 rounded-[18px] bg-surface-2 p-4 text-[14.5px]">
          <p className="font-medium">Grade = 1.0 + 5.0 × (achieved points ÷ maximum points)</p>
          <p className="mt-1 text-muted-foreground">
            Minimum 1.0 · Maximum 6.0 · Passing 4.0 · 0% → 1.0 · 50% → 3.5 · 80% → 5.0 · 100% → 6.0
          </p>
        </div>

        <p className="mt-3 inline-flex items-start gap-2 text-[13px] text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          Demonstration data — recorded assessments are permanent and cannot be edited or deleted.
        </p>
      </section>
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
