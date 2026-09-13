/**
 * Mock grade records per subject. Prototype only — no persistence, no real
 * calculations beyond simple presentation helpers.
 */

import { SUBJECTS } from "@/lib/mock/subjects";

export type GradeSourceLabel =
  "Teacher grade" | "Calculated from points" | "AI practice assessment";

export interface TestRecord {
  id: string;
  title: string;
  date: string;
  monthYear: string;
  type: string;
  grade: number;
  points: number | null;
  maxPoints: number | null;
  source: GradeSourceLabel;
}

/** Rounds a grade to the nearest 0.5 (halves always round up). */
export function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export function formatHalf(value: number): string {
  return value.toFixed(1);
}

export const ROUNDING_EXAMPLES = [
  "4.24 → 4.0",
  "4.25 → 4.5",
  "4.74 → 4.5",
  "4.75 → 5.0",
  "5.17 → 5.0",
  "5.28 → 5.5",
];

/** Swiss scale: grades below 4.0 are failing. */
export const PASSING_THRESHOLD = 4.0;

export function isFailing(value: number | null | undefined): boolean {
  return typeof value === "number" && value < PASSING_THRESHOLD;
}

export const FAILING_TOOLTIP =
  "In the Swiss grading system used here, grades below 4.0 are failing grades.";

export const DEMO_TOOLTIP =
  "Example content shown while Demo Mode is on. Turn Demo Mode off to return to your own data.";

export const ROUNDED_TOOLTIP =
  "This is the subject average rounded to the nearest 0.5. The rounded value is used when calculating the yearly average.";

type Seed = {
  title: string;
  date: string;
  type: string;
  grade: number;
  points?: [number, number];
  source: GradeSourceLabel;
};

function record(slug: string, index: number, seed: Seed): TestRecord {
  const monthYear = seed.date.split(" ").slice(1).join(" ");
  return {
    id: `${slug}-t${index + 1}`,
    title: seed.title,
    date: seed.date,
    monthYear,
    type: seed.type,
    grade: seed.grade,
    points: seed.points ? seed.points[0] : null,
    maxPoints: seed.points ? seed.points[1] : null,
    source: seed.source,
  };
}

