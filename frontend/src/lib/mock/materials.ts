/** Mock materials, learning goals and source citations. */

export type MaterialSection =
  | "Learning Material"
  | "Syllabus"
  | "Learning Goals"
  | "Grading Criteria"
  | "Online Sources"
  | "Archived Material";

export type MaterialStatusBadge = "Indexed" | "Processing" | "Needs review" | "Unreadable";

export interface MaterialFile {
  id: string;
  name: string;
  type: "PDF" | "DOCX" | "PNG" | "JPEG" | "SVG" | "Audio" | "Web link";
  pages?: number;
  uploaded: string;
  status: MaterialStatusBadge;
  section: MaterialSection;
  warning?: string;
}

export const MATERIALS: MaterialFile[] = [
  {
    id: "m1",
    name: "Cell Biology Notes.pdf",
    type: "PDF",
    pages: 14,
    uploaded: "3 September 2025",
    status: "Indexed",
    section: "Learning Material",
  },
  {
    id: "m2",
    name: "Lehrplan KSA Biologie.pdf",
    type: "PDF",
    pages: 42,
    uploaded: "20 August 2025",
    status: "Indexed",
    section: "Syllabus",
  },
  {
    id: "m3",
    name: "Lernziele Zellbiologie.docx",
    type: "DOCX",
    pages: 3,
    uploaded: "22 August 2025",
    status: "Indexed",
    section: "Learning Goals",
  },
  {
    id: "m4",
    name: "Bewertungsraster Praktikum.pdf",
    type: "PDF",
    pages: 2,
    uploaded: "1 September 2025",
    status: "Needs review",
    section: "Grading Criteria",
    warning: "Very little text was detected.",
  },
  {
    id: "m5",
    name: "Mikroskop Aufnahme.png",
    type: "PNG",
    uploaded: "6 September 2025",
    status: "Processing",
    section: "Learning Material",
  },
  {
    id: "m6",
    name: "simplyscience.ch — Zellteilung",
    type: "Web link",
    uploaded: "7 September 2025",
    status: "Indexed",
    section: "Online Sources",
  },
  {
    id: "m7",
    name: "Altprüfung 2024.pdf",
    type: "PDF",
    pages: 8,
    uploaded: "12 June 2025",
    status: "Indexed",
    section: "Archived Material",
  },
  {
    id: "m8",
    name: "Scan Heftseiten.jpeg",
    type: "JPEG",
    uploaded: "9 September 2025",
    status: "Unreadable",
    section: "Learning Material",
    warning: "This may be a scanned document.",
  },
];

export const LEARNING_GOALS = [
  "Describe the structure and function of eukaryotic cell organelles.",
  "Compare mitosis and meiosis and explain their biological purpose.",
  "Explain transport processes across the cell membrane.",
  "Interpret microscope images and label the visible structures.",
];

export const SUBJECT_MODES = [
  "Chat",
  "Quick Check",
  "Knowledge Profile",
  "Quiz Mode",
  "Mock Exam",
  "Study Plan",
  "Statistics",
  "Subject Tools",
] as const;

export type SubjectMode = (typeof SUBJECT_MODES)[number];
