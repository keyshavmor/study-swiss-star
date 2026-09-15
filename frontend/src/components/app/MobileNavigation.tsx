/** Alim application component for study, planning, profile, or navigation workflows. */
import { Link, useRouterState } from "@tanstack/react-router";
import { Bot, CalendarDays, GraduationCap, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/messages";

const ITEMS = [
  { to: "/home", labelKey: "nav.home", icon: Home },
  { to: "/school", labelKey: "nav.school", icon: GraduationCap },
  { to: "/planner", labelKey: "nav.planner", icon: CalendarDays },
  { to: "/assistant", labelKey: "nav.assistant", icon: Bot },
] as const satisfies ReadonlyArray<{ to: string; labelKey: TranslationKey; icon: typeof Home }>;

export function MobileNavigation() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden">
      <ul className="grid grid-cols-4">
        {ITEMS.map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11.5px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="h-[21px] w-[21px]" />
                {t(item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
