/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  BarChart3,
  Brain,
  CalendarRange,
  ChevronRight,
  ClipboardList,
  FileQuestion,
  MessageSquare,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { PageNav } from "@/components/app/Breadcrumbs";
import { AssessmentActions } from "@/components/app/AssessmentActions";
import { AssessmentDialog } from "@/components/app/AssessmentDialog";
import { FailingBadge } from "@/components/app/Badges";
import { AverageWithRounded, GradeLineChart } from "@/components/app/GradeDisplay";
import { MaterialsPanel } from "@/components/app/MaterialsPanel";
import {
  AssessmentModePanel,
  type AssessmentContext,
} from "@/components/app/assessment/AssessmentModePanel";
import { KnowledgeProfile } from "@/components/app/assessment/KnowledgeProfile";
import { AiStatusBanner } from "@/components/app/AiStatusBanner";
import { AiBlockedNotice, useAiBlocked } from "@/components/app/AiFeatureGate";
import { isAiDependentSubjectMode } from "@/lib/ai-mode-classification";
import { LEARNING_GOALS } from "@/lib/mock/materials";
import { useI18n } from "@/lib/i18n/provider";
import { EmptyState } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import type { SubjectMode } from "@/lib/mock/materials";
import { SUBJECT_MODES } from "@/lib/mock/materials";
import { gradeOf, summariseSubject, summariseSubjectView } from "@/lib/grade-math";
import { isFailing } from "@/lib/mock/grades";
import { TREND_LABEL_KEY, getSchoolSubject, getSubject } from "@/lib/mock/subjects";
import { useAppData } from "@/lib/store/app-data";
import { cn } from "@/lib/utils";
import { ASSESSMENT_TYPE_LABEL_KEY, GRADE_SOURCE_LABEL_KEY } from "@/lib/store/types";

