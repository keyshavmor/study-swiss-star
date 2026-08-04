import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ROUNDED_TOOLTIP, ROUNDING_EXAMPLES, formatHalf } from "@/lib/mock/grades";
import { cn } from "@/lib/utils";

/** Exact subject average next to its value rounded to the nearest 0.5. */
export function AverageWithRounded({
  exact,
  rounded,
  size = "md",
  className,
}: {
  exact: number | null;
  rounded: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const exactSize = size === "lg" ? "text-[40px]" : size === "md" ? "text-[26px]" : "text-[18px]";
  const roundedSize = size === "lg" ? "text-[24px]" : size === "md" ? "text-[17px]" : "text-[14px]";

  if (exact === null || rounded === null) {
    return (
      <p className={cn("text-[14.5px] text-muted-foreground", className)}>
        No school-test grades recorded yet.
      </p>
    );
  }

  return (
    <div className={cn("flex items-end gap-4", className)}>
      <div>
        <p className={cn("tabular font-bold leading-none tracking-tight", exactSize)}>
          {exact.toFixed(2)}
        </p>
        <p className="mt-1.5 text-[12.5px] text-muted-foreground">Subject average</p>
      </div>
      <div className="pointer-events-auto">
        <p className={cn("tabular font-semibold leading-none text-grade-muted", roundedSize)}>
          {formatHalf(rounded)}
        </p>
        <p className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] text-grade-muted">
          Rounded to 0.5
          <RoundingInfo />
        </p>
      </div>
    </div>
  );
}

export function RoundingInfo({ className }: { className?: string }) {
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="How rounding works"
            onClick={(event) => event.preventDefault()}
            className={cn(
              "inline-flex h-4 w-4 items-center justify-center rounded-full text-grade-muted transition-colors hover:text-foreground",
              className,
            )}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[260px] text-[12.5px] leading-relaxed">
          <p>{ROUNDED_TOOLTIP}</p>
          <p className="tabular mt-2 opacity-80">{ROUNDING_EXAMPLES.slice(0, 4).join(" · ")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Compact inline rounded value used inside tables and lists. */
export function RoundedValue({ value }: { value: number | null }) {
  if (value === null) return <span className="text-grade-muted">—</span>;
  return (
    <span className="tabular inline-flex items-center gap-1 font-medium text-grade-muted">
      {formatHalf(value)}
      <RoundingInfo />
    </span>
  );
}

/** Simple 1.0–6.0 Swiss-scale line chart. */
export function GradeLineChart({
  data,
  height = 160,
  className,
}: {
  data: { label: string; value: number }[];
  height?: number;
  className?: string;
}) {
  const min = 1;
  const max = 6;
  const gridLines = [6, 5, 4, 3, 2, 1];
  const points = data
    .map((d, i) => {
      const x = (i / Math.max(1, data.length - 1)) * 100;
      const y = 100 - ((d.value - min) / (max - min)) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className={cn("w-full", className)}>
      <div className="flex gap-3">
        <div
          className="tabular flex shrink-0 flex-col justify-between py-[2px] text-[11px] text-muted-foreground"
          style={{ height }}
          aria-hidden
        >
          {gridLines.map((g) => (
            <span key={g}>{g.toFixed(1)}</span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="absolute inset-0 flex flex-col justify-between" aria-hidden>
            {gridLines.map((g) => (
              <span key={g} className="h-px w-full bg-border" />
            ))}
          </div>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="relative w-full"
            style={{ height }}
            role="img"
            aria-label={`Grade trend from ${data[0]?.label ?? ""} to ${data[data.length - 1]?.label ?? ""} on the Swiss 1.0 to 6.0 scale`}
          >
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
          <div className="mt-1.5 flex justify-between text-[11.5px] text-muted-foreground">
            {data.map((d) => (
              <span key={d.label}>{d.label}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
