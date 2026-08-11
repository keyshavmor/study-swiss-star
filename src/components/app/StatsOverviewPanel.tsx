import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useMemo } from "react";
import { GradeLineChart } from "@/components/app/GradeDisplay";
import { CURRENT_YEAR_ID, SCHOOL_YEARS } from "@/lib/mock/academic";
import { monthlySeries, summariseYear } from "@/lib/grade-math";
import { formatHalf, isFailing, roundToHalf } from "@/lib/mock/grades";
import { SCHOOL_SUBJECTS } from "@/lib/mock/subjects";
import { useAppData } from "@/lib/store/app-data";
import { cn } from "@/lib/utils";

export function MiniTrendChart({
  data,
  className,
}: {
  data?: { label: string; value: number }[];
  className?: string;
}) {
  const { assessments } = useAppData();
  const series = data ?? monthlySeries(assessments);
  if (series.length === 0) {
    return (
      <p className={cn("rounded-[14px] bg-surface-2 p-4 text-[13.5px] text-muted-foreground", className)}>
        No grades yet — the trend appears once you add tests.
      </p>
    );
  }
  return <GradeLineChart data={series} height={120} className={className} />;
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
  const { assessments } = useAppData();
  const year = SCHOOL_YEARS.find((y) => y.id === yearId) ?? SCHOOL_YEARS[SCHOOL_YEARS.length - 1]!;

  const yearTests = useMemo(
    () => assessments.filter((a) => a.yearId === yearId),
    [assessments, yearId],
  );
  const summary = useMemo(() => summariseYear(yearTests, SCHOOL_SUBJECTS), [yearTests]);
  const series = useMemo(() => monthlySeries(yearTests), [yearTests]);
  const exact = summary.exactYearAverage;
  const change =
    series.length >= 2 ? series[series.length - 1]!.value - series[series.length - 2]!.value : null;

  const strongest = [...summary.subjectAverages].sort((a, b) => b.exact - a.exact)[0];
  const focus = [...summary.subjectAverages].sort((a, b) => a.exact - b.exact)[0];

  return (
    <aside className={cn("app-card p-5", className)}>
      <h2 className="text-[18px] font-semibold tracking-tight">Statistics</h2>
      <p className="mt-1 text-[13.5px] text-muted-foreground">
        {year.label} · {year.gradeLevel}
      </p>

      {exact === null ? (
        <p className="mt-4 rounded-[18px] bg-surface-2 p-4 text-[14px] text-muted-foreground">
          Statistics appear here as soon as you add your first test.
        </p>
      ) : (
        <>
          <div className="mt-4 rounded-[18px] bg-surface-2 p-4">
            <p className="text-[13px] text-muted-foreground">Yearly average</p>
            <div className="mt-1 flex items-end gap-3">
              <p
                className={cn(
                  "tabular text-[34px] font-bold leading-none tracking-tight",
                  isFailing(exact) && "text-warning",
                )}
              >
                {exact.toFixed(2)}
              </p>
              <p
                className={cn(
                  "tabular text-[19px] font-semibold leading-none",
                  isFailing(roundToHalf(exact)) ? "text-warning" : "text-grade-muted",
                )}
              >
                {formatHalf(roundToHalf(exact))}
              </p>
            </div>
            {change !== null && (
              <p
                className={cn(
                  "mt-2 inline-flex items-center gap-1 text-[13px] font-medium",
                  change >= 0 ? "text-chart-3" : "text-chart-4",
                )}
              >
                {change >= 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {change >= 0 ? "+" : "−"}
                {Math.abs(change).toFixed(2)} vs previous month
              </p>
            )}
          </div>

          <p className="mt-5 text-[13px] font-medium text-muted-foreground">Average per month</p>
          <MiniTrendChart className="mt-2" data={series} />

          <div className="mt-4">
            <Row label="Strongest subject" value={strongest?.name ?? "—"} />
            <Row label="Focus subject" value={focus?.name ?? "—"} />
            <Row label="Tests added" value={String(summary.totalTests)} />
            <Row
              label="Highest grade"
              value={summary.highestGrade === null ? "—" : summary.highestGrade.toFixed(2)}
            />
            <Row
              label="Lowest grade"
              value={summary.lowestGrade === null ? "—" : summary.lowestGrade.toFixed(2)}
            />
          </div>
        </>
      )}
    </aside>
  );
}
