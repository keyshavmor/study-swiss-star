import { Link } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import {
  ArrowRight,
  ChevronDown,
  Minus,
  Plus,
  TrendingDown,
  TrendingUp,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { AverageWithRounded } from "@/components/app/GradeDisplay";
import { Button } from "@/components/ui/button";
import { getSubjectGrades } from "@/lib/mock/grades";
import type { Subject } from "@/lib/mock/subjects";
import { SUBJECTS } from "@/lib/mock/subjects";
import { cn } from "@/lib/utils";

function TrendBadge({ trend, change }: { trend: Subject["trend"]; change: number | null }) {
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
      {change !== null && (
        <span className="tabular">
          ({change >= 0 ? "+" : ""}
          {change.toFixed(1)})
        </span>
      )}
    </span>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = 1;
  const max = 6;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 100 - ((v - min) / (max - min)) * 100;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-8 w-20" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function SubjectCard({ subject }: { subject: Subject }) {
  const [open, setOpen] = useState(false);
  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[subject.icon] ?? Icons.BookOpen;
  const grades = getSubjectGrades(subject.slug);

  return (
    <article className="app-card app-card-interactive group relative flex flex-col gap-4 p-5">
      {/* Whole-card link overlay — content sits above it and re-enables pointer events where needed. */}
      <Link
        to="/school/$subject"
        params={{ subject: subject.slug }}
        className="absolute inset-0 z-0 rounded-[inherit]"
        aria-label={`Open ${subject.name}`}
      />

      <div className="pointer-events-none relative z-10 flex flex-col gap-4">
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
              <p className="text-[13px] text-muted-foreground">
                {subject.language}
                {subject.languageBadge ? ` · ${subject.languageBadge}` : ""}
              </p>
            </div>
          </div>
          <ArrowRight className="mt-3 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
        </div>

        {grades.exactAverage === null ? (
          <div className="rounded-[18px] bg-surface-2 p-4">
            <p className="text-[14px] text-muted-foreground">No school-test grades recorded yet.</p>
            <div className="pointer-events-auto mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={(e) => e.preventDefault()}>
                <Plus className="h-4 w-4" />
                Add Grade
              </Button>
              <Button size="sm" variant="ghost" onClick={(e) => e.preventDefault()}>
                <Upload className="h-4 w-4" />
                Upload Transcript
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-[18px] bg-surface-2 p-4">
            <AverageWithRounded exact={grades.exactAverage} rounded={grades.roundedAverage} />
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12.5px] text-muted-foreground">Last three tests</p>
                <p className="tabular text-[14px] font-medium">
                  {grades.lastThree.map((g) => g.toFixed(1)).join(" → ")}
                </p>
              </div>
              <Sparkline values={grades.lastThree} />
            </div>
          </div>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
          <div>
            <dt className="text-muted-foreground">Latest test</dt>
            <dd className="tabular font-semibold">{grades.latest?.grade.toFixed(1) ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Tests recorded</dt>
            <dd className="tabular font-semibold">{grades.tests.length}</dd>
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

        <TrendBadge trend={subject.trend} change={grades.monthlyChange} />

        {grades.tests.length > 0 && (
          <div className="pointer-events-auto border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-2 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Grade history ({grades.tests.length})
              <ChevronDown
                className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")}
              />
            </button>

            {open && (
              <div className="mt-3 space-y-2">
                {grades.tests.map((test) => (
                  <div key={test.id} className="rounded-[14px] bg-surface-2 px-3.5 py-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium">{test.title}</p>
                        <p className="text-[12.5px] text-muted-foreground">
                          {test.date} · {test.type} · {test.monthYear}
                        </p>
                        <p className="text-[12.5px] text-muted-foreground">{test.source}</p>
                      </div>
                      <div className="text-right">
                        <p className="tabular text-[15px] font-semibold">
                          {test.grade.toFixed(1)}
                        </p>
                        <p className="tabular text-[12.5px] text-muted-foreground">
                          {test.points === null ? "—" : `${test.points} / ${test.maxPoints}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <Link
                  to="/school/$subject"
                  params={{ subject: subject.slug }}
                  search={{ mode: "statistics" }}
                  className="inline-flex items-center gap-1.5 text-[14px] font-medium text-primary hover:underline"
                >
                  View Full {subject.name} Statistics
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function SubjectGrid({ subjects = SUBJECTS }: { subjects?: Subject[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      {subjects.map((subject) => (
        <SubjectCard key={subject.slug} subject={subject} />
      ))}
    </div>
  );
}