const SEEDS: Record<string, Seed[]> = {
  mathematics: [
    {
      title: "Linear systems test",
      date: "18 September 2025",
      type: "Written exam",
      grade: 5.0,
      points: [36, 45],
      source: "Calculated from points",
    },
    {
      title: "Functions and graphs",
      date: "6 November 2025",
      type: "Written exam",
      grade: 5.5,
      points: [41, 46],
      source: "Calculated from points",
    },
    {
      title: "Trigonometry test",
      date: "22 January 2026",
      type: "Written exam",
      grade: 5.2,
      points: [38, 44],
      source: "Calculated from points",
    },
    {
      title: "Oral problem solving",
      date: "12 March 2026",
      type: "Oral exam",
      grade: 5.5,
      source: "Teacher grade",
    },
    {
      title: "Quadratic functions",
      date: "14 May 2026",
      type: "Written exam",
      grade: 5.2,
      points: [40, 48],
      source: "Calculated from points",
    },
  ],
  physics: [
    {
      title: "Kinematics test",
      date: "25 September 2025",
      type: "Written exam",
      grade: 4.5,
      points: [30, 42],
      source: "Calculated from points",
    },
    {
      title: "Kinematics lab report",
      date: "13 November 2025",
      type: "Laboratory work",
      grade: 5.0,
      points: [27, 30],
      source: "Calculated from points",
    },
    {
      title: "Forces and momentum",
      date: "5 February 2026",
      type: "Written exam",
      grade: 4.8,
      points: [33, 44],
      source: "Calculated from points",
    },
    {
      title: "Energy and work",
      date: "23 April 2026",
      type: "Written exam",
      grade: 5.0,
      points: [36, 45],
      source: "Calculated from points",
    },
  ],
  english: [
    {
      title: "Reading comprehension",
      date: "30 September 2025",
      type: "Written exam",
      grade: 5.5,
      points: [44, 50],
      source: "Calculated from points",
    },
    {
      title: "Essay: dystopian fiction",
      date: "27 November 2025",
      type: "Essay",
      grade: 5.0,
      source: "Teacher grade",
    },
    {
      title: "Oral presentation",
      date: "19 February 2026",
      type: "Presentation",
      grade: 5.5,
      source: "Teacher grade",
    },
    {
      title: "Grammar and vocabulary",
      date: "7 May 2026",
      type: "Written exam",
      grade: 5.0,
      points: [38, 45],
      source: "Calculated from points",
    },
    {
      title: "Literature analysis",
      date: "16 June 2026",
      type: "Essay",
      grade: 5.5,
      source: "Teacher grade",
    },
  ],
  history: [
    {
      title: "Industrial revolution essay",
      date: "19 September 2025",
      type: "Essay",
      grade: 4.5,
      source: "Teacher grade",
    },
    {
      title: "Sources and interpretation",
      date: "21 November 2025",
      type: "Written exam",
      grade: 4.5,
      points: [28, 42],
      source: "Calculated from points",
    },
    {
      title: "World War I test",
      date: "13 February 2026",
      type: "Written exam",
      grade: 5.0,
      points: [35, 44],
      source: "Calculated from points",
    },
    {
      title: "Oral exam: Cold War",
      date: "8 May 2026",
      type: "Oral exam",
      grade: 4.5,
      source: "Teacher grade",
    },
  ],
  french: [
    {
      title: "Vocabulaire et grammaire",
      date: "2 October 2025",
      type: "Written exam",
      grade: 3.5,
      points: [20, 40],
      source: "Calculated from points",
    },
    {
      title: "Compréhension écrite",
      date: "4 December 2025",
      type: "Written exam",
      grade: 3.6,
      points: [22, 42],
      source: "Calculated from points",
    },
    {
      title: "Présentation orale: ma région",
      date: "26 February 2026",
      type: "Oral exam",
      grade: 4.0,
      source: "Teacher grade",
    },
    { title: "Rédaction", date: "21 May 2026", type: "Essay", grade: 4.4, source: "Teacher grade" },
  ],
  german: [
    {
      title: "Textanalyse",
      date: "22 September 2025",
      type: "Essay",
      grade: 5.2,
      points: [38, 45],
      source: "Calculated from points",
    },
    {
      title: "Grammatiktest",
      date: "18 November 2025",
      type: "Written exam",
      grade: 5.0,
      points: [36, 45],
      source: "Calculated from points",
    },
    {
      title: "Erörterung",
      date: "10 February 2026",
      type: "Essay",
      grade: 5.5,
      source: "Teacher grade",
    },
    {
      title: "Literaturprüfung",
      date: "28 April 2026",
      type: "Written exam",
      grade: 5.0,
      points: [37, 46],
      source: "Calculated from points",
    },
    {
      title: "Mündliche Prüfung",
      date: "9 June 2026",
      type: "Oral exam",
      grade: 5.0,
      source: "Teacher grade",
    },
  ],
  biology: [
    {
      title: "Cell biology test",
      date: "14 March 2026",
      type: "Written exam",
      grade: 5.2,
      points: [42, 50],
      source: "Calculated from points",
    },
    {
      title: "Genetics test",
      date: "8 May 2026",
      type: "Written exam",
      grade: 5.3,
      points: [31, 36],
      source: "Calculated from points",
    },
    {
      title: "Oral presentation",
      date: "20 June 2026",
      type: "Presentation",
      grade: 5.0,
      source: "Teacher grade",
    },
    {
      title: "Ecology field study",
      date: "2 October 2025",
      type: "Practical assessment",
      grade: 5.5,
      source: "Teacher grade",
    },
    {
      title: "Photosynthesis test",
      date: "3 December 2025",
      type: "Written exam",
      grade: 4.8,
      points: [33, 44],
      source: "Calculated from points",
    },
    {
      title: "Human physiology",
      date: "11 February 2026",
      type: "Written exam",
      grade: 5.2,
      points: [40, 48],
      source: "Calculated from points",
    },
  ],
  "spf-biology": [
    {
      title: "Molecular biology test",
      date: "9 October 2025",
      type: "Written exam",
      grade: 5.0,
      points: [35, 44],
      source: "Calculated from points",
    },
    {
      title: "Laboratory protocol",
      date: "16 January 2026",
      type: "Laboratory work",
      grade: 5.0,
      source: "Teacher grade",
    },
    {
      title: "Research presentation",
      date: "24 April 2026",
      type: "Presentation",
      grade: 5.0,
      source: "Teacher grade",
    },
  ],
  chemistry: [
    {
      title: "Atomic structure test",
      date: "26 September 2025",
      type: "Written exam",
      grade: 4.5,
      points: [29, 42],
      source: "Calculated from points",
    },
    {
      title: "Practice assessment: acids and bases",
      date: "27 November 2025",
      type: "Written exam",
      grade: 4.1,
      points: [22, 35],
      source: "AI practice assessment",
    },
    {
      title: "Stoichiometry test",
      date: "20 February 2026",
      type: "Written exam",
      grade: 4.8,
      points: [33, 44],
      source: "Calculated from points",
    },
    {
      title: "Titration laboratory",
      date: "15 May 2026",
      type: "Laboratory work",
      grade: 5.0,
      source: "Teacher grade",
    },
  ],
  "spf-chemistry": [
    {
      title: "Organic chemistry test",
      date: "10 October 2025",
      type: "Written exam",
      grade: 4.8,
      points: [34, 45],
      source: "Calculated from points",
    },
    {
      title: "Synthesis laboratory",
      date: "29 January 2026",
      type: "Laboratory work",
      grade: 5.0,
      source: "Teacher grade",
    },
    {
      title: "Reaction mechanisms",
      date: "6 May 2026",
      type: "Written exam",
      grade: 5.0,
      points: [36, 45],
      source: "Calculated from points",
    },
  ],
  philosophy: [
    {
      title: "Essay: theory of knowledge",
      date: "7 November 2025",
      type: "Essay",
      grade: 5.5,
      source: "Teacher grade",
    },
    {
      title: "Ethics test",
      date: "27 February 2026",
      type: "Written exam",
      grade: 5.0,
      points: [37, 45],
      source: "Calculated from points",
    },
    {
      title: "Oral discussion assessment",
      date: "12 June 2026",
      type: "Oral exam",
      grade: 5.5,
      source: "Teacher grade",
    },
  ],
  "political-education": [],
  "pedagogics-psychology": [
    {
      title: "Developmental theories",
      date: "18 August 2025",
      type: "Presentation",
      grade: 5.5,
      source: "Teacher grade",
    },
    {
      title: "Learning psychology test",
      date: "4 December 2025",
      type: "Written exam",
      grade: 5.2,
      points: [39, 46],
      source: "Calculated from points",
    },
    {
      title: "Case study analysis",
      date: "19 March 2026",
      type: "Essay",
      grade: 5.5,
      source: "Teacher grade",
    },
    {
      title: "Final written exam",
      date: "10 June 2026",
      type: "Written exam",
      grade: 5.5,
      points: [43, 48],
      source: "Calculated from points",
    },
  ],
};

