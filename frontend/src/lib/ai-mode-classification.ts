/**
 * CURRENT FRONTEND: single source of truth for which subject surfaces depend on
 * an AI model and which ones must keep working without AI.
 *
 * Readiness itself is never decided here — that stays with
 * `useAiAvailability()` (backend-confirmed session state). This module only
 * classifies surfaces so School/Subject UI and documentation cannot drift.
 */
import type { SubjectMode } from "@/lib/mock/materials";

/** Modes that issue (or will issue) a local model request. */
export const AI_DEPENDENT_SUBJECT_MODES = [
  "Chat",
  "Quick Check",
  "Knowledge Profile",
  "Quiz Mode",
  "Mock Exam",
  "Study Plan",
] as const satisfies readonly SubjectMode[];

/** Modes backed only by Supabase / local data — always usable. */
export const NON_AI_SUBJECT_MODES = ["Statistics", "Subject Tools"] as const satisfies
  readonly SubjectMode[];

export type AiDependentSubjectMode = (typeof AI_DEPENDENT_SUBJECT_MODES)[number];

export function isAiDependentSubjectMode(mode: SubjectMode): boolean {
  return (AI_DEPENDENT_SUBJECT_MODES as readonly string[]).includes(mode);
}

/**
 * Modes where stored, non-AI content stays readable while only the AI action
 * (refresh / analyse / generate) is blocked.
 */
export const PARTIALLY_AI_DEPENDENT_SUBJECT_MODES = ["Knowledge Profile"] as const satisfies
  readonly SubjectMode[];

export function keepsReadOnlyContentWhenBlocked(mode: SubjectMode): boolean {
  return (PARTIALLY_AI_DEPENDENT_SUBJECT_MODES as readonly string[]).includes(mode);
}

/**
 * Subject Tools are classified per tool instead of blanket-blocked: only tools
 * that actually call a model are gated.
 */
export const SUBJECT_TOOL_AI_DEPENDENCY = {
  "formula-sheet": false,
  "unit-converter": false,
  "periodic-table": false,
  "vocabulary-trainer": false,
  "concept-explainer": true,
  "summary-generator": true,
  "flashcard-generator": true,
} as const;

export type SubjectToolId = keyof typeof SUBJECT_TOOL_AI_DEPENDENCY;

export function isAiDependentSubjectTool(tool: string): boolean {
  return SUBJECT_TOOL_AI_DEPENDENCY[tool as SubjectToolId] === true;
}
