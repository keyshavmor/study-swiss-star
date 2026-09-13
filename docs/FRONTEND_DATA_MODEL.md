# Frontend Data Model

Stable TypeScript types for the frontend ↔ Python contract. Names are fixed so the backend can
mirror them 1:1 with Pydantic models. Wire format is `snake_case`; existing local prototype types
keep their current camelCase field names until a type is explicitly migrated.

The implemented chat/context response types live in `frontend/src/lib/context-backend.types.ts`. Types for
the still-planned quiz/exam/planner endpoints should move to a shared API-types module when those
features are implemented.

## Summary table

| Type | Existing source file | Current storage owner | Future owner | Pydantic model |
| --- | --- | --- | --- | --- |
| `Subject` | `frontend/src/lib/mock/subjects.ts` | static module | FE (list) + PY (index meta) | `SubjectModel` |
| `SubjectComponent` | implicit (`Subject.components`) | static module | FE + PY | `SubjectComponentModel` |
| `LearningGoal` | — (new) | — | PY | `LearningGoalModel` |
| `Material` | `frontend/src/lib/store/types.ts` | localStorage | LS + PY | `MaterialModel` |
| `MaterialSource` | — (new) | — | PY | `MaterialSourceModel` |
| `Assessment` | `frontend/src/lib/store/types.ts` | localStorage | LS | `AssessmentModel` |
| `PlannerEvent` | `frontend/src/lib/store/types.ts` | localStorage | LS | `PlannerEventModel` |
| `SchoolLink` | `frontend/src/lib/store/types.ts` | localStorage | LS | `SchoolLinkModel` |
| `StudentProfile` | `frontend/src/lib/store/types.ts` | localStorage | LS | `StudentProfileModel` |
| `AcademicYear` | `frontend/src/lib/mock/academic.ts` | static + context | FE | `AcademicYearModel` |
| `ChatThread` | `frontend/src/lib/chat.functions.ts` | Supabase | SB (Stage 1) | `ChatThreadModel` |
| `ChatMessage` | `frontend/src/lib/chat.functions.ts` | Supabase | SB + PY metadata | `ChatMessageModel` |
| `ChatRequest` | — (new) | — | PY | `ChatRequest` |
| `ChatResponse` | — (new) | — | PY | `ChatResponse` |
| `SourceSnippet` | — (new) | — | PY | `SourceSnippet` |
| `Quiz` / `QuizQuestion` | — (new) | — | PY | `Quiz` / `QuizQuestion` |
| `MockExam` / `MockExamQuestion` | — (new) | — | PY | `MockExam` / `MockExamQuestion` |
| `GradingRequest` / `GradingResult` | partly `frontend/src/lib/grade-math.ts` | FE math | PY eval + FE display | `GradingRequest` / `GradingResult` |
| `StudyPlan` / `StudyPlanItem` | — (new) | — | PY → LS | `StudyPlan` / `StudyPlanItem` |
| `FeedbackEntry` | — (new) | local form | PY | `FeedbackEntry` |
| `ModelStatus` | — (new) | — | PY | `ModelStatus` |
| `BackendHealth` | — (new) | — | PY | `BackendHealth` |
| `APIError` | — (new) | — | PY | `APIError` |
| `ContextItem` / `CompiledContext` | `backend/app/context/models.py` | local SQLite / request | PY | Python dataclasses (internal, not ordinary student UI data) |

---

## Subject & curriculum

```ts
export type SubjectLanguage = "de" | "en" | "fr";

export interface SubjectComponent {
  component_subject_id: "spf-biology" | "spf-chemistry" | string;
  display_name: string;
  language: SubjectLanguage;
}

export interface Subject {
  subject_id: string;              // "spf"
  display_name: string;            // "SPF Biology & Chemistry"
  language: SubjectLanguage;
  components: SubjectComponent[];  // [] for the 14 non-combined subjects
  indexed_materials?: number;
  learning_goal_count?: number;
  last_indexed_at?: string | null;
}
```

```json
{
  "subject_id": "spf",
  "display_name": "SPF Biology & Chemistry",
  "language": "de",
  "components": [
    { "component_subject_id": "spf-biology", "display_name": "Biology (SPF)", "language": "de" },
    { "component_subject_id": "spf-chemistry", "display_name": "Chemistry (SPF)", "language": "de" }
  ],
  "indexed_materials": 14,
  "learning_goal_count": 22,
  "last_indexed_at": "2026-08-10T19:02:00Z"
}
```

