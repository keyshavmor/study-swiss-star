/** Top-level tutoring/authentication component used by TanStack routes. */
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            aria-label={t("common.theme.toggle")}
            onClick={toggleTheme}
            className={cn(
              "inline-flex h-11 items-center gap-1 rounded-full border border-border bg-surface p-1 transition-colors duration-200",
              className,
            )}
          >
            <span
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-200",
                !isDark ? "bg-hover text-primary" : "text-muted-foreground",
              )}
            >
              <Sun className="h-[18px] w-[18px]" />
            </span>
            <span
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-200",
                isDark ? "bg-hover text-primary" : "text-muted-foreground",
              )}
            >
              <Moon className="h-[18px] w-[18px]" />
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent>{t("common.theme.toggle")}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
