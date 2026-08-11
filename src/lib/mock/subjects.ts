/**
 * Prototype mock data. No backend, no persistence — UI only.
 */

export type SubjectLanguage = "German" | "English" | "French";
export type Trend = "Improving" | "Stable" | "Needs focus";
export type MaterialStatus = "Complete" | "Partial" | "Missing";

export interface Subject {
  slug: string;
  name: string;
  icon: string;
  language: SubjectLanguage;
  languageBadge?: string;
  average: number | null;
  latestGrade: number | null;
  nextExam: string | null;
  nextExamInDays: number | null;
  trend: Trend;
  materials: number;
  materialStatus: MaterialStatus;
  accent: string;
  /** Set on combined school subjects (e.g. SPF) that group other subject slugs. */
  components?: string[];
  subtitle?: string;
}

export const SUBJECTS: Subject[] = [
  {
    slug: "mathematics",
    name: "Mathematics",
    icon: "Sigma",
    language: "English",
    average: 5.1,
    latestGrade: 5.0,
    nextExam: "22 September",
    nextExamInDays: 9,
    trend: "Stable",
    materials: 18,
    materialStatus: "Complete",
    accent: "#6558D9",
  },
  {
    slug: "physics",
    name: "Physics",
    icon: "Atom",
    language: "English",
    average: 5.0,
    latestGrade: 5.25,
    nextExam: "25 September",
    nextExamInDays: 12,
    trend: "Improving",
    materials: 12,
    materialStatus: "Complete",
    accent: "#4A8FD6",
  },
  {
    slug: "english",
    name: "English",
    icon: "BookOpenText",
    language: "English",
    average: 5.4,
    latestGrade: 5.5,
    nextExam: "30 September",
    nextExamInDays: 17,
    trend: "Stable",
    materials: 9,
    materialStatus: "Partial",
    accent: "#58A87C",
  },
  {
    slug: "history",
    name: "History",
    icon: "Landmark",
    language: "English",
    average: 4.8,
    latestGrade: 4.5,
    nextExam: "19 September",
    nextExamInDays: 6,
    trend: "Needs focus",
    materials: 11,
    materialStatus: "Partial",
    accent: "#D69A4A",
  },
  {
    slug: "french",
    name: "French",
    icon: "Languages",
    language: "French",
    languageBadge: "Simple French · B1 level",
    average: 4.5,
    latestGrade: 4.5,
    nextExam: "2 October",
    nextExamInDays: 19,
    trend: "Improving",
    materials: 7,
    materialStatus: "Partial",
    accent: "#9A7AD9",
  },
  {
    slug: "german",
    name: "German",
    icon: "PenLine",
    language: "German",
    average: 5.2,
    latestGrade: 5.0,
    nextExam: "26 September",
    nextExamInDays: 13,
    trend: "Stable",
    materials: 13,
    materialStatus: "Complete",
    accent: "#6558D9",
  },
  {
    slug: "biology",
    name: "Biology",
    icon: "Leaf",
    language: "German",
    average: 5.2,
    latestGrade: 5.5,
    nextExam: "18 September",
    nextExamInDays: 5,
    trend: "Improving",
    materials: 14,
    materialStatus: "Complete",
    accent: "#58A87C",
  },
  {
    slug: "spf-biology",
    name: "SPF Biology",
    icon: "Dna",
    language: "German",
    average: 5.0,
    latestGrade: 5.0,
    nextExam: "24 September",
    nextExamInDays: 11,
    trend: "Stable",
    materials: 10,
    materialStatus: "Partial",
    accent: "#4FA07C",
  },
  {
    slug: "chemistry",
    name: "Chemistry",
    icon: "FlaskConical",
    language: "German",
    average: 4.7,
    latestGrade: 4.5,
    nextExam: "20 September",
    nextExamInDays: 7,
    trend: "Needs focus",
    materials: 12,
    materialStatus: "Partial",
    accent: "#4A8FD6",
  },
  {
    slug: "spf-chemistry",
    name: "SPF Chemistry",
    icon: "TestTubes",
    language: "German",
    average: 4.9,
    latestGrade: 5.0,
    nextExam: "3 October",
    nextExamInDays: 20,
    trend: "Improving",
    materials: 8,
    materialStatus: "Partial",
    accent: "#5AA0C8",
  },
  {
    slug: "philosophy",
    name: "Philosophy",
    icon: "Brain",
    language: "German",
    average: 5.3,
    latestGrade: 5.5,
    nextExam: "8 October",
    nextExamInDays: 25,
    trend: "Stable",
    materials: 6,
    materialStatus: "Partial",
    accent: "#9A7AD9",
  },
  {
    slug: "political-education",
    name: "Political Education",
    icon: "Scale",
    language: "German",
    average: 5.0,
    latestGrade: 5.0,
    nextExam: null,
    nextExamInDays: null,
    trend: "Stable",
    materials: 4,
    materialStatus: "Missing",
    accent: "#D69A4A",
  },
  {
    slug: "pedagogics-psychology",
    name: "Pedagogics and Psychology",
    icon: "HeartHandshake",
    language: "German",
    average: 5.4,
    latestGrade: 5.5,
    nextExam: "10 October",
    nextExamInDays: 27,
    trend: "Improving",
    materials: 5,
    materialStatus: "Partial",
    accent: "#C77CA8",
  },
  {
    slug: "economics",
    name: "Economics",
    icon: "TrendingUp",
    language: "German",
    average: null,
    latestGrade: null,
    nextExam: null,
    nextExamInDays: null,
    trend: "Stable",
    materials: 0,
    materialStatus: "Missing",
    accent: "#4A8FD6",
  },
  {
    slug: "art",
    name: "Art",
    icon: "Palette",
    language: "German",
    average: null,
    latestGrade: null,
    nextExam: null,
    nextExamInDays: null,
    trend: "Stable",
    materials: 0,
    materialStatus: "Missing",
    accent: "#C77CA8",
  },
  {
    slug: "sport",
    name: "Sport",
    icon: "Dumbbell",
    language: "German",
    average: null,
    latestGrade: null,
    nextExam: null,
    nextExamInDays: null,
    trend: "Stable",
    materials: 0,
    materialStatus: "Missing",
    accent: "#3FA08C",
  },
];

/** The combined Schwerpunktfach shown as a single card on the School page. */
export const SPF_COMBINED: Subject = {
  slug: "spf",
  name: "SPF Biology & Chemistry",
  icon: "Microscope",
  language: "German",
  subtitle: "Schwerpunktfach · German",
  components: ["spf-biology", "spf-chemistry"],
  average: null,
  latestGrade: null,
  nextExam: null,
  nextExamInDays: null,
  trend: "Stable",
  materials: 0,
  materialStatus: "Partial",
  accent: "#4FA07C",
};

const ORDER = [
  "mathematics",
  "physics",
  "english",
  "history",
  "french",
  "german",
  "biology",
  "chemistry",
  "spf",
  "philosophy",
  "political-education",
  "pedagogics-psychology",
  "economics",
  "art",
  "sport",
];

/** Top-level School subjects: SPF Biology and SPF Chemistry appear as one card. */
export const SCHOOL_SUBJECTS: Subject[] = ORDER.map(
  (slug) => (slug === "spf" ? SPF_COMBINED : SUBJECTS.find((s) => s.slug === slug)!),
).filter(Boolean);

export function getSchoolSubject(slug: string): Subject | undefined {
  if (slug === "spf") return SPF_COMBINED;
  return getSubject(slug);
}


export function getSubject(slug: string): Subject | undefined {
  return SUBJECTS.find((subject) => subject.slug === slug);
}