Existing local shape: `Subject` in `frontend/src/lib/mock/subjects.ts` uses `slug`, `name`, `language`
(`"German" | "English" | "French"`), `components?: string[]`. The API client maps
`slug ↔ subject_id` and `"German" ↔ "de"`.

```ts
export interface LearningGoal {
  learning_goal_id: string;
  subject_id: string;
  component_subject_id: string | null;
  title: string;
  description: string;
  topic: string | null;
  language: SubjectLanguage;
  source_material_id: string | null;
}
```

## Materials

```ts
export type MaterialType = "PDF" | "DOCX" | "PNG" | "JPEG" | "SVG" | "Web link" | "Note" | "MD" | "TXT";
export type MaterialSection =
  | "Learning Material" | "Syllabus" | "Learning Goals"
  | "Grading Criteria" | "Online Sources" | "Archived Material";

export interface Material {
  material_id: string;
  subject_id: string;
  component_subject_id: string | null;
  name: string;
  type: MaterialType;
  section: MaterialSection;
  status: "Indexed" | "Processing" | "Needs review";
  language: SubjectLanguage | null;
  pages?: number | null;
  chunks?: number | null;
  url?: string | null;
  added_at: string;
  archived?: boolean;
  origin: "local" | "backend";   // frontend-only discriminator for merged lists
}

export interface MaterialSource {
  material_id: string;
  name: string;
  section: MaterialSection;
  page?: number | null;
  url?: string | null;
}
```

Existing local shape: `Material` in `frontend/src/lib/store/types.ts` (`id`, `subjectSlug`, `added`).

## Grades & planner (localStorage-owned)

```ts
export interface Assessment {
  id: string;
  subjectSlug: string;           // maps to subject_id
  title: string;
  type: AssessmentType;          // "Written exam" | "Oral exam" | ... | "Practice quiz"
  topic: string;
  date: string;                  // yyyy-mm-dd
  yearId: string;                // "2026-27"
  points: number | null;
  maxPoints: number | null;
  teacherGrade: number | null;
  weight: number;
  notes: string;
  source: GradeSource;           // includes "AI practice assessment"
  includeInStats: boolean;
  importedFrom?: string;
}
```

```json
{
  "id": "as_2f1",
  "subjectSlug": "spf-chemistry",
  "title": "Kinetik Test",
  "type": "Written exam",
  "topic": "Reaktionsgeschwindigkeit",
  "date": "2026-09-18",
  "yearId": "2026-27",
  "points": 26, "maxPoints": 32, "teacherGrade": null,
  "weight": 1, "notes": "", "source": "Calculated from points", "includeInStats": true
}
```

`PlannerEvent`, `SchoolLink`, `StudentProfile` remain exactly as defined in
`frontend/src/lib/store/types.ts` (`PlannerEvent` includes `recurrence`, `weekdays`, `until`, `exceptions`,
`overrides`, `generated`). They stay localStorage-owned; Pydantic mirrors are only needed if
Stage 3 syncs them.

```ts
export interface AcademicYear {
  year_id: string;      // "2026-27"
  label: string;        // "Academic year 2026–27"
  grade_level: number;  // 11
  start_date: string;
  end_date: string;
  is_current: boolean;
}
```

## Chat

```ts
export interface ChatThread {
  thread_id: string;
  title: string;
  subject_id: string | null;
  component_subject_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  message_id: string;
  thread_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  parts?: unknown[];              // AI SDK UI parts, as stored in Supabase today
  sources?: SourceSnippet[];
  exam_tip?: string | null;
  used_model?: string | null;
  created_at: string;
}

export interface SourceSnippet {
  source_id: string;
  material_id: string;
  material_name: string;
  section: MaterialSection | string;
  page: number | null;
  snippet: string;
  score: number;
  url: string | null;
}

export interface ChatRequest {
  thread_id: string;
  subject_id: string;
  component_subject_id: string | null;
  language: SubjectLanguage;
  academic_year: string;
  grade_level: number;
  question: string;
  learning_goal_id?: string | null;
  material_ids?: string[];
  top_k?: number;
  include_sources?: boolean;
  stream?: boolean;
}

export interface ChatResponse {
  thread_id: string;
  message_id: string;
  answer: string;
  sources: SourceSnippet[];
  exam_tip: string | null;
  used_model: string;
  retrieval_summary: {
    chunks_considered: number;
    chunks_used: number;
    collections: string[];
  };
  language: SubjectLanguage;
  created_at: string;
}
```

