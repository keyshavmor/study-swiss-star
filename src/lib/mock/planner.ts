/** Mock planner data for the prototype. */

export type EventCategory =
  | "School exam"
  | "Study session"
  | "Extracurricular activity"
  | "Homework"
  | "Personal reminder"
  | "Break"
  | "Travel";

export const EVENT_CATEGORIES: EventCategory[] = [
  "School exam",
  "Study session",
  "Extracurricular activity",
  "Homework",
  "Personal reminder",
  "Break",
  "Travel",
];

export interface PlannerEvent {
  id: string;
  title: string;
  category: EventCategory;
  day: string;
  date: string;
  start: string;
  end: string;
  subject?: string;
  done?: boolean;
}

export const PLANNER_EVENTS: PlannerEvent[] = [
  {
    id: "e1",
    title: "Biology exam — cell biology",
    category: "School exam",
    day: "Monday",
    date: "18 September",
    start: "08:15",
    end: "09:45",
    subject: "Biology",
  },
  {
    id: "e2",
    title: "Revision: mitosis and meiosis",
    category: "Study session",
    day: "Monday",
    date: "18 September",
    start: "16:30",
    end: "17:30",
    subject: "Biology",
    done: true,
  },
  {
    id: "e3",
    title: "Handball training",
    category: "Extracurricular activity",
    day: "Monday",
    date: "18 September",
    start: "18:30",
    end: "20:00",
  },
  {
    id: "e4",
    title: "History reading — sources chapter 4",
    category: "Homework",
    day: "Tuesday",
    date: "19 September",
    start: "17:00",
    end: "17:45",
    subject: "History",
  },
  {
    id: "e5",
    title: "Chemistry quiz checkpoint",
    category: "Study session",
    day: "Wednesday",
    date: "20 September",
    start: "16:00",
    end: "16:45",
    subject: "Chemistry",
  },
  {
    id: "e6",
    title: "Piano lesson",
    category: "Extracurricular activity",
    day: "Wednesday",
    date: "20 September",
    start: "18:00",
    end: "19:00",
  },
  {
    id: "e7",
    title: "Mathematics mock exam",
    category: "Study session",
    day: "Thursday",
    date: "21 September",
    start: "15:30",
    end: "17:00",
    subject: "Mathematics",
  },
  {
    id: "e8",
    title: "Commute to Lucerne",
    category: "Travel",
    day: "Friday",
    date: "22 September",
    start: "07:10",
    end: "07:45",
  },
  {
    id: "e9",
    title: "Mathematics exam — quadratic functions",
    category: "School exam",
    day: "Friday",
    date: "22 September",
    start: "10:15",
    end: "11:45",
    subject: "Mathematics",
  },
  {
    id: "e10",
    title: "Short break — walk",
    category: "Break",
    day: "Friday",
    date: "22 September",
    start: "16:00",
    end: "16:20",
  },
  {
    id: "e11",
    title: "Bring signed transcript to school",
    category: "Personal reminder",
    day: "Saturday",
    date: "23 September",
    start: "09:00",
    end: "09:10",
  },
];

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  href?: string;
}

export const NOTIFICATIONS: AppNotification[] = [
  {
    id: "n1",
    title: "Biology exam in 5 days",
    body: "Cell biology, 18 September, 08:15.",
    time: "2 h ago",
    read: false,
  },
  {
    id: "n2",
    title: "Material processing complete",
    body: "Cell Biology Notes.pdf is indexed and ready.",
    time: "5 h ago",
    read: false,
  },
  {
    id: "n3",
    title: "Transcript requires review",
    body: "6 extracted grades are waiting for your confirmation.",
    time: "Yesterday",
    read: false,
  },
  {
    id: "n4",
    title: "Exam graded",
    body: "Your Chemistry practice exam has been graded: 4.1.",
    time: "2 days ago",
    read: true,
  },
  {
    id: "n5",
    title: "Study-plan conflict",
    body: "Handball training overlaps with a planned session on Monday.",
    time: "3 days ago",
    read: true,
  },
];

export const DAILY_OVERVIEW = {
  yearAverage: 5.1,
  nextExam: "Biology · 18 September",
  studyTimeToday: "1 h 30 min planned",
  nextActivity: "Handball training · 18:30",
};
