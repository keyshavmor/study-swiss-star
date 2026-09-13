/** Alim application component for study, planning, profile, or navigation workflows. */
import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DEMO_TOOLTIP, FAILING_TOOLTIP, isFailing } from "@/lib/mock/grades";
import { cn } from "@/lib/utils";

function WithTooltip({ tip, children }: { tip: string; children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{children}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[260px] text-[12.5px] leading-relaxed">
          {tip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Marks optional example content shown only while Demo Mode is on. */
export function DemoBadge({
  label = "Example data",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <WithTooltip tip={DEMO_TOOLTIP}>
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-grade-muted",
          className,
        )}
      >
        {label}
      </span>
    </WithTooltip>
  );
}

/** Warning badge for averages or grades below the 4.0 passing threshold. */
export function FailingBadge({
  label = "Below passing grade",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <WithTooltip tip={FAILING_TOOLTIP}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-[12px] font-medium text-warning",
          className,
        )}
      >
        <TriangleAlert className="h-3.5 w-3.5" />
        {label}
      </span>
    </WithTooltip>
  );
}

/** A grade number that turns orange when it is below 4.0. */
export function GradeValue({
  value,
  decimals = 1,
  className,
}: {
  value: number | null;
  decimals?: number;
  className?: string;
}) {
  if (value === null) return <span className="text-grade-muted">—</span>;
  return (
    <span className={cn("tabular", isFailing(value) && "text-warning", className)}>
      {value.toFixed(decimals)}
    </span>
  );
}
