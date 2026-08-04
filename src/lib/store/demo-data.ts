import { CURRENT_YEAR_ID } from "@/lib/mock/academic";
import type { Assessment, DataState, Material, PlannerEvent } from "@/lib/store/types";

/**
 * Optional demo content. It is only ever loaded when the user explicitly turns
 * Demo Mode on, and it never mixes with the user's own records.
 */

function a(
  id: string,
  subjectSlug: string,
  title: string,
  type: Assessment["type"],
  date: string,
  points: [number, number] | null,
  teacherGrade: number | null,
  topic = "",
): Assessment {
  return {
    id: `demo-${id}`,
    subjectSlug,
    title,
    type,
    topic,
    date,
    yearId: CURRENT_YEAR_ID,
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
  a("m1", "mathematics", "Linear systems test", "Written exam", "2025-09-18", [36, 45], null, "Algebra"),
  a("m2", "mathematics", "Functions and graphs", "Written exam", "2025-11-06", [41, 46], null, "Functions"),
  a("m3", "mathematics", "Trigonometry test", "Written exam", "2026-01-22", [38, 44], null, "Trigonometry"),
  a("b1", "biology", "Cell biology test", "Written exam", "2025-09-25", [42, 50], null, "Cells"),
  a("b2", "biology", "Microscopy practical", "Laboratory work", "2025-11-13", null, 5.5, "Microscopy"),
  a("f1", "french", "Vocabulary test", "Written exam", "2025-10-02", [24, 40], null, "Vocabulaire"),
  a("f2", "french", "Oral presentation", "Oral exam", "2025-12-04", null, 3.5, "Exposé"),
  a("h1", "history", "Sources and interpretation", "Essay", "2025-11-21", null, 4.5, "Quellenarbeit"),
  a("e1", "english", "Reading comprehension", "Written exam", "2025-10-09", [33, 40], null, "Reading"),
];

const DEMO_EVENTS: PlannerEvent[] = [
  {
    id: "demo-e1",
    title: "Biology exam — cell biology",
    category: "School exam",
    date: "2026-02-02",
    start: "08:15",
    end: "09:45",
    subjectSlug: "biology",
    recurrence: "none",
  },
  {
    id: "demo-e2",
    title: "Revision: mitosis and meiosis",
    category: "Study session",
    date: "2026-02-02",
    start: "16:30",
    end: "17:30",
    subjectSlug: "biology",
    recurrence: "none",
  },
  {
    id: "demo-e3",
    title: "Handball training",
    category: "Extracurricular activity",
    date: "2026-02-02",
    start: "18:30",
    end: "20:00",
    location: "Sporthalle Zentrum",
    travelMinutes: 25,
    recurrence: "weekly",
  },
  {
    id: "demo-e4",
    title: "Mathematics mock exam",
    category: "Study session",
    date: "2026-02-05",
    start: "15:30",
    end: "17:00",
    subjectSlug: "mathematics",
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
    added: "2025-09-03",
  },
  {
    id: "demo-mat2",
    subjectSlug: "biology",
    name: "Lehrplan Biologie.pdf",
    type: "PDF",
    section: "Syllabus",
    status: "Indexed",
    added: "2025-08-20",
  },
  {
    id: "demo-mat3",
    subjectSlug: "mathematics",
    name: "Formelsammlung.pdf",
    type: "PDF",
    section: "Learning Material",
    status: "Indexed",
    added: "2025-08-24",
  },
];

export function createDemoState(): DataState {
  return {
    assessments: DEMO_ASSESSMENTS.map((x) => ({ ...x })),
    events: DEMO_EVENTS.map((x) => ({ ...x })),
    materials: DEMO_MATERIALS.map((x) => ({ ...x })),
  };
}
