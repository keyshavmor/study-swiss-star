/** Alim application component for study, planning, profile, or navigation workflows. */
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";

export interface Crumb {
  label: string;
  to?: string;
  params?: Record<string, string>;
}

/** Clickable breadcrumb trail, e.g. Home / School / Biology. */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  const { t } = useI18n();
  return (
    <nav
      aria-label={t("misc.breadcrumb.label")}
      className={cn(
        "flex flex-wrap items-center gap-1 text-[13.5px] text-muted-foreground",
        className,
      )}
    >
      {items.map((item, i) => (
        <Fragment key={`${item.label}-${i}`}>
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />}
          {item.to && i < items.length - 1 ? (
            <Link
              to={item.to}
              params={item.params as never}
              className="rounded transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

/** "← Back to X" link shown on every secondary page. */
export function BackLink({
  to,
  params,
  label,
  className,
}: {
  to: string;
  params?: Record<string, string> | undefined;
  label: string;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <Link
      to={to}
      params={params as never}
      className={cn(
        "inline-flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      {t("misc.breadcrumb.backTo", { label })}
    </Link>
  );
}

/** Back link + breadcrumbs stacked above a page title. */
export function PageNav({
  back,
  crumbs,
  className,
}: {
  back: { to: string; params?: Record<string, string> | undefined; label: string };
  crumbs: Crumb[];
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      <BackLink to={back.to} params={back.params} label={back.label} />
      <span className="hidden h-4 w-px bg-border sm:block" />
      <Breadcrumbs items={crumbs} />
    </div>
  );
}
