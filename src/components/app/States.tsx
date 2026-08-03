import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

function StateBlock({
  icon,
  tone,
  heading,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  tone: string;
  heading: string;
  description: string;
  action?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[22px] border border-border bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", tone)}>
        {icon}
      </span>
      <h3 className="text-[17px] font-semibold tracking-tight">{heading}</h3>
      <p className="max-w-sm text-[14.5px] text-muted-foreground">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  heading,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  heading: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <StateBlock
      className={className}
      icon={<Icon className="h-6 w-6 text-muted-foreground" />}
      tone="bg-surface-2"
      heading={heading}
      description={description}
      action={action}
    />
  );
}

export function ErrorState({
  heading,
  description,
  action,
  className,
}: {
  heading: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <StateBlock
      className={className}
      icon={<AlertTriangle className="h-6 w-6 text-destructive" />}
      tone="bg-destructive/10"
      heading={heading}
      description={description}
      action={action}
    />
  );
}

export function SuccessState({
  heading,
  description,
  action,
  className,
}: {
  heading: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <StateBlock
      className={className}
      icon={<CheckCircle2 className="h-6 w-6 text-primary" />}
      tone="bg-primary/10"
      heading={heading}
      description={description}
      action={action}
    />
  );
}
