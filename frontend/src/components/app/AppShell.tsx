/** Alim application component for study, planning, profile, or navigation workflows. */
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/app/AppHeader";
import { MobileNavigation } from "@/components/app/MobileNavigation";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  className,
  wide,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main
        className={cn(
          "mx-auto w-full flex-1 px-5 pb-28 pt-8 sm:px-6 sm:pb-16",
          wide ? "max-w-[1500px]" : "max-w-7xl",
          className,
        )}
      >
        {children}
      </main>
      <AppFooter />
      <MobileNavigation />
    </div>
  );
}

export function AppFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-5 text-[13.5px] text-muted-foreground sm:px-6">
        <span>Alim's Study Assistant — study prototype</span>
        <div className="flex items-center gap-5">
          <Link to="/feedback" className="transition-colors hover:text-foreground">
            Feedback
          </Link>
          <Link to="/help" className="transition-colors hover:text-foreground">
            Help
          </Link>
          <Link to="/diagnostics" className="transition-colors hover:text-foreground">
            Diagnostics
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function PageHeading({
  title,
  description,
  breadcrumb,
  action,
}: {
  title: string;
  description?: string;
  breadcrumb?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0">
        {breadcrumb && <div className="mb-2 text-[13.5px] text-muted-foreground">{breadcrumb}</div>}
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.025em] sm:text-[34px]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-[15.5px] text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
