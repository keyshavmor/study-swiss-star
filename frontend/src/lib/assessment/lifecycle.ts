/**
 * Assessment lifecycle state machine.
 *
 * All flow control lives here rather than in booleans spread across components.
 * Invalid transitions are impossible from ordinary UI actions: an unknown
 * transition returns the current state unchanged.
 */
import type { AssessmentConfig, AssessmentResult, PublicQuestion, StudentAnswer } from "./types";

export const ASSESSMENT_STATES = [
  "setup",
  "generation_requested",
  "generating",
  "ready",
  "in_progress",
  "submitting",
  "submitted",
  "grading",
  "graded",
  "abandoned",
  "expired",
  "generation_failed",
  "grading_failed",
] as const;

export type AssessmentState = (typeof ASSESSMENT_STATES)[number];

/** Phases are only displayed when the backend actually reports them. */
export type GenerationPhase = "queued" | "generating" | "validating";

export interface AssessmentSession {
  state: AssessmentState;
  config: AssessmentConfig | null;
  jobId: string | null;
  attemptId: string | null;
  /** Reported by the backend; never synthesised locally. */
  phase: GenerationPhase | null;
  questions: PublicQuestion[];
  /** Ephemeral until final submission. Never persisted to localStorage. */
  answers: Record<string, StudentAnswer>;
  markedForReview: string[];
  currentIndex: number;
  /** Seconds left, or null when untimed / not started. */
  secondsRemaining: number | null;
  startedAt: string | null;
  result: AssessmentResult | null;
  errorKey: string | null;
}

export function createSession(config: AssessmentConfig | null = null): AssessmentSession {
  return {
    state: "setup",
    config,
    jobId: null,
    attemptId: null,
    phase: null,
    questions: [],
    answers: {},
    markedForReview: [],
    currentIndex: 0,
    secondsRemaining: null,
    startedAt: null,
    result: null,
    errorKey: null,
  };
}

export type AssessmentAction =
  | { type: "configure"; config: AssessmentConfig }
  | { type: "request_generation" }
  | { type: "generation_accepted"; jobId: string }
  | { type: "generation_phase"; phase: GenerationPhase }
  | { type: "generation_ready"; questions: PublicQuestion[]; attemptId: string }
  | { type: "generation_failed"; errorKey: string }
  | { type: "cancel_generation" }
  | { type: "begin"; startedAt: string; secondsRemaining: number | null }
  | { type: "answer"; answer: StudentAnswer }
  | { type: "clear_answer"; questionId: string }
  | { type: "toggle_review"; questionId: string }
  | { type: "goto"; index: number }
  | { type: "tick" }
  | { type: "expire" }
  | { type: "submit" }
  | { type: "submitted"; attemptId: string }
  | { type: "grading" }
  | { type: "graded"; result: AssessmentResult }
  | { type: "grading_failed"; errorKey: string }
  | { type: "abandon" }
  | { type: "reset" };

const RUNNING: AssessmentState[] = ["in_progress"];

