import type {
  Assessment,
  DataState,
  Material,
  PlannerEvent,
  SchoolLink,
  StudentProfile,
} from "@/lib/store/types";

/**
 * Optional demo content. It is only ever loaded when the user explicitly turns
 * Demo Mode on, and it never mixes with the user's own records.
 */

const YEAR = "2026-27";
const PREV_YEAR = "2025-26";

function a(
  id: string,
  subjectSlug: string,
  title: string,
  type: Assessment["type"],
  date: string,
  points: [number, number] | null,
  teacherGrade: number | null,
  topic = "",
  yearId = YEAR,
): Assessment {
  return {
    id: `demo-${id}`,
    subjectSlug,
    title,
    type,
    topic,
    date,
    yearId,
    points: points ? points[0] : null,
    maxPoints: points ? points[1] : null,
    teacherGrade,
    weight: 1,
    notes: "",
    source: teacherGrade === null ? "Calculated from points" : "Teacher grade",
    includeInStats: true,
  };
}

const DEMO_ASSESSMENTS: Assessment[] = [
  // Grade 11 — Academic Year 2026–27
  a("m1", "mathematics", "Linear systems test", "Written exam", "2026-09-08", [36, 45], null, "Algebra"),
  a("m2", "mathematics", "Functions and graphs", "Written exam", "2026-10-06", [41, 46], null, "Functions"),
  a("b1", "biology", "Cell biology test", "Written exam", "2026-09-15", [42, 50], null, "Cells"),
  a("b2", "biology", "Microscopy practical", "Laboratory work", "2026-10-13", null, 5.5, "Microscopy"),
  a("f1", "french", "Vocabulary test", "Written exam", "2026-09-22", [24, 40], null, "Vocabulaire"),
  a("f2", "french", "Oral presentation", "Oral exam", "2026-10-20", null, 3.5, "Exposé"),
  a("h1", "history", "Sources and interpretation", "Essay", "2026-09-29", null, 4.5, "Quellenarbeit"),
  a("e1", "english", "Reading comprehension", "Written exam", "2026-10-01", [33, 40], null, "Reading"),
  a("c1", "chemistry", "Acids and bases", "Written exam", "2026-09-11", [28, 40], null, "Acids"),
  // Grade 10 — Academic Year 2025–26 (kept so year switching shows real history)
  a("pm1", "mathematics", "Trigonometry test", "Written exam", "2026-01-22", [38, 44], null, "Trigonometry", PREV_YEAR),
  a("pb1", "biology", "Genetics test", "Written exam", "2025-11-12", [40, 50], null, "Genetics", PREV_YEAR),
  a("pe1", "english", "Essay: dystopian fiction", "Essay", "2025-12-03", null, 5.0, "Writing", PREV_YEAR),
  a("pf1", "french", "Grammaire", "Written exam", "2025-10-08", [22, 40], null, "Grammaire", PREV_YEAR),
];

const DEMO_EVENTS: PlannerEvent[] = [
  {
    id: "demo-e1",
    title: "Tennis Training",
    category: "Extracurricular activity",
    // A Thursday — the series stays on Thursday, every single week.
    date: "2026-08-27",
    start: "17:00",
    end: "19:00",
    location: "Tennisclub Luzern",
    travelBefore: 20,
    travelAfter: 20,
    travelMinutes: 20,
    recurrence: "weekly",
    weekdays: [3],
    reminder: "1 hour before",
    notes: "Bring the second racket.",
  },
  {
    id: "demo-e2",
    title: "Chemistry Exam",
    category: "School exam",
    date: "2026-09-18",
    start: "09:30",
    end: "11:00",
    subjectSlug: "chemistry",
    location: "Room B204",
    recurrence: "none",
    reminder: "1 day before",
    notes: "Covers acids, bases and titration.",
  },
  {
    id: "demo-e3",
    title: "French Revision",
    category: "Study session",
    date: "2026-09-17",
    start: "17:00",
    end: "18:30",
    subjectSlug: "french",
    recurrence: "none",
    reminder: "30 minutes before",
  },
  {
    id: "demo-e4",
    title: "Biology",
    category: "School class",
    date: "2026-08-24",
    start: "08:15",
    end: "09:45",
    subjectSlug: "biology",
    location: "Room A112",
    recurrence: "weekly",
    weekdays: [0, 2],
  },
  {
    id: "demo-e5",
    title: "Mathematics",
    category: "School class",
    date: "2026-08-25",
    start: "10:00",
    end: "11:30",
    subjectSlug: "mathematics",
    location: "Room C08",
    recurrence: "weekly",
    weekdays: [1, 4],
  },
  {
    id: "demo-e6",
    title: "Chemistry homework — titration sheet",
    category: "Homework",
    date: "2026-09-16",
    start: "19:00",
    end: "20:00",
    subjectSlug: "chemistry",
    recurrence: "none",
  },
];

const DEMO_MATERIALS: Material[] = [
  {
    id: "demo-mat1",
    subjectSlug: "biology",
    name: "Cell Biology Notes.pdf",
    type: "PDF",
    section: "Learning Material",
    status: "Indexed",
    added: "2026-09-03",
  },
  {
    id: "demo-mat2",
    subjectSlug: "biology",
    name: "Lehrplan Biologie.pdf",
    type: "PDF",
    section: "Syllabus",
    status: "Indexed",
    added: "2026-08-20",
  },
  {
    id: "demo-mat3",
    subjectSlug: "mathematics",
    name: "Formelsammlung.pdf",
    type: "PDF",
    section: "Learning Material",
    status: "Indexed",
    added: "2026-08-24",
  },
];

const DEMO_LINKS: SchoolLink[] = [
  {
    id: "demo-l1",
    name: "KSA Website",
    url: "https://www.ksalpenquai.lu.ch",
    category: "School Website",
    description: "News, calendar and school information.",
    accent: "#6558D9",
    order: 0,
    added: "2026-08-20",
    opens: 12,
  },
  {
    id: "demo-l2",
    name: "School Email",
    url: "https://outlook.office.com",
    category: "Email",
    accent: "#4A8FD6",
    order: 1,
    added: "2026-08-20",
    opens: 31,
  },
  {
    id: "demo-l3",
    name: "Learning Platform",
    url: "https://moodle.org",
    category: "Learning Platform",
    description: "Course material and hand-ins.",
    accent: "#3F9E6B",
    order: 2,
    added: "2026-08-21",
    opens: 8,
  },
  {
    id: "demo-l4",
    name: "Timetable",
    url: "https://www.webuntis.com",
    category: "Timetable",
    accent: "#D69A4A",
    order: 3,
    added: "2026-08-21",
    opens: 22,
  },
];

const DEMO_PROFILE: StudentProfile = {
  photo: "",
  fullName: "Alim Aliev",
  preferredName: "Alim",
  dateOfBirth: "2010-03-14",
  schoolName: "Kantonsschule Alpenquai",
  schoolType: "Gymnasium",
  className: "",
  classTeacher: "",
  focusSubject: "Biology and Chemistry",
  schoolEmail: "",
  studentNumber: "",
  username: "alim",
  language: "English",
};

export function createDemoState(): DataState {
  return {
    assessments: DEMO_ASSESSMENTS.map((x) => ({ ...x })),
    events: DEMO_EVENTS.map((x) => ({ ...x })),
    materials: DEMO_MATERIALS.map((x) => ({ ...x })),
    links: DEMO_LINKS.map((x) => ({ ...x })),
    profile: { ...DEMO_PROFILE },
    readNotifications: [],
    dismissedNotifications: [],
  };
}