export interface SubjectGrades {
  slug: string;
  tests: TestRecord[];
  exactAverage: number | null;
  roundedAverage: number | null;
  latest: TestRecord | null;
  lastThree: number[];
  monthlyChange: number | null;
  included: boolean;
}

function build(slug: string): SubjectGrades {
  const seeds = SEEDS[slug] ?? [];
  const tests = seeds.map((seed, index) => record(slug, index, seed));
  if (tests.length === 0) {
    return {
      slug,
      tests,
      exactAverage: null,
      roundedAverage: null,
      latest: null,
      lastThree: [],
      monthlyChange: null,
      included: false,
    };
  }
  const sum = tests.reduce((total, test) => total + test.grade, 0);
  const exactAverage = sum / tests.length;
  const lastThree = tests.slice(-3).map((t) => t.grade);
  const first = lastThree[0] ?? exactAverage;
  const last = lastThree[lastThree.length - 1] ?? exactAverage;
  return {
    slug,
    tests,
    exactAverage,
    roundedAverage: roundToHalf(exactAverage),
    latest: tests[tests.length - 1] ?? null,
    lastThree,
    monthlyChange: Number((last - first).toFixed(2)),
    included: true,
  };
}

export const SUBJECT_GRADES: Record<string, SubjectGrades> = Object.fromEntries(
  SUBJECTS.map((subject) => [subject.slug, build(subject.slug)]),
);