Today `listThreads` returns `{ id, title, subject, updated_at }` from Supabase — the client maps
`id → thread_id` and `subject → subject_id`.

## Quiz & exam

```ts
export type QuizQuestionType = "multiple_choice" | "short_answer" | "long_answer" | "true_false";

export interface QuizQuestion {
  question_id: string;
  type: QuizQuestionType;
  prompt: string;
  options?: string[] | null;
  correct_option_index?: number | null;
  expected_answer?: string | null;
  points: number;
  explanation: string | null;
  learning_goal_id: string | null;
  sources: string[];
}

export interface Quiz {
  quiz_id: string;
  subject_id: string;
  component_subject_id: string | null;
  language: SubjectLanguage;
  difficulty: "easy" | "standard" | "hard";
  questions: QuizQuestion[];
  sources: SourceSnippet[];
  used_model: string;
  generated_at: string;
}

export interface MockExamQuestion {
  question_id: string;
  prompt: string;
  points: number;
  rubric_id: string | null;
  rubric: string[];
  topic: string | null;
  learning_goal_id: string | null;
}

export interface MockExam {
  exam_id: string;
  subject_id: string;
  component_subject_id: string | null;
  title: string;
  language: SubjectLanguage;
  duration_minutes: number;
  total_points: number;
  questions: MockExamQuestion[];
  sources: SourceSnippet[];
  used_model: string;
  generated_at: string;
}
```

## Grading

```ts
export interface GradingRequest {
  subject_id: string;
  component_subject_id: string | null;
  language: SubjectLanguage;
  academic_year: string;
  grade_level: number;
  question: string;
  student_answer: string;
  max_points: number;
  rubric_id?: string | null;
  exam_id?: string | null;
  question_id?: string | null;
}

export interface GradingResult {
  points_awarded: number;
  max_points: number;
  swiss_grade: number;        // exact: points/max*5+1, clamped to [1, 6]
  grade_formula: string;
  strengths: string[];
  missing_points: string[];
  improvement_advice: string;
  rubric_used: string[];
  sources: SourceSnippet[];
  graded_at: string;
  used_model: string;
}
```

Display rule: the frontend keeps `swiss_grade` exact where it shows exact grades, and reuses
`roundToHalf` from `frontend/src/lib/grade-math.ts` for rounded displays and averages. Values < 4.0 use the
`--warning` token (`#C96A00`).

## Study plan

```ts
export interface StudyPlanItem {
  item_id: string;
  date: string;                 // yyyy-mm-dd
  start: string;                // "17:00"
  end: string;                  // "18:00"
  subject_id: string;
  component_subject_id: string | null;
  topic: string;
  learning_goal_id: string | null;
  minutes: number;
  rationale: string;
}

export interface StudyPlan {
  plan_id: string;
  items: StudyPlanItem[];
  generated_at: string;
  used_model: string;
}
```

`StudyPlanItem` maps to a local `PlannerEvent` with `category: "Study session"` and
`generated: true` only after the student confirms the review step.

## Feedback, status, errors

```ts
export interface FeedbackEntry {
  feedback_id?: string;
  category: "answer_quality" | "bug" | "feature_request" | "content_gap" | "other";
  rating?: "up" | "down" | null;
  message: string;
  route: string;
  thread_id?: string | null;
  message_id?: string | null;
  subject_id?: string | null;
  language?: SubjectLanguage | null;
  app_version: string;
  created_at?: string;
}

export interface ModelStatus {
  provider: "ollama" | "llama.cpp" | "openai_compatible" | string;
  model: string;
  endpoint: string;
  mode: "local" | "remote";
  reachable: boolean;
  latency_ms: number | null;
  embedding_model?: string | null;
  fallback_provider?: string | null;
}

export interface BackendHealth {
  status: "ok" | "degraded" | "error";
  version: string;
  uptime_s: number;
  vector_store: { type: string; reachable: boolean; collections: number };
  model_server: { reachable: boolean; provider: string };
  subjects_indexed: number;
  checked_at: string;
}

export interface APIError {
  error: {
    code: string;
    message: string;
    detail?: string | null;
    retryable: boolean;
    request_id?: string | null;
  };
}
```
