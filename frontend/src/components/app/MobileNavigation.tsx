/** Alim application component for study, planning, profile, or navigation workflows. */
import { Link, useRouterState } from "@tanstack/react-router";
import { Bot, CalendarDays, GraduationCap, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/school", label: "School", icon: GraduationCap },
  { to: "/planner", label: "Planner", icon: CalendarDays },
  { to: "/assistant", label: "Assistant", icon: Bot },
] as const;

export function MobileNavigation() {
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
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
