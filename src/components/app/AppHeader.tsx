import { Link, useRouterState } from "@tanstack/react-router";
import { GraduationCap, LogOut, Menu, Settings, User } from "lucide-react";
import { useState } from "react";
import { DemoModeButton } from "@/components/app/DemoMode";
import { NotificationCenter } from "@/components/app/NotificationCenter";
import { LiveClock } from "@/components/app/LiveClock";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  const { profile } = useAppData();
  const displayName = profile.preferredName || profile.fullName || "Your profile";

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
                  to="/profile"
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-[16px] font-medium text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
                >
                  Profile
                </Link>
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
          <LiveClock className="mr-1 hidden sm:flex" />
          <DemoModeButton className="hidden lg:inline-flex" />
          <ThemeToggle className="hidden sm:inline-flex" />

          <NotificationCenter />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Profile menu"
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
                  View profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/auth">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
