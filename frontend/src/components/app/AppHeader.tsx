/** Alim application component for study, planning, profile, or navigation workflows. */
import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { GraduationCap, LogOut, Menu, Settings, User } from "lucide-react";
import { useState } from "react";
import { NotificationCenter } from "@/components/app/NotificationCenter";
import { LiveClock } from "@/components/app/LiveClock";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageMenu } from "@/components/app/LanguageMenu";
import { Badge } from "@/components/ui/badge";
import { fetchUnreadCount } from "@/lib/peer-messaging";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAppData } from "@/lib/store/app-data";
import { useI18n } from "@/lib/i18n/provider";
import { signOutCompletely } from "@/lib/sign-out";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const NAV = [
  { to: "/home", key: "nav.home" },
  { to: "/school", key: "nav.school" },
  { to: "/planner", key: "nav.planner" },
  { to: "/assistant", key: "nav.assistant" },
  { to: "/stats", key: "nav.stats" },
  { to: "/help", key: "nav.help" },
  { to: "/messages", key: "nav.messages" },
  { to: "/system-health", key: "nav.systemHealth" },
  { to: "/feedback", key: "nav.feedback" },
] as const;

export function AppHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const { profile } = useAppData();
  const { t } = useI18n();
  const displayName = profile.preferredName || profile.fullName || t("nav.yourProfile");
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["peer-unread-count"],
    queryFn: fetchUnreadCount,
    refetchInterval: 30000,
  });

  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

  const navigate = useNavigate();
  const router = useRouter();

  async function handleSignOut() {
    try {
      await signOutCompletely();
    } catch (err) {
      // Never surface a raw provider message: it would inject English into the UI.
      console.error("sign-out failed", err);
      toast.error(t("nav.signOutFailed"));
      return;
    }
    await router.invalidate();
    await navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-none">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label={t("nav.openMenu")}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-6">
              <SheetTitle className="text-[17px]">{t("common.appName")}</SheetTitle>
              <nav className="mt-6 flex flex-col gap-1">
                {NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-4 py-3 text-[16px] font-medium transition-colors",
                      isActive(item.to)
                        ? "bg-thread-active text-foreground"
                        : "text-muted-foreground hover:bg-hover hover:text-foreground",
                    )}
                  >
                    {t(item.key)}
                    {item.to === "/messages" && unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="ml-auto"
                        aria-label={t("nav.messagesUnread", { count: unreadCount })}
                      >
                        {unreadCount}
                      </Badge>
                    )}
                  </Link>
                ))}
                <Link
                  to="/profile"
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-[16px] font-medium text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
                >
                  {t("nav.profile")}
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-[16px] font-medium text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
                >
                  {t("nav.settings")}
                </Link>
              </nav>
            </SheetContent>
          </Sheet>

          <Link
            to="/home"
            aria-label={t("nav.home")}
            className="flex min-w-0 items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-[18px] w-[18px]" />
            </span>
            <span className="truncate text-[15px] font-semibold tracking-tight">
              {t("common.appName")}
            </span>
          </Link>

          <nav className="ml-5 hidden flex-1 items-center justify-start gap-0.5 lg:flex xl:ml-8 xl:gap-1.5">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-[14.5px] font-medium transition-colors duration-200 xl:px-4",
                  isActive(item.to)
                    ? "bg-thread-active text-foreground"
                    : "text-muted-foreground hover:bg-hover hover:text-foreground",
                )}
              >
                {t(item.key)}
                {item.to === "/messages" && unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="px-1.5 py-0 text-[11px]"
                    aria-label={t("nav.messagesUnread", { count: unreadCount })}
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <LiveClock className="mr-1 hidden sm:flex" />
          <ThemeToggle className="hidden sm:inline-flex" />

          <NotificationCenter />
          <LanguageMenu />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t("nav.profileMenu")}
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                {profile.photo ? (
                  <img src={profile.photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-[18px] w-[18px]" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile">
                  <User className="h-4 w-4" />
                  {t("nav.viewProfile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <Settings className="h-4 w-4" />
                  {t("nav.settings")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void handleSignOut()}>
                <LogOut className="h-4 w-4" />
                {t("nav.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
