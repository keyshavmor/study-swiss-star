import type { Assessment } from "@/lib/store/types";
import { PASSING_THRESHOLD, roundToHalf } from "@/lib/mock/grades";

/** Swiss formula: 1.0 + 5.0 × (points ÷ maximum points), clamped to 1.0–6.0. */
export function pointsToGrade(points: number | null, maxPoints: number | null): number | null {
  if (points === null || maxPoints === null || !maxPoints) return null;
  const raw = 1 + 5 * (points / maxPoints);
  return Math.min(6, Math.max(1, raw));
}

/** The effective grade of an assessment: teacher grade wins over points. */
export function gradeOf(assessment: Assessment): number | null {
  if (assessment.teacherGrade !== null) return assessment.teacherGrade;
  return pointsToGrade(assessment.points, assessment.maxPoints);
}

export function percentageOf(assessment: Assessment): number | null {
  if (assessment.points === null || !assessment.maxPoints) return null;
  return Math.round((assessment.points / assessment.maxPoints) * 100);
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatMonthYear(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(d);
}

export interface SubjectSummary {
  tests: Assessment[];
  counted: Assessment[];
  exactAverage: number | null;
  roundedAverage: number | null;
  latest: Assessment | null;
  lastThree: number[];
  monthlyChange: number | null;
  trend: "Improving" | "Stable" | "Needs focus" | null;
}

function byDateAsc(a: Assessment, b: Assessment) {
  return a.date.localeCompare(b.date);
}

export function summariseSubject(all: Assessment[], subjectSlug: string): SubjectSummary {
  const tests = all.filter((t) => t.subjectSlug === subjectSlug).sort(byDateAsc);
  const counted = tests.filter((t) => t.includeInStats && gradeOf(t) !== null);

  if (counted.length === 0) {
    return {
      tests,
      counted,
      exactAverage: null,
      roundedAverage: null,
      latest: tests[tests.length - 1] ?? null,
      lastThree: [],
      monthlyChange: null,
      trend: null,
    };
  }

  const weightSum = counted.reduce((sum, t) => sum + (t.weight || 1), 0);
  const exact =
    counted.reduce((sum, t) => sum + (gradeOf(t) as number) * (t.weight || 1), 0) / weightSum;

  const grades = counted.map((t) => gradeOf(t) as number);
  const lastThree = grades.slice(-3);

  let monthlyChange: number | null = null;
  if (grades.length >= 2) {
    const previous = grades.slice(0, -1);
    const previousAvg = previous.reduce((s, g) => s + g, 0) / previous.length;
    monthlyChange = exact - previousAvg;
  }

  const trend =
    monthlyChange === null || Math.abs(monthlyChange) < 0.05
      ? "Stable"
      : monthlyChange > 0
        ? "Improving"
        : "Needs focus";

  return {
    tests,
    counted,
    exactAverage: exact,
    roundedAverage: roundToHalf(exact),
    latest: counted[counted.length - 1] ?? null,
    lastThree,
    monthlyChange,
    trend,
  };
}

export interface YearSummary {
  subjectAverages: { slug: string; name: string; exact: number; rounded: number }[];
  exactYearAverage: number | null;
  roundedYearAverage: number | null;
  totalTests: number;
  highestGrade: number | null;
  lowestGrade: number | null;
  failingSubjects: string[];
}

export function summariseYear(
  all: Assessment[],
  subjects: { slug: string; name: string }[],
): YearSummary {
  const subjectAverages = subjects
    .map((s) => {
      const summary = summariseSubject(all, s.slug);
      if (summary.exactAverage === null) return null;
      return {
        slug: s.slug,
        name: s.name,
        exact: summary.exactAverage,
        rounded: summary.roundedAverage as number,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const counted = all.filter((t) => t.includeInStats && gradeOf(t) !== null);
  const grades = counted.map((t) => gradeOf(t) as number);

  const exactYearAverage =
    subjectAverages.length === 0
      ? null
      : subjectAverages.reduce((s, x) => s + x.rounded, 0) / subjectAverages.length;

  return {
    subjectAverages,
    exactYearAverage,
    roundedYearAverage: exactYearAverage === null ? null : roundToHalf(exactYearAverage),
    totalTests: all.length,
    highestGrade: grades.length ? Math.max(...grades) : null,
    lowestGrade: grades.length ? Math.min(...grades) : null,
    failingSubjects: subjectAverages.filter((s) => s.rounded < PASSING_THRESHOLD).map((s) => s.name),
  };
}

/** Average grade per calendar month, oldest first. */
export function monthlySeries(all: Assessment[]): { label: string; value: number }[] {
  const buckets = new Map<string, number[]>();
  all
    .filter((t) => t.includeInStats && gradeOf(t) !== null)
    .sort(byDateAsc)
    .forEach((t) => {
      const key = t.date.slice(0, 7);
      const list = buckets.get(key) ?? [];
      list.push(gradeOf(t) as number);
      buckets.set(key, list);
    });
  return [...buckets.entries()].map(([key, values]) => ({
    label: new Intl.DateTimeFormat("en-GB", { month: "short" }).format(
      new Date(`${key}-01T00:00:00`),
    ),
    value: values.reduce((s, v) => s + v, 0) / values.length,
  }));
}
