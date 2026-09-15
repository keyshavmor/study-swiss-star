/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { AcademicYearSelector } from "@/components/app/AcademicYearSelector";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { PageNav } from "@/components/app/Breadcrumbs";
import { AssessmentActions } from "@/components/app/AssessmentActions";
import { AssessmentDialog } from "@/components/app/AssessmentDialog";
import { EmptyState } from "@/components/app/States";
import { MiniTrendChart } from "@/components/app/StatsOverviewPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAcademicYear } from "@/lib/store/academic-year";
import {
  gradeOf,
  monthlySeries,
  percentageOf,
  summariseSubjectView,
  summariseYear,
} from "@/lib/grade-math";
import { isFailing } from "@/lib/mock/grades";
import { ASSESSMENT_TYPE_LABEL_KEY, GRADE_SOURCE_LABEL_KEY } from "@/lib/store/types";
import { SCHOOL_SUBJECTS, getSubject } from "@/lib/mock/subjects";
import { useAppData } from "@/lib/store/app-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/stats")({
  head: () => ({
    meta: [
      { title: "Statistics — Alim's Study Assistant" },
      {
        name: "description",
        content:
          "Academic statistics: school-year averages, subject comparison and every test you added, all editable.",
      },
      { property: "og:title", content: "Statistics — Alim's Study Assistant" },
      {
        property: "og:description",
        content: "School-year averages, subject comparison and full grade history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StatsPage,
});

function StatsPage() {
  const { t, formatDate } = useI18n();
  const { assessments } = useAppData();
  const { yearId, year } = useAcademicYear();
  const [subject, setSubject] = useState("all");

  const yearTests = useMemo(
    () => assessments.filter((a) => a.yearId === yearId),
    [assessments, yearId],
  );
  const summary = useMemo(() => summariseYear(yearTests, SCHOOL_SUBJECTS), [yearTests]);
  const series = useMemo(() => monthlySeries(yearTests), [yearTests]);
  const rows = yearTests
    .filter((a) => {
      if (subject === "all") return true;
      const target = SCHOOL_SUBJECTS.find((s) => s.slug === subject);
      const slugs = target?.components?.length ? target.components : [subject];
      return slugs.includes(a.subjectSlug);
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const subjectsWithGrades = SCHOOL_SUBJECTS.map((s) => ({
    subject: s,
    summary: summariseSubjectView(yearTests, s),
  })).filter((x) => x.summary.exactAverage !== null);

  return (
    <AppShell wide>
      <PageNav
        back={{ to: "/school", label: t("stats.back.school") }}
        crumbs={[
          { label: t("stats.crumb.home"), to: "/home" },
          { label: t("stats.crumb.school"), to: "/school" },
          { label: t("stats.crumb.statistics") },
        ]}
      />
      <PageHeading
        title={t("stats.title")}
        description={t("stats.description")}
        action={
          <div className="flex gap-2">
            <AssessmentDialog
              trigger={
                <Button>
                  <Plus className="h-4 w-4" />
                  {t("stats.addTest")}
                </Button>
              }
            />
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <AcademicYearSelector />
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("stats.subjectFilter.all")}</SelectItem>
            {SCHOOL_SUBJECTS.map((s) => (
              <SelectItem key={s.slug} value={s.slug}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {yearTests.length === 0 ? (
        <EmptyState
          heading={t("stats.empty.heading", { year: year.label })}
          description={t("stats.empty.description")}
          action={
            <AssessmentDialog
              trigger={
                <Button>
                  <Plus className="h-4 w-4" />
                  {t("stats.addTest")}
                </Button>
              }
            />
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KPI
              label={t("stats.kpi.yearAverage")}
              value={summary.exactYearAverage?.toFixed(2) ?? t("stats.emptyValue")}
              failing={isFailing(summary.exactYearAverage)}
            />
            <KPI label={t("stats.kpi.testsAdded")} value={String(summary.totalTests)} />
            <KPI
              label={t("stats.kpi.highestGrade")}
              value={summary.highestGrade?.toFixed(2) ?? t("stats.emptyValue")}
            />
            <KPI
              label={t("stats.kpi.lowestGrade")}
              value={summary.lowestGrade?.toFixed(2) ?? t("stats.emptyValue")}
              failing={isFailing(summary.lowestGrade)}
            />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <section className="app-card p-5">
              <h2 className="text-[18px] font-semibold tracking-tight">
                {t("stats.chart.averageOverTime")}
              </h2>
              <MiniTrendChart className="mt-4" data={series} />
            </section>

            <section className="app-card p-5">
              <h2 className="text-[18px] font-semibold tracking-tight">
                {t("stats.chart.subjectComparison")}
              </h2>
              {subjectsWithGrades.length === 0 ? (
                <p className="mt-3 text-[14px] text-muted-foreground">
                  {t("stats.chart.noSubjectAverages")}
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {subjectsWithGrades.map(({ subject: s, summary: sum }) => (
                    <li
                      key={s.slug}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium">{s.name}</p>
                        <div className="mt-1 h-2 rounded-full bg-surface-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${(((sum.exactAverage ?? 1) - 1) / 5) * 100}%`,
                              backgroundColor: s.accent,
                            }}
                          />
                        </div>
                      </div>
                      <span
                        className={cn(
                          "tabular text-[14px] font-semibold",
                          isFailing(sum.exactAverage) && "text-warning",
                        )}
                      >
                        {sum.exactAverage!.toFixed(1)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="app-card mt-5 p-5">
            <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <h2 className="text-[18px] font-semibold tracking-tight">
                {t("stats.table.yourTests")}
              </h2>
              <Badge variant="secondary">{t("stats.table.entries", { count: rows.length })}</Badge>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("stats.table.date")}</TableHead>
                    <TableHead>{t("stats.table.subject")}</TableHead>
                    <TableHead>{t("stats.table.test")}</TableHead>
                    <TableHead>{t("stats.table.type")}</TableHead>
                    <TableHead className="text-right">{t("stats.table.points")}</TableHead>
                    <TableHead className="text-right">{t("stats.table.percent")}</TableHead>
                    <TableHead className="text-right">{t("stats.table.grade")}</TableHead>
                    <TableHead>{t("stats.table.source")}</TableHead>
                    <TableHead className="text-right">{t("stats.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((a) => {
                    const grade = gradeOf(a);
                    const pct = percentageOf(a);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDate(a.date)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium">
                          {getSubject(a.subjectSlug)?.name ?? a.subjectSlug}
                        </TableCell>
                        <TableCell>{a.title}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {t(ASSESSMENT_TYPE_LABEL_KEY[a.type])}
                        </TableCell>
                        <TableCell className="tabular text-right">
                          {a.points === null ? t("stats.emptyValue") : `${a.points}/${a.maxPoints}`}
                        </TableCell>
                        <TableCell className="tabular text-right">
                          {pct === null ? t("stats.emptyValue") : `${pct}%`}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "tabular text-right font-semibold",
                            isFailing(grade) && "text-warning",
                          )}
                        >
                          {grade === null ? t("stats.emptyValue") : grade.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="whitespace-nowrap text-[11.5px]">
                            {t(GRADE_SOURCE_LABEL_KEY[a.source])}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <AssessmentActions record={a} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="mt-5 rounded-[18px] bg-surface-2 p-4 text-[14.5px]">
              <p className="font-medium">{t("stats.formula.title")}</p>
              <p className="mt-1 text-muted-foreground">{t("stats.formula.range")}</p>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}

function KPI({
  label,
  value,
  accent,
  failing,
}: {
  label: string;
  value: string;
  accent?: boolean;
  failing?: boolean;
}) {
  return (
    <div className="app-card p-5">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tabular mt-1 text-[30px] font-bold tracking-tight",
          accent && "text-chart-3",
          failing && "text-warning",
        )}
      >
        {value}
      </p>
    </div>
  );
}
