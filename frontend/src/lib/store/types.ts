import type { TranslationKey } from "@/lib/i18n/messages";

/**
 * Prototype data model. Everything here lives in editable frontend state —
 * these records do not use the Python context backend, and every record can be
 * created, edited and removed by the user.
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

export const GRADE_SOURCE_LABEL_KEY: Record<GradeSource, TranslationKey> = {
  "Calculated from points": "grades.source.calculatedFromPoints",
  "Teacher grade": "grades.source.teacherGrade",
  "Imported from transcript": "grades.source.importedFromTranscript",
  "AI practice assessment": "grades.source.aiPracticeAssessment",
};

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

export const ASSESSMENT_TYPE_LABEL_KEY: Record<AssessmentType, TranslationKey> = {
  "Written exam": "grades.type.writtenExam",
  "Oral exam": "grades.type.oralExam",
  Presentation: "grades.type.presentation",
  Essay: "grades.type.essay",
  "Laboratory work": "grades.type.laboratoryWork",
  "Practical assessment": "grades.type.practicalAssessment",
  Project: "grades.type.project",
  "Practice quiz": "grades.type.practiceQuiz",
  "Practice exam": "grades.type.practiceExam",
  Other: "grades.type.other",
};

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
  | "School class"
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
  "School class",
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

export const EVENT_CATEGORY_LABEL_KEY: Record<EventCategory, TranslationKey> = {
  "School class": "events.category.schoolClass",
  "School exam": "events.category.schoolExam",
  "Study session": "events.category.studySession",
  "Extracurricular activity": "events.category.extracurricularActivity",
  Homework: "events.category.homework",
  Deadline: "events.category.deadline",
  Appointment: "events.category.appointment",
  "Personal reminder": "events.category.personalReminder",
  Break: "events.category.break",
  Travel: "events.category.travel",
};

export const CATEGORY_COLOR: Record<EventCategory, string> = {
  "School class": "#4A8FD6",
  "School exam": "#6558D9",
  "Study session": "#5A5AC8",
  "Extracurricular activity": "#3F9E6B",
  Homework: "#D69A4A",
  Deadline: "#C96A00",
  Appointment: "#9A7AD9",
  "Personal reminder": "#2FA3A3",
  Break: "#9AA0AB",
  Travel: "#666B76",
};

export type Recurrence = "none" | "daily" | "weekly" | "biweekly" | "monthly";

export const RECURRENCE_LABEL_KEY: Record<Recurrence, TranslationKey> = {
  none: "events.recurrence.none",
  daily: "events.recurrence.daily",
  weekly: "events.recurrence.weekly",
  biweekly: "events.recurrence.biweekly",
  monthly: "events.recurrence.monthly",
};

export const REMINDER_OPTIONS = [
  "None",
  "At start time",
  "10 minutes before",
  "30 minutes before",
  "1 hour before",
  "1 day before",
  "1 week before",
] as const;

export const REMINDER_LABEL_KEY: Record<(typeof REMINDER_OPTIONS)[number], TranslationKey> = {
  None: "events.reminder.none",
  "At start time": "events.reminder.atStartTime",
  "10 minutes before": "events.reminder.tenMinutesBefore",
  "30 minutes before": "events.reminder.thirtyMinutesBefore",
  "1 hour before": "events.reminder.oneHourBefore",
  "1 day before": "events.reminder.oneDayBefore",
  "1 week before": "events.reminder.oneWeekBefore",
};

export interface PlannerEvent {
  id: string;
  title: string;
  category: EventCategory;
  /** ISO date of the first (or only) occurrence — the recurrence anchor. */
  date: string;
  start: string;
  end: string;
  subjectSlug?: string;
  location?: string;
  travelMinutes?: number;
  /** Optional split travel time, in minutes. */
  travelBefore?: number;
  travelAfter?: number;
  recurrence: Recurrence;
  /**
   * Weekdays a weekly/bi-weekly series lands on (0 = Monday … 6 = Sunday).
   * Defaults to the weekday of `date` when omitted.
   */
  weekdays?: number[];
  /** Last ISO date a series is active (inclusive). */
  until?: string;
  /** ISO dates removed from a series. */
  exceptions?: string[];
  /** Per-occurrence overrides, keyed by ISO date of the original occurrence. */
  overrides?: Record<string, { date?: string; start?: string; end?: string; title?: string }>;
  /** Optional colour override, otherwise the category colour is used. */
  color?: string;
  reminder?: string;
  notes?: string;

  done?: boolean;
  /** True for sessions produced by "Generate study plan". */
  generated?: boolean;
  /** Set for items mirrored from an external calendar (read-only). */
  externalSource?: "google";
  /** True when the item cannot be edited, moved or deleted in the app. */
  readOnly?: boolean;
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

export const LINK_CATEGORIES = [
  "School Website",
  "Email",
  "Learning Platform",
  "Timetable",
  "Library",
  "Subject Resource",
  "Teacher Resource",
  "Other",
] as const;

export type LinkCategory = (typeof LINK_CATEGORIES)[number];

export const LINK_ACCENTS = [
  "#6558D9",
  "#4A8FD6",
  "#3F9E6B",
  "#D69A4A",
  "#C96A00",
  "#2FA3A3",
  "#9A7AD9",
  "#666B76",
] as const;

export interface SchoolLink {
  id: string;
  name: string;
  url: string;
  category: LinkCategory;
  description?: string;
  /** Two-letter override for the tile initials. */
  icon?: string;
  subjectSlug?: string;
  accent: string;
  /** Manual sort position. */
  order: number;
  added: string;
  opens: number;
}

/**
 * Student profile. Values the student has not entered stay empty so the
 * prototype never invents personal information.
 */
export interface StudentProfile {
  photo: string;
  fullName: string;
  preferredName: string;
  dateOfBirth: string;
  schoolName: string;
  schoolType: string;
  className: string;
  classTeacher: string;
  focusSubject: string;
  schoolEmail: string;
  studentNumber: string;
  username: string;
  language: string;
}

export const EMPTY_PROFILE: StudentProfile = {
  photo: "",
  fullName: "",
  preferredName: "",
  dateOfBirth: "",
  schoolName: "",
  schoolType: "",
  className: "",
  classTeacher: "",
  focusSubject: "",
  schoolEmail: "",
  studentNumber: "",
  username: "",
  language: "English",
};

export interface DataState {
  assessments: Assessment[];
  events: PlannerEvent[];
  materials: Material[];
  links: SchoolLink[];
  profile: StudentProfile;
  /** Notification IDs the student has read or dismissed. */
  readNotifications: string[];
  dismissedNotifications: string[];
}

export const EMPTY_STATE: DataState = {
  assessments: [],
  events: [],
  materials: [],
  links: [],
  profile: EMPTY_PROFILE,
  readNotifications: [],
  dismissedNotifications: [],
};
