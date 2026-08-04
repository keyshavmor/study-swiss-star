/**
 * Prototype data model. Everything here lives in editable frontend state —
 * there is no backend, and every record can be created, edited and removed
 * by the user.
 */

export type GradeSource =
  | "Calculated from points"
  | "Teacher grade"
  | "Imported from transcript"
  | "AI practice assessment";

export const GRADE_SOURCES: GradeSource[] = [
  "Calculated from points",
  "Teacher grade",
  "Imported from transcript",
  "AI practice assessment",
];

export const ASSESSMENT_TYPES = [
  "Written exam",
  "Oral exam",
  "Presentation",
  "Essay",
  "Laboratory work",
  "Practical assessment",
  "Project",
  "Practice quiz",
  "Practice exam",
  "Other",
] as const;

export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

export interface Assessment {
  id: string;
  subjectSlug: string;
  title: string;
  type: AssessmentType;
  topic: string;
  /** ISO date, yyyy-mm-dd. */
  date: string;
  yearId: string;
  points: number | null;
  maxPoints: number | null;
  /** Teacher-entered grade overrides the calculated one when present. */
  teacherGrade: number | null;
  weight: number;
  notes: string;
  source: GradeSource;
  includeInStats: boolean;
  /** Set when the record came from a transcript upload. */
  importedFrom?: string;
}

export type EventCategory =
  | "School exam"
  | "Study session"
  | "Extracurricular activity"
  | "Homework"
  | "Deadline"
  | "Appointment"
  | "Personal reminder"
  | "Break"
  | "Travel";

export const EVENT_CATEGORIES: EventCategory[] = [
  "School exam",
  "Study session",
  "Extracurricular activity",
  "Homework",
  "Deadline",
  "Appointment",
  "Personal reminder",
  "Break",
  "Travel",
];

export const CATEGORY_COLOR: Record<EventCategory, string> = {
  "School exam": "#D64545",
  "Study session": "#6558D9",
  "Extracurricular activity": "#4A8FD6",
  Homework: "#D69A4A",
  Deadline: "#C96A00",
  Appointment: "#9A7AD9",
  "Personal reminder": "#7C7FD9",
  Break: "#58A87C",
  Travel: "#666B76",
};

export type Recurrence = "none" | "weekly";

export interface PlannerEvent {
  id: string;
  title: string;
  category: EventCategory;
  /** ISO date of the first (or only) occurrence. */
  date: string;
  start: string;
  end: string;
  subjectSlug?: string;
  location?: string;
  travelMinutes?: number;
  recurrence: Recurrence;
  /** Last ISO date a weekly series is active (inclusive). */
  until?: string;
  /** ISO dates removed from a weekly series. */
  exceptions?: string[];
  reminder?: string;
  notes?: string;
  done?: boolean;
  /** True for sessions produced by "Generate study plan". */
  generated?: boolean;
}

export type MaterialSection =
  | "Learning Material"
  | "Syllabus"
  | "Learning Goals"
  | "Grading Criteria"
  | "Online Sources"
  | "Archived Material";

export const MATERIAL_SECTIONS: MaterialSection[] = [
  "Learning Material",
  "Syllabus",
  "Learning Goals",
  "Grading Criteria",
  "Online Sources",
  "Archived Material",
];

export type MaterialType = "PDF" | "DOCX" | "PNG" | "JPEG" | "SVG" | "Web link" | "Note";

export const MATERIAL_TYPES: MaterialType[] = [
  "PDF",
  "DOCX",
  "PNG",
  "JPEG",
  "SVG",
  "Web link",
  "Note",
];

export interface Material {
  id: string;
  subjectSlug: string;
  name: string;
  type: MaterialType;
  section: MaterialSection;
  url?: string;
  notes?: string;
  status: "Indexed" | "Processing" | "Needs review";
  added: string;
  archived?: boolean;
}

export interface DataState {
  assessments: Assessment[];
  events: PlannerEvent[];
  materials: Material[];
}

export const EMPTY_STATE: DataState = { assessments: [], events: [], materials: [] };
