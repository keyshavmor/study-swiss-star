import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, GraduationCap, Menu, User } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NOTIFICATIONS } from "@/lib/mock/planner";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/home", label: "Home" },
  { to: "/school", label: "School" },
  { to: "/planner", label: "Planner" },
  { to: "/stats", label: "Stats" },
  { to: "/help", label: "Help" },
  { to: "/feedback", label: "Feedback" },
] as const;

export function AppHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const unread = NOTIFICATIONS.filter((n) => !n.read).length;

  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-none">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-6">
              <SheetTitle className="text-[17px]">Alim's Study Assistant</SheetTitle>
              <nav className="mt-6 flex flex-col gap-1">
                {NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-xl px-4 py-3 text-[16px] font-medium transition-colors",
                      isActive(item.to)
                        ? "bg-thread-active text-foreground"
                        : "text-muted-foreground hover:bg-hover hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  to="/settings"
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-[16px] font-medium text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
                >
                  Settings
                </Link>
              </nav>
            </SheetContent>
          </Sheet>

          <Link to="/home" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-[18px] w-[18px]" />
            </span>
            <span className="truncate text-[15px] font-semibold tracking-tight">
              Alim's Study Assistant
            </span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[14.5px] font-medium transition-colors duration-200",
                  isActive(item.to)
                    ? "bg-thread-active text-foreground"
                    : "text-muted-foreground hover:bg-hover hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[340px] p-0">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-[15px] font-semibold">Notifications</span>
                <button type="button" className="text-[13px] text-primary">
                  Mark all read
                </button>
              </div>
              <ul className="max-h-[360px] overflow-y-auto">
                {NOTIFICATIONS.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      "border-b border-border px-4 py-3 last:border-0",
                      !n.read && "bg-hover",
                    )}
                  >
                    <p className="text-[14px] font-medium">{n.title}</p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-[12px] text-muted-foreground">{n.time}</p>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
          <Link
            to="/profile"
            aria-label="Profile"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <User className="h-[18px] w-[18px]" />
          </Link>
        </div>
      </div>
    </header>
  );
}
