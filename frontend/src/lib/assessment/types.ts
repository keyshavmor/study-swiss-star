/**
 * Assessment domain contracts.
 *
 * These types are the single source of truth shared by the setup wizard, the
 * runner, the results view and the future Python backend. Everything a browser
 * may see is validated with Zod before it is rendered; no LLM output is ever
 * treated as HTML.
 *
 * SECURITY BOUNDARY: `PublicQuestion` never carries a correct answer, a marking
 * rubric or a tolerance. Answer keys live in `AnswerKey` / `GradingRubric`,
 * which exist only in server-side contracts and in graded results.
 */
import { z } from "zod";

/* ------------------------------------------------------------------ content */

export const inlineStyleSchema = z
  .object({
    italic: z.boolean().optional(),
    monospace: z.boolean().optional(),
    /** BCP-47 tag, e.g. `la` for a taxonomic name or `fr` for a passage. */
    lang: z.string().min(2).max(12).optional(),
  })
  .strict();

export const contentBlockSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("prose"),
      /** Restricted Markdown subset. Rendered by react-markdown, never as HTML. */
      text: z.string(),
      style: inlineStyleSchema.optional(),
    })
    .strict(),
  z.object({ kind: z.literal("math"), latex: z.string(), display: z.boolean().optional() }).strict(),
  z
    .object({ kind: z.literal("chemistry"), latex: z.string(), display: z.boolean().optional() })
    .strict(),
  z
    .object({
      kind: z.literal("table"),
      caption: z.string().optional(),
      header: z.array(z.string()),
      rows: z.array(z.array(z.string())),
    })
    .strict(),
  z.object({ kind: z.literal("image"), mediaId: z.string() }).strict(),
  z
    .object({
      kind: z.literal("diagram"),
      mediaId: z.string(),
      description: z.string().optional(),
    })
    .strict(),
  z
    .object({ kind: z.literal("code"), language: z.string().optional(), source: z.string() })
    .strict(),
  z
    .object({
      kind: z.literal("quotation"),
      text: z.string(),
      attribution: z.string().optional(),
      style: inlineStyleSchema.optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("poetry"),
      /** Stanza → lines. Line breaks are meaningful and preserved verbatim. */
      stanzas: z.array(z.array(z.string())),
      style: inlineStyleSchema.optional(),
    })
    .strict(),
]);

export type ContentBlock = z.infer<typeof contentBlockSchema>;
export const richContentSchema = z.array(contentBlockSchema).min(1);
export type RichContent = z.infer<typeof richContentSchema>;

/** Short inline content used for options, labels and answers. */
export const inlineContentSchema = z.array(contentBlockSchema);
export type InlineContent = z.infer<typeof inlineContentSchema>;

/* -------------------------------------------------------------------- media */

export const mediaSourceSchema = z
  .object({
    type: z.enum(["material", "document", "user_upload", "web", "backend_generated"]),
    title: z.string().optional(),
    url: z.string().url().optional(),
    publisher: z.string().optional(),
    documentId: z.string().optional(),
    page: z.number().int().positive().optional(),
    retrievedAt: z.string().datetime().optional(),
  })
  .strict();

export type MediaSource = z.infer<typeof mediaSourceSchema>;

export const assessmentMediaSchema = z
  .object({
    id: z.string(),
    kind: z.enum(["image", "diagram", "audio"]),
    purpose: z.enum([
      "stimulus",
      "question_illustration",
      "answer_option",
      "diagram",
      "result_explanation",
    ]),
    mimeType: z.string(),
    /** Signed or authenticated URL supplied by the backend. Never a hotlink. */
    url: z.string(),
    source: mediaSourceSchema,
    caption: z.string().optional(),
    altText: z.string(),
    longDescription: z.string().optional(),
    credit: z.string().optional(),
    license: z.string().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    /** True when the image is required to answer; forces accessibility metadata. */
    essential: z.boolean().optional(),
  })
  .strict()
  .refine((m) => !m.essential || Boolean(m.longDescription), {
    message: "An essential image requires a long description.",
    path: ["longDescription"],
  });

export type AssessmentMedia = z.infer<typeof assessmentMediaSchema>;

/* ------------------------------------------------------------ source refs */

export const sourceReferenceSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    type: z.enum(["syllabus", "material", "learning_goal", "grading_criteria", "document", "web"]),
    documentId: z.string().optional(),
    page: z.number().int().positive().optional(),
    url: z.string().url().optional(),
    publisher: z.string().optional(),
    retrievedAt: z.string().datetime().optional(),
  })
  .strict();

export type SourceReference = z.infer<typeof sourceReferenceSchema>;

/* ---------------------------------------------------------------- questions */

