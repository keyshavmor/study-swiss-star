import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  BarChart3,
  Brain,
  CalendarRange,
  ChevronRight,
  ClipboardList,
  FileQuestion,
  MessageSquare,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { DemoBadge, FailingBadge, LockedBadge } from "@/components/app/Badges";
import { AverageWithRounded, GradeLineChart } from "@/components/app/GradeDisplay";
import { MaterialsPanel } from "@/components/app/MaterialsPanel";
import { EmptyState } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import type { SubjectMode } from "@/lib/mock/materials";
import { SUBJECT_MODES } from "@/lib/mock/materials";
import { getSubjectGrades, isFailing } from "@/lib/mock/grades";
import { getSubject } from "@/lib/mock/subjects";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/school/$subject")({
  loader: ({ params }) => {
    const subject = getSubject(params.subject);
    if (!subject) throw notFound();
    return { subject };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.subject.name ?? "Subject";
    return {
      meta: [
        { title: `${name} — Alim's Study Assistant` },
        {
          name: "description",
          content: `${name} dashboard: chat, quizzes, exams, study plan, statistics and subject tools.`,
        },
        { property: "og:title", content: `${name} — Alim's Study Assistant` },
        {
          property: "og:description",
          content: `${name} dashboard with study modes and materials.`,
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: SubjectDashboard,
  notFoundComponent: SubjectNotFound,
});

const MODE_ICONS: Record<SubjectMode, typeof MessageSquare> = {
  Chat: MessageSquare,
  "Knowledge Analysis": Brain,
  "Quiz Mode": FileQuestion,
  "Exam Mode": ClipboardList,
  "Study Plan": CalendarRange,
  Statistics: BarChart3,
  "Subject Tools": Wrench,
};

function SubjectDashboard() {
  const { subject } = Route.useLoaderData();
  const [mode, setMode] = useState<SubjectMode>("Chat");
  const grades = getSubjectGrades(subject.slug);

  return (
    <AppShell wide>
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-1 text-[13.5px] text-muted-foreground">
          <Link to="/school" className="hover:text-foreground">
            School
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{subject.name}</span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="h-11 w-11 shrink-0 rounded-2xl"
              style={{ backgroundColor: subject.accent }}
            />
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2.5">
                <h1 className="truncate text-[26px] font-bold tracking-[-0.025em] sm:text-[32px]">
                  {subject.name}
                </h1>
                <DemoBadge />
                {isFailing(grades.exactAverage) && <FailingBadge />}
              </div>
              <p className="text-[14px] text-muted-foreground">
                {subject.language}
                {subject.languageBadge ? ` · ${subject.languageBadge}` : ""}
              </p>
            </div>
          </div>
          <dl className="hidden gap-6 text-right sm:flex">
            <Meta
              label="Average"
              value={subject.average?.toFixed(1) ?? "—"}
              failing={isFailing(subject.average)}
            />
            <Meta
              label="Next exam"
              value={subject.nextExamInDays ? `${subject.nextExamInDays} days` : "None"}
            />
            <Meta label="Materials" value={subject.materialStatus} />
          </dl>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)_360px]">
        <nav className="app-card h-fit p-2 xl:sticky xl:top-24">
          <ul className="flex gap-1 overflow-x-auto xl:flex-col xl:overflow-visible">
            {SUBJECT_MODES.map((m) => {
              const Icon = MODE_ICONS[m];
              return (
                <li key={m} className="shrink-0 xl:shrink">
                  <button
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn(
                      "flex w-full items-center gap-2.5 whitespace-nowrap rounded-[14px] px-3.5 py-2.5 text-[14.5px] font-medium transition-colors duration-200",
                      mode === m
                        ? "bg-thread-active text-foreground"
                        : "text-muted-foreground hover:bg-hover hover:text-foreground",
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {m}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section className="app-card min-h-[420px] p-5">
          <h2 className="text-[19px] font-semibold tracking-tight">{mode}</h2>
          {mode === "Chat" ? (
            <div className="mt-4">
              <p className="text-[15px] text-muted-foreground">
                Ask questions about {subject.name} and get answers grounded in your uploaded
                materials, the official syllabus and approved online sources.
              </p>
              <Button asChild className="mt-5">
                <Link to="/chat">Open study chat</Link>
              </Button>
            </div>
          ) : mode === "Statistics" ? (
            <div className="mt-4 space-y-5">
              <AverageWithRounded
                exact={grades.exactAverage}
                rounded={grades.roundedAverage}
                size="lg"
              />
              {grades.tests.length > 1 && (
                <GradeLineChart
                  data={grades.tests.map((t) => ({ label: t.monthYear, value: t.grade }))}
                />
              )}
              <div className="space-y-2">
                <p className="text-[13px] text-muted-foreground">
                  Recorded tests are permanent and read-only.
                </p>
                {grades.tests.map((test) => (
                  <div
                    key={test.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-[14px] bg-surface-2 px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium">{test.title}</p>
                      <p className="text-[12.5px] text-muted-foreground">
                        {test.date} · {test.type} · {test.source}
                      </p>
                      <div className="mt-1.5">
                        <LockedBadge />
                      </div>
                    </div>
                    <p
                      className={cn(
                        "tabular text-[15px] font-semibold",
                        isFailing(test.grade) && "text-warning",
                      )}
                    >
                      {test.grade.toFixed(1)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              className="mt-6 border-0 bg-surface-2"
              heading={`${mode} is coming next`}
              description="This mode is part of the next prototype pass and will appear here in the same dashboard."
              action={<Button variant="secondary">Notify me</Button>}
            />
          )}
        </section>

        <MaterialsPanel className="h-fit xl:sticky xl:top-24" />
      </div>
    </AppShell>
  );
}

function Meta({ label, value, failing }: { label: string; value: string; failing?: boolean }) {
  return (
    <div>
      <dt className="text-[12.5px] text-muted-foreground">{label}</dt>
      <dd className={cn("tabular text-[15.5px] font-semibold", failing && "text-warning")}>
        {value}
      </dd>
    </div>
  );
}

function SubjectNotFound() {
  return (
    <AppShell>
      <EmptyState
        heading="Subject not found"
        description="This subject does not exist in the prototype."
        action={
          <Button asChild>
            <Link to="/school">Back to School</Link>
          </Button>
        }
      />
    </AppShell>
  );
}