export const Route = createFileRoute("/_authenticated/school/$subject")({
  loader: ({ params }) => {
    const subject = getSchoolSubject(params.subject);
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
  "Quick Check": Sparkles,
  "Knowledge Profile": Brain,
  "Quiz Mode": FileQuestion,
  "Mock Exam": ClipboardList,
  "Study Plan": CalendarRange,
  Statistics: BarChart3,
  "Subject Tools": Wrench,
};

/** Practice and scored quizzes share the Quiz Mode surface. */
type QuizVariant = "practice" | "quiz";

function SubjectDashboard() {
  const { t, formatDate, formatMonth } = useI18n();
  const { subject } = Route.useLoaderData();
  const components = subject.components ?? [];
  const [activeSlug, setActiveSlug] = useState<string>(components[0] ?? subject.slug);
  const [statsView, setStatsView] = useState<"combined" | "component">("combined");
  const [mode, setMode] = useState<SubjectMode>("Chat");
  const [quizVariant, setQuizVariant] = useState<QuizVariant>("practice");
  const { assessments, materials, events } = useAppData();
  /** Single readiness truth: no second AI state is invented here. */
  const aiBlocked = useAiBlocked();
  const modeNeedsAi = isAiDependentSubjectMode(mode);
  const active = (components.length ? getSubject(activeSlug) : subject) ?? subject;
  const combined = summariseSubjectView(assessments, subject);
  const grades = summariseSubject(assessments, active.slug);
  const fileCount = materials.filter((m) => m.subjectSlug === active.slug && !m.archived).length;
  const nextExam = events
    .filter((e) => e.subjectSlug === active.slug && e.category === "School exam")
    .map((e) => e.date)
    .sort()
    .find((d) => d >= new Date().toISOString().slice(0, 10));

  const assessmentContext: AssessmentContext = {
    subjectSlug: active.slug,
    subjectName: active.name,
    component: components.length ? active.name : undefined,
    language: subject.language,
    schoolLevel: null,
    academicYear: null,
    topics: [],
    learningGoals: LEARNING_GOALS.map((label, index) => ({ id: `goal-${index + 1}`, label })),
    materials: materials
      .filter((file) => file.subjectSlug === active.slug && !file.archived)
      .map((file) => ({ id: file.id, name: file.name, section: file.section })),
  };

  return (
    <AppShell wide>
      <PageNav
        back={{ to: "/school", label: t("nav.school") }}
        crumbs={[
          { label: t("nav.home"), to: "/home" },
          { label: t("nav.school"), to: "/school" },
          { label: subject.name },
        ]}
      />
      <div className="mb-6">
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
                {isFailing(components.length ? combined.exactAverage : grades.exactAverage) && (
                  <FailingBadge />
                )}
              </div>
              <p className="text-[14px] text-muted-foreground">
                {subject.subtitle ??
                  `${subject.language}${subject.languageBadge ? ` · ${subject.languageBadge}` : ""}`}
              </p>
            </div>
          </div>
          <dl className="hidden gap-6 text-right sm:flex">
            <Meta
              label={components.length ? t("subject.combinedAverage") : t("subject.average")}
              value={
                components.length
                  ? (combined.exactAverage?.toFixed(2) ?? "—")
                  : (grades.exactAverage?.toFixed(1) ?? "—")
              }
              failing={isFailing((components.length ? combined : grades).exactAverage)}
            />
            <Meta
              label={t("subject.nextExam")}
              value={nextExam ? formatDate(nextExam) : t("subject.nonePlanned")}
            />
            <Meta
              label={t("subject.materials")}
              value={
                fileCount === 0
                  ? t("subject.materials.none")
                  : fileCount === 1
                    ? t("subject.materials.fileCount", { count: fileCount })
                    : t("subject.materials.filesCount", { count: fileCount })
              }
            />
          </dl>
        </div>
      </div>

      {components.length > 0 && (
        <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
          <div className="app-card p-4">
            <p className="text-[13px] text-muted-foreground">{t("subject.activeSubject")}</p>
            <div
              role="tablist"
              aria-label={t("subject.switchAriaLabel")}
              className="mt-2.5 flex gap-2 rounded-[16px] bg-surface-2 p-1.5"
            >
              {components.map((slug: string) => {
                const componentSubject = getSubject(slug);
                const selected = slug === active.slug;
                return (
                  <button
                    key={slug}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveSlug(slug)}
                    className={cn(
                      "flex-1 rounded-[14px] px-4 py-3 text-[15px] font-semibold transition-colors duration-200",
                      selected
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {componentSubject?.name ?? slug}
                  </button>
                );
              })}
            </div>
            <p className="mt-2.5 text-[13px] text-muted-foreground">
              {t("subject.everythingBelow", { name: active.name })}
            </p>
          </div>

          <div className="app-card p-4">
            <p className="text-[13px] text-muted-foreground">{t("subject.spfOverall")}</p>
            <AverageWithRounded exact={combined.exactAverage} rounded={combined.roundedAverage} />
            <dl className="mt-3 space-y-1.5 border-t border-border pt-3">
              {combined.parts.map((part) => (
                <div key={part.slug} className="flex items-center justify-between gap-3">
                  <dt className="truncate text-[13.5px] text-muted-foreground">
                    {getSubject(part.slug)?.name ?? part.slug}
                  </dt>
                  <dd
                    className={cn(
                      "tabular text-[14px] font-semibold",
                      isFailing(part.summary.exactAverage) && "text-warning",
                    )}
                  >
                    {part.summary.exactAverage === null
                      ? "—"
                      : part.summary.exactAverage.toFixed(2)}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-2.5 text-[13px] text-muted-foreground">
              {combined.tests.length === 1
                ? t("subject.combinedTestsTotal", { count: combined.tests.length })
                : t("subject.combinedTestsTotalPlural", { count: combined.tests.length })}
            </p>
          </div>
        </div>
      )}

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
          <h2 className="text-[19px] font-semibold tracking-tight">
            {mode}
            {components.length > 0 && mode !== "Statistics" && (
              <span className="ml-2 text-[14px] font-medium text-muted-foreground">
                {active.name}
              </span>
            )}
          </h2>
          {components.length > 0 && mode === "Statistics" && (
            <div className="mt-3 flex flex-wrap gap-2 rounded-[16px] bg-surface-2 p-1.5">
              <button
                type="button"
                onClick={() => setStatsView("combined")}
                className={cn(
                  "rounded-[14px] px-4 py-2.5 text-[14px] font-semibold transition-colors duration-200",
                  statsView === "combined"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t("subject.combinedSpf")}
              </button>
              {components.map((slug: string) => {
                const selected = statsView === "component" && slug === active.slug;
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => {
                      setStatsView("component");
                      setActiveSlug(slug);
                    }}
                    className={cn(
                      "rounded-[14px] px-4 py-2.5 text-[14px] font-semibold transition-colors duration-200",
                      selected
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {getSubject(slug)?.name ?? slug}
                  </button>
                );
              })}
            </div>
          )}
          {mode === "Chat" ? (
            <div className="mt-4">
              <p className="text-[15px] text-muted-foreground">
                {t("subject.chatDescription", { name: active.name })}
              </p>
              <Button asChild className="mt-5">
                <Link to="/chat">{t("subject.openStudyChat")}</Link>
              </Button>
            </div>
          ) : mode === "Statistics" && components.length > 0 && statsView === "combined" ? (
            <div className="mt-4 space-y-5">
              <div>
                <p className="text-[13px] text-muted-foreground">{t("subject.combinedAverage")}</p>
                <AverageWithRounded
                  exact={combined.exactAverage}
                  rounded={combined.roundedAverage}
                  size="lg"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {combined.parts.map((part) => (
                  <div key={part.slug} className="rounded-[14px] bg-surface-2 p-4">
                    <p className="text-[13px] text-muted-foreground">
                      {getSubject(part.slug)?.name ?? part.slug}
                    </p>
                    <p
                      className={cn(
                        "tabular mt-1 text-[24px] font-bold tracking-tight",
                        isFailing(part.summary.exactAverage) && "text-warning",
                      )}
                    >
                      {part.summary.exactAverage === null
                        ? "—"
                        : part.summary.exactAverage.toFixed(2)}
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      {part.summary.tests.length === 1
                        ? t("subject.testCountSingular", { count: part.summary.tests.length })
                        : t("subject.testCountPlural", { count: part.summary.tests.length })}{" "}
                      ·{" "}
                      {part.summary.trend
                        ? t(TREND_LABEL_KEY[part.summary.trend])
                        : t("subject.noTrendYet")}
                    </p>
                  </div>
                ))}
              </div>
              {combined.counted.length > 1 && (
                <GradeLineChart
                  data={combined.counted.map((t) => ({
                    label: formatMonth(t.date),
                    value: gradeOf(t) as number,
                  }))}
                />
              )}
              <p className="text-[13.5px] text-muted-foreground">
                {t("subject.combinedTrend", {
                  count: combined.tests.length,
                  trend: combined.trend
                    ? t(TREND_LABEL_KEY[combined.trend])
                    : t("subject.noTrendYet"),
                })}
              </p>
            </div>
          ) : mode === "Statistics" ? (
            <div className="mt-4 space-y-5">
              {grades.tests.length === 0 ? (
                <EmptyState
                  className="border-0 bg-surface-2"
                  heading={t("subject.noTestsYet.heading")}
                  description={t("subject.noTestsYet.description", { name: active.name })}
                  action={
                    <AssessmentDialog
                      subjectSlug={active.slug}
                      trigger={<Button>{t("subject.addTest")}</Button>}
                    />
                  }
                />
              ) : (
                <>
                  <AverageWithRounded
                    exact={grades.exactAverage}
                    rounded={grades.roundedAverage}
                    size="lg"
                  />
                  {grades.counted.length > 1 && (
                    <GradeLineChart
                      data={grades.counted.map((t) => ({
                        label: formatMonth(t.date),
                        value: gradeOf(t) as number,
                      }))}
                    />
                  )}
                  <div className="space-y-2">
                    {grades.tests.map((test) => {
                      const grade = gradeOf(test);
                      return (
                        <div
                          key={test.id}
                          className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-3 rounded-[14px] bg-surface-2 px-3.5 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-medium">{test.title}</p>
                            <p className="text-[12.5px] text-muted-foreground">
                              {formatDate(test.date)} · {t(ASSESSMENT_TYPE_LABEL_KEY[test.type])} ·{" "}
                              {t(GRADE_SOURCE_LABEL_KEY[test.source])}
                            </p>
                          </div>
                          <p
                            className={cn(
                              "tabular text-[15px] font-semibold",
                              isFailing(grade) && "text-warning",
                            )}
                          >
                            {grade === null ? "—" : grade.toFixed(1)}
                          </p>
                          <AssessmentActions record={test} />
                        </div>
                      );
                    })}
                    <AssessmentDialog
                      subjectSlug={active.slug}
                      trigger={
                        <Button size="sm" variant="secondary">
                          {t("subject.addTest")}
                        </Button>
                      }
                    />
                  </div>
                </>
              )}
            </div>
          ) : mode === "Quick Check" ? (
            <div className="mt-4">
              <AssessmentModePanel kind="quick_check" context={assessmentContext} />
            </div>
          ) : mode === "Knowledge Profile" ? (
            <div className="mt-4">
              <KnowledgeProfile entries={[]} subjectName={active.name} />
            </div>
          ) : mode === "Quiz Mode" ? (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2 rounded-[16px] bg-surface-2 p-1.5">
                {(["practice", "quiz"] as const).map((variant) => (
                  <button
                    key={variant}
                    type="button"
                    onClick={() => setQuizVariant(variant)}
                    className={cn(
                      "rounded-[14px] px-4 py-2.5 text-[14px] font-semibold transition-colors duration-200",
                      quizVariant === variant
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {variant === "practice"
                      ? t("assessment.mode.practice")
                      : t("assessment.mode.quiz")}
                  </button>
                ))}
              </div>
              <AssessmentModePanel
                key={quizVariant}
                kind={quizVariant === "practice" ? "practice" : "quiz"}
                context={assessmentContext}
              />
            </div>
          ) : mode === "Mock Exam" ? (
            <div className="mt-4">
              <AssessmentModePanel kind="mock_exam" context={assessmentContext} />
            </div>
          ) : (
            <EmptyState
              className="mt-6 border-0 bg-surface-2"
              heading={t("subject.comingNext", { mode })}
              description={t("subject.comingNextDescription")}
              action={<Button variant="secondary">{t("subject.notifyMe")}</Button>}
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
  const { t } = useI18n();
  return (
    <AppShell>
      <EmptyState
        heading={t("subject.notFound.heading")}
        description={t("subject.notFound.description")}
        action={
          <Button asChild>
            <Link to="/school">{t("subject.notFound.backButton")}</Link>
          </Button>
        }
      />
    </AppShell>
  );
}