export function assessmentReducer(
  session: AssessmentSession,
  action: AssessmentAction,
): AssessmentSession {
  switch (action.type) {
    case "configure":
      if (session.state !== "setup") return session;
      return { ...session, config: action.config, errorKey: null };

    case "request_generation":
      if (session.state !== "setup" || !session.config) return session;
      return { ...session, state: "generation_requested", errorKey: null };

    case "generation_accepted":
      if (session.state !== "generation_requested") return session;
      return { ...session, state: "generating", jobId: action.jobId };

    case "generation_phase":
      if (session.state !== "generating") return session;
      return { ...session, phase: action.phase };

    case "generation_ready":
      if (session.state !== "generating" && session.state !== "generation_requested") {
        return session;
      }
      return {
        ...session,
        state: "ready",
        phase: null,
        questions: action.questions,
        attemptId: action.attemptId,
      };

    case "generation_failed":
      if (session.state !== "generating" && session.state !== "generation_requested") {
        return session;
      }
      return { ...session, state: "generation_failed", phase: null, errorKey: action.errorKey };

    case "cancel_generation":
      if (!["generation_requested", "generating", "ready"].includes(session.state)) return session;
      return { ...createSession(session.config), state: "setup" };

    case "begin":
      if (session.state !== "ready") return session;
      return {
        ...session,
        state: "in_progress",
        startedAt: action.startedAt,
        secondsRemaining: action.secondsRemaining,
        currentIndex: 0,
      };

    case "answer":
      if (!RUNNING.includes(session.state)) return session;
      return {
        ...session,
        answers: { ...session.answers, [action.answer.questionId]: action.answer },
      };

    case "clear_answer": {
      if (!RUNNING.includes(session.state)) return session;
      const answers = { ...session.answers };
      delete answers[action.questionId];
      return { ...session, answers };
    }

    case "toggle_review": {
      if (!RUNNING.includes(session.state)) return session;
      const marked = session.markedForReview.includes(action.questionId)
        ? session.markedForReview.filter((id) => id !== action.questionId)
        : [...session.markedForReview, action.questionId];
      return { ...session, markedForReview: marked };
    }

    case "goto": {
      if (!RUNNING.includes(session.state)) return session;
      const index = Math.max(0, Math.min(session.questions.length - 1, action.index));
      return { ...session, currentIndex: index };
    }

    case "tick": {
      if (session.state !== "in_progress" || session.secondsRemaining === null) return session;
      const next = session.secondsRemaining - 1;
      if (next > 0) return { ...session, secondsRemaining: next };
      // Time is up: editing stops and the attempt auto-submits.
      return { ...session, secondsRemaining: 0, state: "submitting" };
    }

    case "expire":
      if (session.state !== "in_progress") return session;
      return { ...session, secondsRemaining: 0, state: "submitting" };

    case "submit":
      if (session.state !== "in_progress") return session;
      return { ...session, state: "submitting" };

    case "submitted":
      if (session.state !== "submitting") return session;
      return { ...session, state: "submitted", attemptId: action.attemptId };

    case "grading":
      if (session.state !== "submitted") return session;
      return { ...session, state: "grading" };

    case "graded":
      if (!["submitted", "grading"].includes(session.state)) return session;
      return {
        ...session,
        state: "graded",
        result: action.result,
        // Active question set and answers are no longer needed in memory.
        questions: [],
        answers: {},
      };

    case "grading_failed":
      if (!["submitted", "grading", "submitting"].includes(session.state)) return session;
      return { ...session, state: "grading_failed", errorKey: action.errorKey };

    case "abandon":
      if (["graded", "submitted", "grading"].includes(session.state)) return session;
      return { ...createSession(session.config), state: "abandoned" };

    case "reset":
      return createSession(session.config);
  }
}

/** True while generated content and answers must be treated as ephemeral. */
export function isEphemeral(state: AssessmentState): boolean {
  return [
    "generation_requested",
    "generating",
    "ready",
    "in_progress",
    "submitting",
    "generation_failed",
  ].includes(state);
}

/** True once the attempt is durable and the student may safely leave. */
export function isDurable(state: AssessmentState): boolean {
  return ["submitted", "grading", "graded", "grading_failed"].includes(state);
}

export interface ReviewSummary {
  answered: string[];
  unanswered: string[];
  marked: string[];
}

export function reviewSummary(
  session: AssessmentSession,
  answeredCheck: (answer: StudentAnswer | undefined) => boolean,
): ReviewSummary {
  const answered: string[] = [];
  const unanswered: string[] = [];
  for (const question of session.questions) {
    if (answeredCheck(session.answers[question.id])) answered.push(question.id);
    else unanswered.push(question.id);
  }
  return { answered, unanswered, marked: [...session.markedForReview] };
}
