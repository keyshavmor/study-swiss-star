/** Alim application component for study, planning, profile, or navigation workflows. */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAcademicYear } from "@/lib/store/academic-year";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * "← Academic Year 2026–27 · Grade 11 →" with a dropdown for direct selection.
 * The selection is global, so every page shows the same academic year.
 */
export function AcademicYearSelector({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const { yearId, years, setYearId, step } = useAcademicYear();
  const index = years.findIndex((y) => y.id === yearId);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Button
        variant="secondary"
        size="icon-sm"
        aria-label={t("misc.year.previous")}
        disabled={index <= 0}
        onClick={() => step(-1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Select value={yearId} onValueChange={setYearId}>
        <SelectTrigger
          aria-label={t("misc.year.label")}
          className={cn("h-9 min-w-[210px]", compact && "min-w-[180px] text-[13.5px]")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y.id} value={y.id}>
              {y.label.replace("Academic Year ", compact ? "" : "Academic Year ")} · {y.gradeLevel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="secondary"
        size="icon-sm"
        aria-label={t("misc.year.next")}
        disabled={index >= years.length - 1}
        onClick={() => step(1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

/** Plain text label, e.g. under a page title. */
export function AcademicYearLabel({ className }: { className?: string }) {
  const { yearLabel } = useAcademicYear();
  return <span className={cn("text-[14px] text-muted-foreground", className)}>{yearLabel}</span>;
}
