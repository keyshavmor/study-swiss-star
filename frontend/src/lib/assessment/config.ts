/** Question-mix arithmetic and setup validation for assessment configuration. */
import type { TranslationKey } from "@/lib/i18n";
import {
  QUESTION_TYPES,
  type AssessmentConfig,
  type AssessmentKind,
  type QuestionMix,
  type QuestionType,
} from "./types";

export const MAX_QUESTIONS_PER_TYPE = 30;
export const MAX_TOTAL_QUESTIONS = 60;

export function emptyQuestionMix(): QuestionMix {
  return QUESTION_TYPES.reduce((mix, type) => {
    mix[type] = 0;
    return mix;
  }, {} as QuestionMix);
}

export function defaultQuestionMix(kind: AssessmentKind): QuestionMix {
  const mix = emptyQuestionMix();
  if (kind === "quick_check") {
    mix.multiple_choice = 1;
    return mix;
  }
  if (kind === "mock_exam") {
    mix.multiple_choice = 6;
    mix.short_answer = 4;
    mix.calculation = 2;
    mix.essay = 1;
    return mix;
  }
  mix.multiple_choice = 5;
  mix.true_false = 3;
  mix.short_answer = 2;
  return mix;
}

export function totalQuestions(mix: QuestionMix): number {
  return QUESTION_TYPES.reduce((sum, type) => sum + (mix[type] ?? 0), 0);
}

export function setMixCount(mix: QuestionMix, type: QuestionType, count: number): QuestionMix {
  const bounded = Math.max(0, Math.min(MAX_QUESTIONS_PER_TYPE, Math.trunc(count) || 0));
  return { ...mix, [type]: bounded };
}

export interface SetupIssue {
  field: "questionMix" | "timeLimit" | "sourceScope" | "subject" | "total";
  messageKey: TranslationKey;
}

/** Pure validation used by the wizard and by tests. */
export function validateSetup(config: AssessmentConfig): SetupIssue[] {
  const issues: SetupIssue[] = [];
  const total = totalQuestions(config.questionMix);
  if (!config.subjectSlug) {
    issues.push({ field: "subject", messageKey: "assessment.setup.error.subject" });
  }
  if (total < 1) {
    issues.push({ field: "questionMix", messageKey: "assessment.setup.error.noQuestions" });
  }
  if (total > MAX_TOTAL_QUESTIONS) {
    issues.push({ field: "total", messageKey: "assessment.setup.error.tooManyQuestions" });
  }
  if (config.timeLimitMinutes !== null && config.timeLimitMinutes < 1) {
    issues.push({ field: "timeLimit", messageKey: "assessment.setup.error.timeLimit" });
  }
  if (config.kind === "mock_exam" && config.timeLimitMinutes === null) {
    issues.push({ field: "timeLimit", messageKey: "assessment.setup.error.examNeedsTime" });
  }
  if (config.sourceScope === "materials" && config.selectedMaterialIds.length === 0) {
    // Not an error: the whole subject library is used when nothing is narrowed.
  }
  return issues;
}

export function isSetupValid(config: AssessmentConfig): boolean {
  return validateSetup(config).length === 0;
}

export function createDefaultConfig(input: {
  kind: AssessmentKind;
  subjectSlug: string;
  subjectName: string;
  component?: string | undefined;
  language: string;
  schoolLevel: string | null;
  academicYear: string | null;
}): AssessmentConfig {
  return {
    kind: input.kind,
    subjectSlug: input.subjectSlug,
    subjectName: input.subjectName,
    component: input.component,
    learningGoalIds: [],
    difficulty: "medium",
    sourceScope: "materials",
    selectedMaterialIds: [],
    questionMix: defaultQuestionMix(input.kind),
    timeLimitMinutes: input.kind === "mock_exam" ? 60 : input.kind === "quick_check" ? null : 20,
    feedbackMode: input.kind === "practice" ? "immediate" : "deferred",
    schoolLevel: input.schoolLevel,
    academicYear: input.academicYear,
    language: input.language,
    // AI practice never feeds teacher-entered academic averages by default.
    includeInStats: false,
  };
}