export const QUESTION_TYPES = [
  "multiple_choice",
  "true_false",
  "short_answer",
  "matching",
  "essay",
  "calculation",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/**
 * Types the renderer must tolerate in future backend payloads. They are not
 * offered in the setup wizard yet, but adding one must not require a rewrite.
 */
export const FUTURE_QUESTION_TYPES = [
  "numeric",
  "expression",
  "ordering",
  "cloze",
  "image_label",
  "multi_part",
  "stimulus_group",
] as const;
export type FutureQuestionType = (typeof FUTURE_QUESTION_TYPES)[number];

export const DIFFICULTY_LEVELS = ["easy", "medium", "advanced", "very_advanced"] as const;
export type Difficulty = (typeof DIFFICULTY_LEVELS)[number];

export const COGNITIVE_DEMANDS = [
  "recall",
  "understanding",
  "application",
  "analysis",
  "synthesis",
] as const;
export type CognitiveDemand = (typeof COGNITIVE_DEMANDS)[number];

const questionBaseSchema = z.object({
  id: z.string(),
  subject: z.string(),
  topic: z.string().optional(),
  learningGoalIds: z.array(z.string()).default([]),
  difficulty: z.enum(DIFFICULTY_LEVELS),
  cognitiveDemand: z.enum(COGNITIVE_DEMANDS).optional(),
  points: z.number().positive(),
  prompt: richContentSchema,
  media: z.array(assessmentMediaSchema).default([]),
  sources: z.array(sourceReferenceSchema).default([]),
  accessibility: z
    .object({
      /** Announced instead of the visual numbering when supplied. */
      screenReaderHint: z.string().optional(),
      requiresImage: z.boolean().optional(),
    })
    .strict()
    .optional(),
  /** Optional shared stimulus (passage, dataset, figure) rendered above. */
  stimulus: richContentSchema.optional(),
});

export const publicQuestionSchema = z.discriminatedUnion("type", [
  questionBaseSchema
    .extend({
      type: z.literal("multiple_choice"),
      /** `single` renders radios, `multiple` renders checkboxes. */
      selection: z.enum(["single", "multiple"]),
      options: z
        .array(z.object({ id: z.string(), content: inlineContentSchema }).strict())
        .min(2)
        .max(10),
    })
    .strict(),
  questionBaseSchema.extend({ type: z.literal("true_false") }).strict(),
  questionBaseSchema
    .extend({
      type: z.literal("short_answer"),
      expectedLength: z.enum(["word", "phrase", "sentence"]).default("phrase"),
    })
    .strict(),
  questionBaseSchema
    .extend({
      type: z.literal("matching"),
      left: z.array(z.object({ id: z.string(), content: inlineContentSchema }).strict()).min(2),
      right: z.array(z.object({ id: z.string(), content: inlineContentSchema }).strict()).min(2),
    })
    .strict(),
  questionBaseSchema
    .extend({
      type: z.literal("essay"),
      suggestedWords: z.number().int().positive().optional(),
    })
    .strict(),
  questionBaseSchema
    .extend({
      type: z.literal("calculation"),
      unitHint: z.string().optional(),
      allowWorkings: z.boolean().default(true),
    })
    .strict(),
]);

export type PublicQuestion = z.infer<typeof publicQuestionSchema>;
export const publicQuestionListSchema = z.array(publicQuestionSchema);

/**
 * SERVER-ONLY. Never fetched by the browser while an assessment is active; it
 * appears in the frontend exclusively inside a graded result.
 */
export interface AnswerKey {
  questionId: string;
  /** Model answer shown to the student only after grading. */
  modelAnswer?: RichContent | undefined;
  correctOptionIds?: string[] | undefined;
  correctBoolean?: boolean | undefined;
  correctPairs?: Array<{ leftId: string; rightId: string }>;
  canonicalValue?: string | undefined;
  tolerance?: number | undefined;
  unit?: string | undefined;
  rubric?: GradingRubric | undefined;
}

export interface GradingRubric {
  criteria: Array<{ id: string; description: string; maxPoints: number }>;
  notes?: string | undefined;
}

/* ------------------------------------------------------------------ answers */

export const studentAnswerSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("multiple_choice"),
      questionId: z.string(),
      selectedOptionIds: z.array(z.string()),
      /** Student annotation only. Eliminating an option is not an answer. */
      eliminatedOptionIds: z.array(z.string()).default([]),
    })
    .strict(),
  z
    .object({ type: z.literal("true_false"), questionId: z.string(), value: z.boolean().nullable() })
    .strict(),
  z.object({ type: z.literal("short_answer"), questionId: z.string(), text: z.string() }).strict(),
  z
    .object({
      type: z.literal("matching"),
      questionId: z.string(),
      pairs: z.array(z.object({ leftId: z.string(), rightId: z.string() }).strict()),
    })
    .strict(),
  z.object({ type: z.literal("essay"), questionId: z.string(), text: z.string() }).strict(),
  z
    .object({
      type: z.literal("calculation"),
      questionId: z.string(),
      /** Canonical LaTeX for grading. */
      latex: z.string(),
      /** What the student saw while typing. */
      display: z.string().optional(),
      unit: z.string().optional(),
      workings: z.string().optional(),
    })
    .strict(),
]);

