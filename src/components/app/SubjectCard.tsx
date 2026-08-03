import { Link } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { ArrowRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { Subject } from "@/lib/mock/subjects";
import { SUBJECTS } from "@/lib/mock/subjects";
import { cn } from "@/lib/utils";

function TrendBadge({ trend }: { trend: Subject["trend"] }) {
  const map = {
    Improving: { icon: TrendingUp, className: "text-chart-3" },
    Stable: { icon: Minus, className: "text-muted-foreground" },
    "Needs focus": { icon: TrendingDown, className: "text-chart-4" },
  } as const;
  const { icon: Icon, className } = map[trend];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] font-medium", className)}>
      <Icon className="h-4 w-4" />
      {trend}
    </span>
  );
}

export function SubjectCard({ subject }: { subject: Subject }) {
  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[subject.icon] ?? Icons.BookOpen;

  return (
    <Link
      to="/school/$subject"
      params={{ subject: subject.slug }}
      className="app-card app-card-interactive group flex flex-col gap-4 p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${subject.accent}1A`, color: subject.accent }}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[16.5px] font-semibold tracking-tight">{subject.name}</p>
            <p className="text-[13px] text-muted-foreground">{subject.language}</p>
          </div>
        </div>
        <ArrowRight className="mt-3 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
      </div>

      {subject.languageBadge && (
        <span className="w-fit rounded-full bg-surface-2 px-3 py-1 text-[12px] font-medium text-muted-foreground">
          {subject.languageBadge}
        </span>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
        <div>
          <dt className="text-muted-foreground">Average</dt>
          <dd className="tabular font-semibold">{subject.average?.toFixed(1) ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Latest grade</dt>
          <dd className="tabular font-semibold">{subject.latestGrade?.toFixed(2) ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Next exam</dt>
          <dd className="font-medium">{subject.nextExam ?? "None planned"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Materials</dt>
          <dd className="font-medium">
            {subject.materials} files · {subject.materialStatus}
          </dd>
        </div>
      </dl>

      <TrendBadge trend={subject.trend} />
    </Link>
  );
}

export function SubjectGrid({ subjects = SUBJECTS }: { subjects?: Subject[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {subjects.map((subject) => (
        <SubjectCard key={subject.slug} subject={subject} />
      ))}
    </div>
  );
}
