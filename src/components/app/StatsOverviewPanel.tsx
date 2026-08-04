import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { GradeLineChart } from "@/components/app/GradeDisplay";
import { Button } from "@/components/ui/button";
import { CURRENT_YEAR_ID, SCHOOL_YEARS } from "@/lib/mock/academic";
import {
  MULTI_YEAR_SERIES,
  SEMESTER_SERIES,
  YEAR_MONTHLY_SERIES,
  YEAR_SUMMARY,
  formatHalf,
  roundToHalf,
} from "@/lib/mock/grades";
import { cn } from "@/lib/utils";

export function MiniTrendChart({
  data,
  className,
}: {
  data?: { label: string; value: number }[];
  className?: string;
}) {
  return (
    <GradeLineChart
      data={data ?? YEAR_MONTHLY_SERIES[CURRENT_YEAR_ID] ?? []}
      height={120}
      className={className}
    />
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 last:border-0">
      <span className="text-[14px] text-muted-foreground">{label}</span>
      <span className="tabular text-[14.5px] font-medium">{value}</span>
    </div>
  );
}

export function StatsOverviewPanel({
  className,
  yearId = CURRENT_YEAR_ID,
}: {
  className?: string;
  yearId?: string;
}) {
  const year = SCHOOL_YEARS.find((y) => y.id === yearId) ?? SCHOOL_YEARS[SCHOOL_YEARS.length - 1]!;
  const isCurrent = yearId === CURRENT_YEAR_ID;
  const exact = isCurrent ? YEAR_SUMMARY.exactYearAverage : year.average;
  const change = isCurrent ? exact - YEAR_SUMMARY.previousMonthAverage : year.monthlyChange;

  return (
    <aside className={cn("app-card p-5", className)}>
      <h2 className="text-[18px] font-semibold tracking-tight">Statistics</h2>
      <p className="mt-1 text-[13.5px] text-muted-foreground">
        {year.label} · {year.gradeLevel}
      </p>

      <div className="mt-4 rounded-[18px] bg-surface-2 p-4">
        <p className="text-[13px] text-muted-foreground">Yearly average</p>
        <div className="mt-1 flex items-end gap-3">
          <p className="tabular text-[34px] font-bold leading-none tracking-tight">
            {exact.toFixed(2)}
          </p>
          <p className="tabular text-[19px] font-semibold leading-none text-grade-muted">
            {formatHalf(roundToHalf(exact))}
          </p>
        </div>
        <p className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-chart-3">
          <ArrowUpRight className="h-4 w-4" />+{Math.abs(change).toFixed(2)} vs last month
        </p>
      </div>

      <p className="mt-5 text-[13px] font-medium text-muted-foreground">Average per month</p>
      <MiniTrendChart className="mt-2" data={YEAR_MONTHLY_SERIES[yearId] ?? []} />

      <p className="mt-5 text-[13px] font-medium text-muted-foreground">Per semester</p>
      <GradeLineChart className="mt-2" height={90} data={SEMESTER_SERIES[yearId] ?? []} />

      <p className="mt-5 text-[13px] font-medium text-muted-foreground">Across school years</p>
      <GradeLineChart className="mt-2" height={90} data={MULTI_YEAR_SERIES} />

      <div className="mt-4">
        <Row label="Strongest subject" value={year.strongestSubject} />
        <Row label="Focus subject" value={year.focusSubject} />
        <Row
          label="Tests recorded"
          value={String(isCurrent ? YEAR_SUMMARY.totalTests : year.assessments)}
        />
        <Row
          label="Highest test grade"
          value={(isCurrent ? YEAR_SUMMARY.highestTestGrade : year.highestGrade).toFixed(1)}
        />
      </div>

      <Button asChild variant="secondary" className="mt-5 w-full">
        <Link to="/stats">View Full Statistics</Link>
      </Button>
    </aside>
  );
}