export type StudentAnswer = z.infer<typeof studentAnswerSchema>;

/** True when the answer carries enough content to count as answered. */
export function isAnswered(answer: StudentAnswer | undefined): boolean {
  if (!answer) return false;
  switch (answer.type) {
    case "multiple_choice":
      return answer.selectedOptionIds.length > 0;
    case "true_false":
      return answer.value !== null;
    case "short_answer":
    case "essay":
      return answer.text.trim().length > 0;
    case "matching":
      return answer.pairs.length > 0;
    case "calculation":
      return answer.latex.trim().length > 0;
  }
}

/* ---------------------------------------------------------- configuration */

export const ASSESSMENT_KINDS = ["quick_check", "practice", "quiz", "mock_exam"] as const;
export type AssessmentKind = (typeof ASSESSMENT_KINDS)[number];

export const SOURCE_SCOPES = ["materials", "web", "both"] as const;
export type SourceScope = (typeof SOURCE_SCOPES)[number];

export const TIME_PRESETS = [5, 10, 20, 30, 45, 60, 90, 120] as const;

export type QuestionMix = Record<QuestionType, number>;

export interface AssessmentConfig {
  kind: AssessmentKind;
  subjectSlug: string;
  subjectName: string;
  /** Component of an SPF subject when applicable. */
  component?: string | undefined;
  topic?: string | undefined;
  learningGoalIds: string[];
  difficulty: Difficulty;
  sourceScope: SourceScope;
  /** Narrowing to individual materials is optional. */
  selectedMaterialIds: string[];
  questionMix: QuestionMix;
  /** `null` means untimed. */
  timeLimitMinutes: number | null;
  /** Practice may show feedback per question; scored modes defer it. */
  feedbackMode: "immediate" | "deferred";
  /** Known student context, never invented by the frontend. */
  schoolLevel: string | null;
  academicYear: string | null;
  language: string;
  includeInStats: boolean;
}

/* ------------------------------------------------------------------ results */

export const ATTEMPT_STATUSES = ["submitted", "grading", "graded", "grading_failed"] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

export interface QuestionResult {
  questionId: string;
  awardedPoints: number;
  maxPoints: number;
  correctness: "correct" | "partial" | "incorrect" | "unanswered" | "pending";
  modelAnswer?: RichContent | undefined;
  explanation?: RichContent | undefined;
  improvement?: RichContent | undefined;
  /** Why relevant distractors are wrong, keyed by option id. */
  optionExplanations?: Record<string | undefined, RichContent> | undefined;
  rubricFeedback?: Array<{ criterionId: string; description: string; awarded: number; max: number }>;
  sources?: SourceReference[] | undefined;
}

export interface AssessmentResult {
  attemptId: string;
  status: AttemptStatus;
  kind: AssessmentKind;
  subjectName: string;
  topics: string[];
  difficulty: Difficulty;
  awardedPoints: number;
  maxPoints: number;
  percentage: number;
  /** Only present when the backend supplies a Swiss grade. Never derived here. */
  swissGrade: number | null;
  timeTakenSeconds: number | null;
  submittedAt: string;
  gradedAt: string | null;
  byQuestionType: Array<{ type: QuestionType; awarded: number; max: number }>;
  byLearningGoal: Array<{ learningGoalId: string; label: string; awarded: number; max: number }>;
  strengths: string[];
  improvements: string[];
  questions: PublicQuestion[];
  answers: StudentAnswer[];
  results: QuestionResult[];
  includeInStats: boolean;
}

/* -------------------------------------------------------- knowledge profile */

export interface MasteryEntry {
  id: string;
  label: string;
  dimension: "subject" | "topic" | "subtopic" | "learning_goal" | "question_type" | "difficulty";
  /** 0–1, or null when there is not enough evidence. */
  mastery: number | null;
  /** Number of graded questions behind the estimate. */
  observations: number;
  confidence: "insufficient" | "low" | "medium" | "high";
}

/** Mastery is never inferred from a single question. */
export const MIN_OBSERVATIONS_FOR_MASTERY = 4;

export function confidenceFor(observations: number): MasteryEntry["confidence"] {
  if (observations < MIN_OBSERVATIONS_FOR_MASTERY) return "insufficient";
  if (observations < 10) return "low";
  if (observations < 25) return "medium";
  return "high";
}