export function getSubjectGrades(slug: string): SubjectGrades {
  return (
    SUBJECT_GRADES[slug] ?? {
      slug,
      tests: [],
      exactAverage: null,
      roundedAverage: null,
      latest: null,
      lastThree: [],
      monthlyChange: null,
      included: false,
    }
  );
}

const includedSubjects = SUBJECTS.filter((s) => getSubjectGrades(s.slug).included);

export const YEAR_SUMMARY = {
  includedCount: includedSubjects.length,
  totalCount: SUBJECTS.length,
  missing: SUBJECTS.filter((s) => !getSubjectGrades(s.slug).included).map((s) => s.name),
  totalTests: SUBJECTS.reduce((total, s) => total + getSubjectGrades(s.slug).tests.length, 0),
  exactYearAverage:
    includedSubjects.reduce(
      (total, s) => total + (getSubjectGrades(s.slug).roundedAverage ?? 0),
      0,
    ) / Math.max(1, includedSubjects.length),
  previousMonthAverage: 4.96,
  highestTestGrade: Math.max(
    ...SUBJECTS.flatMap((s) => getSubjectGrades(s.slug).tests.map((t) => t.grade)),
  ),
};

export const YEAR_MONTHLY_SERIES: Record<string, { label: string; value: number }[]> = {
  "2022-23": [
    { label: "Sep", value: 4.6 },
    { label: "Nov", value: 4.7 },
    { label: "Jan", value: 4.8 },
    { label: "Mar", value: 4.8 },
    { label: "May", value: 4.9 },
  ],
  "2023-24": [
    { label: "Sep", value: 4.7 },
    { label: "Nov", value: 4.8 },
    { label: "Jan", value: 4.9 },
    { label: "Mar", value: 4.9 },
    { label: "May", value: 5.0 },
  ],
  "2024-25": [
    { label: "Sep", value: 4.8 },
    { label: "Nov", value: 4.9 },
    { label: "Jan", value: 5.0 },
    { label: "Mar", value: 5.0 },
    { label: "May", value: 5.1 },
  ],
  "2025-26": [
    { label: "Sep", value: 4.85 },
    { label: "Oct", value: 4.9 },
    { label: "Nov", value: 4.92 },
    { label: "Dec", value: 4.96 },
    { label: "Jan", value: 4.96 },
    { label: "Feb", value: 5.0 },
    { label: "Mar", value: 5.02 },
    { label: "Apr", value: 5.05 },
    { label: "May", value: 5.08 },
  ],
};

export const SEMESTER_SERIES: Record<string, { label: string; value: number }[]> = {
  "2022-23": [
    { label: "Sem 1", value: 4.7 },
    { label: "Sem 2", value: 4.9 },
  ],
  "2023-24": [
    { label: "Sem 1", value: 4.8 },
    { label: "Sem 2", value: 5.0 },
  ],
  "2024-25": [
    { label: "Sem 1", value: 4.9 },
    { label: "Sem 2", value: 5.1 },
  ],
  "2025-26": [
    { label: "Sem 1", value: 4.94 },
    { label: "Sem 2", value: 5.08 },
  ],
};

export const MULTI_YEAR_SERIES = [
  { label: "2022–23", value: 4.8 },
  { label: "2023–24", value: 4.9 },
  { label: "2024–25", value: 5.0 },
  { label: "2025–26", value: 5.08 },
];
