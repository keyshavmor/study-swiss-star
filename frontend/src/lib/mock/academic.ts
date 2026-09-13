/** Mock academic records for the prototype. */

export type GradeSource = "Teacher Grade" | "Calculated from Points" | "AI Practice Assessment";

export type AssessmentType =
  | "Written exam"
  | "Oral exam"
  | "Presentation"
  | "Project"
  | "Practical assessment"
  | "Laboratory work"
  | "Essay"
  | "Other";

export const ASSESSMENT_TYPES: AssessmentType[] = [
  "Written exam",
  "Oral exam",
  "Presentation",
  "Project",
  "Practical assessment",
  "Laboratory work",
  "Essay",
  "Other",
];

export interface Assessment {
  id: string;
  date: string;
  subject: string;
  title: string;
  type: AssessmentType;
  points: number | null;
  maxPoints: number | null;
  percentage: number | null;
  grade: number;
  source: GradeSource;
}

export interface SchoolYear {
  id: string;
  label: string;
  gradeLevel: string;
  average: number;
  monthlyChange: number;
  strongestSubject: string;
  focusSubject: string;
  assessments: number;
  highestGrade: number;
}

export const SCHOOL_YEARS: SchoolYear[] = [
  {
    id: "2022-23",
    label: "Academic Year 2022–23",
    gradeLevel: "Grade 7",
    average: 4.8,
    monthlyChange: 0.1,
    strongestSubject: "Biology",
    focusSubject: "French",
    assessments: 34,
    highestGrade: 5.5,
  },
  {
    id: "2023-24",
    label: "Academic Year 2023–24",
    gradeLevel: "Grade 8",
    average: 4.9,
    monthlyChange: 0.05,
    strongestSubject: "German",
    focusSubject: "Chemistry",
    assessments: 38,
    highestGrade: 5.75,
  },
  {
    id: "2024-25",
    label: "Academic Year 2024–25",
    gradeLevel: "Grade 9",
    average: 5.0,
    monthlyChange: 0.15,
    strongestSubject: "English",
    focusSubject: "History",
    assessments: 41,
    highestGrade: 6.0,
  },
  {
    id: "2025-26",
    label: "Academic Year 2025–26",
    gradeLevel: "Grade 10",
    average: 5.1,
    monthlyChange: 0.2,
    strongestSubject: "Pedagogics and Psychology",
    focusSubject: "Chemistry",
    assessments: 17,
    highestGrade: 5.75,
  },
  {
    id: "2026-27",
    label: "Academic Year 2026–27",
    gradeLevel: "Grade 11",
    average: 5.2,
    monthlyChange: 0.1,
    strongestSubject: "Biology",
    focusSubject: "French",
    assessments: 0,
    highestGrade: 5.5,
  },
];

export const CURRENT_YEAR_ID = "2026-27";

export const MONTHLY_AVERAGES: { month: string; average: number }[] = [
  { month: "Aug", average: 4.8 },
  { month: "Sep", average: 4.9 },
  { month: "Oct", average: 5.0 },
  { month: "Nov", average: 4.9 },
  { month: "Dec", average: 5.1 },
  { month: "Jan", average: 5.0 },
  { month: "Feb", average: 5.2 },
  { month: "Mar", average: 5.1 },
];

export const ASSESSMENTS: Assessment[] = [
  {
    id: "a1",
    date: "11 September 2025",
    subject: "Biology",
    title: "Cell biology test",
    type: "Written exam",
    points: 42,
    maxPoints: 50,
    percentage: 84,
    grade: 5.2,
    source: "Calculated from Points",
  },
  {
    id: "a2",
    date: "8 September 2025",
    subject: "Mathematics",
    title: "Quadratic functions",
    type: "Written exam",
    points: 36,
    maxPoints: 45,
    percentage: 80,
    grade: 5.0,
    source: "Calculated from Points",
  },
  {
    id: "a3",
    date: "5 September 2025",
    subject: "History",
    title: "Industrial revolution essay",
    type: "Essay",
    points: null,
    maxPoints: null,
    percentage: null,
    grade: 4.5,
    source: "Teacher Grade",
  },
  {
    id: "a4",
    date: "2 September 2025",
    subject: "Physics",
    title: "Kinematics lab report",
    type: "Laboratory work",
    points: 27,
    maxPoints: 30,
    percentage: 90,
    grade: 5.5,
    source: "Calculated from Points",
  },
  {
    id: "a5",
    date: "29 August 2025",
    subject: "French",
    title: "Oral presentation: Ma région",
    type: "Oral exam",
    points: null,
    maxPoints: null,
    percentage: null,
    grade: 4.5,
    source: "Teacher Grade",
  },
  {
    id: "a6",
    date: "27 August 2025",
    subject: "Chemistry",
    title: "Practice assessment: acids and bases",
    type: "Written exam",
    points: 22,
    maxPoints: 35,
    percentage: 63,
    grade: 4.1,
    source: "AI Practice Assessment",
  },
  {
    id: "a7",
    date: "22 August 2025",
    subject: "German",
    title: "Textanalyse",
    type: "Essay",
    points: 38,
    maxPoints: 45,
    percentage: 84,
    grade: 5.2,
    source: "Calculated from Points",
  },
  {
    id: "a8",
    date: "18 August 2025",
    subject: "Pedagogics and Psychology",
    title: "Developmental theories",
    type: "Presentation",
    points: null,
    maxPoints: null,
    percentage: null,
    grade: 5.5,
    source: "Teacher Grade",
  },
];

export const SUBJECTS_MISSING_GRADES = ["Political Education", "SPF Chemistry"];
