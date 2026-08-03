import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CURRENT_YEAR_ID, MONTHLY_AVERAGES, SCHOOL_YEARS } from "@/lib/mock/academic";
import { cn } from "@/lib/utils";

export function MiniTrendChart({
  data = MONTHLY_AVERAGES,
  className,
}: {
  data?: { month: string; average: number }[];
  className?: string;
}) {
  const min = 3.5;
  const max = 6;
  const points = data
    .map((d, i) => {
      const x = (i / Math.max(1, data.length - 1)) * 100;
      const y = 100 - ((d.average - min) / (max - min)) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-24 w-full">
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
      <div className="mt-1 flex justify-between text-[11.5px] text-muted-foreground">
        {data.map((d) => (
          <span key={d.month}>{d.month}</span>
        ))}
      </div>
    </div>
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

export function StatsOverviewPanel({ className }: { className?: string }) {
  const year = SCHOOL_YEARS.find((y) => y.id === CURRENT_YEAR_ID)!;

  return (
    <aside className={cn("app-card p-5", className)}>
      <h2 className="text-[18px] font-semibold tracking-tight">Stats</h2>
      <p className="mt-1 text-[13.5px] text-muted-foreground">
        {year.label} · {year.gradeLevel}
      </p>

      <div className="mt-4 rounded-[18px] bg-surface-2 p-4">
        <p className="text-[13px] text-muted-foreground">School-year average</p>
        <p className="tabular mt-1 text-[34px] font-bold leading-none tracking-tight">
          {year.average.toFixed(1)}
        </p>
        <p className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-chart-3">
          <ArrowUpRight className="h-4 w-4" />+{year.monthlyChange.toFixed(2)} this month
        </p>
      </div>

      <MiniTrendChart className="mt-5" />

      <div className="mt-4">
        <Row label="Strongest subject" value={year.strongestSubject} />
        <Row label="Focus subject" value={year.focusSubject} />
        <Row label="Assessments recorded" value={String(year.assessments)} />
        <Row label="Upcoming assessment" value="Biology · 18 Sep" />
      </div>

      <Button asChild variant="secondary" className="mt-5 w-full">
        <Link to="/stats">View Full Stats</Link>
      </Button>
    </aside>
  );
}
