/** Alim application component for study, planning, profile, or navigation workflows. */
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Bot, CalendarDays, GraduationCap, Home, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/messages";
import { Badge } from "@/components/ui/badge";
import { fetchUnreadCount } from "@/lib/peer-messaging";

const ITEMS = [
  { to: "/home", labelKey: "nav.home", icon: Home },
  { to: "/school", labelKey: "nav.school", icon: GraduationCap },
  { to: "/planner", labelKey: "nav.planner", icon: CalendarDays },
  { to: "/assistant", labelKey: "nav.assistant", icon: Bot },
  { to: "/messages", labelKey: "nav.messages", icon: MessageSquare },
  { to: "/system-health", labelKey: "nav.systemHealth", icon: Activity },
] as const satisfies ReadonlyArray<{ to: string; labelKey: TranslationKey; icon: typeof Home }>;

export function MobileNavigation() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["peer-unread-count"],
    queryFn: fetchUnreadCount,
    refetchInterval: 30000,
  });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden">
      <ul className="grid grid-cols-6">
        {ITEMS.map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[11.5px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span className="relative">
                  <item.icon className="h-[21px] w-[21px]" />
                  {item.to === "/messages" && unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -right-2 -top-2 h-4 min-w-4 justify-center rounded-full px-1 py-0 text-[9px]"
                      aria-label={t("nav.messagesUnread", { count: unreadCount })}
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </span>
                {t(item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
