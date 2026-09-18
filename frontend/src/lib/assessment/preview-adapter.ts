/**
 * DEVELOPMENT-ONLY preview adapter.
 *
 * It exists so the assessment flows can be reviewed visually before the local
 * Python backend exists. It contains hand-written sample content and simple
 * deterministic scoring. It is NOT AI behaviour, it is never enabled in a
 * production build, and every screen it feeds shows a visible development
 * notice.
 */
import {
  isAnswered,
  type AssessmentConfig,
  type AssessmentResult,
  type PublicQuestion,
  type QuestionResult,
  type QuestionType,
  type RichContent,
  type StudentAnswer,
} from "./types";
import {
  setAssessmentApi,
  unavailableAssessmentApi,
  type AssessmentApi,
  type GenerationStatus,
  type SubmitPayload,
} from "./api";
import { QUESTION_TYPES } from "./types";

export const PREVIEW_NOTICE_KEY = "assessment.previewNotice";

const prose = (text: string): RichContent => [{ kind: "prose", text }];

function sampleQuestion(
  type: QuestionType,
  index: number,
  config: AssessmentConfig,
): PublicQuestion {
  const base = {
    id: `preview-${type}-${index}`,
    subject: config.subjectName,
    topic: config.topic,
    learningGoalIds: config.learningGoalIds.slice(0, 1),
    difficulty: config.difficulty,
    points: 2,
    media: [],
    sources: [
      {
        id: "preview-source",
        label: "Development sample source",
        type: "material" as const,
      },
    ],
  };
  switch (type) {
    case "multiple_choice":
      return {
        ...base,
        type: "multiple_choice",
        selection: index % 3 === 0 ? "multiple" : "single",
        prompt: [
          { kind: "prose", text: "Which statements about the sample below are correct?" },
          { kind: "chemistry", latex: "\\ce{2H2 + O2 -> 2H2O}", display: true },
        ],
        options: [
          { id: "a", content: prose("The reaction is a synthesis reaction.") },
          { id: "b", content: [{ kind: "chemistry", latex: "\\ce{H2O}" }] },
          { id: "c", content: prose("Oxygen is reduced.") },
          { id: "d", content: prose("The coefficients are unbalanced.") },
        ],
      };
    case "true_false":
      return {
        ...base,
        type: "true_false",
        points: 1,
        prompt: prose("A eukaryotic cell contains a membrane-bound nucleus."),
      };
    case "short_answer":
      return {
        ...base,
        type: "short_answer",
        expectedLength: "sentence",
        prompt: prose("Explain in one sentence why mitosis produces identical daughter cells."),
      };
    case "matching":
      return {
        ...base,
        type: "matching",
        prompt: prose("Match each organelle to its function."),
        left: [
          { id: "l1", content: prose("Mitochondrion") },
          { id: "l2", content: prose("Ribosome") },
          { id: "l3", content: prose("Chloroplast") },
        ],
        right: [
          { id: "r1", content: prose("Protein synthesis") },
          { id: "r2", content: prose("Cellular respiration") },
          { id: "r3", content: prose("Photosynthesis") },
        ],
      };
    case "essay":
      return {
        ...base,
        type: "essay",
        points: 8,
        suggestedWords: 250,
        prompt: prose(
          "Discuss how cell membrane transport supports homeostasis. Use examples and structure your argument.",
        ),
      };
    case "calculation":
      return {
        ...base,
        type: "calculation",
        points: 4,
        unitHint: "m s^-2",
        allowWorkings: true,
        prompt: [
          { kind: "prose", text: "A body falls freely for 3 s. Determine its final velocity." },
          {
            kind: "math",
            latex: "v = v_0 + g t,\\quad g = 9.81\\,\\mathrm{m\\,s^{-2}}",
            display: true,
          },
        ],
      };
  }
}

function buildQuestions(config: AssessmentConfig): PublicQuestion[] {
  const questions: PublicQuestion[] = [];
  for (const type of QUESTION_TYPES) {
    const count = config.questionMix[type] ?? 0;
    for (let i = 0; i < count; i += 1) questions.push(sampleQuestion(type, i, config));
  }
  return questions;
}

interface PreviewJob {
  config: AssessmentConfig;
  createdAt: number;
  cancelled: boolean;
  attemptId: string;
}

const jobs = new Map<string, PreviewJob>();
const attempts = new Map<string, { payload: SubmitPayload; gradedAt: number }>();

const GENERATION_MS = 6000;
const GRADING_MS = 8000;

function scoreAnswer(question: PublicQuestion, answer: StudentAnswer | undefined): QuestionResult {
  const max = question.points;
  if (!isAnswered(answer)) {
    return {
      questionId: question.id,
      awardedPoints: 0,
      maxPoints: max,
      correctness: "unanswered",
      explanation: prose("No answer was given, so this question scored zero points."),
    };
  }
  // Deterministic development scoring — not a model judgement.
  const awarded = question.type === "essay" ? Math.round(max * 0.75) : max;
  return {
    questionId: question.id,
    awardedPoints: awarded,
    maxPoints: max,
    correctness: awarded === max ? "correct" : "partial",
    modelAnswer: prose("Development sample model answer."),
    explanation: prose(
      "Development sample explanation. The production backend supplies the real explanation and sources.",
    ),
    improvement:
      awarded < max
        ? prose("Add a clearer link between the mechanism and the outcome.")
        : undefined,
    sources: question.sources,
  };
}

function buildResult(payload: SubmitPayload): AssessmentResult {
  const results = payload.questions.map((question) =>
    scoreAnswer(
      question,
      payload.answers.find((answer) => answer.questionId === question.id),
    ),
  );
  const awardedPoints = results.reduce((sum, r) => sum + r.awardedPoints, 0);
  const maxPoints = results.reduce((sum, r) => sum + r.maxPoints, 0);
  const byQuestionType = QUESTION_TYPES.map((type) => {
    const relevant = payload.questions.filter((q) => q.type === type);
    return {
      type,
      awarded: relevant.reduce(
        (sum, q) => sum + (results.find((r) => r.questionId === q.id)?.awardedPoints ?? 0),
        0,
      ),
      max: relevant.reduce((sum, q) => sum + q.points, 0),
    };
  }).filter((entry) => entry.max > 0);

  return {
    attemptId: payload.attemptId,
    status: "graded",
    kind: payload.config.kind,
    subjectName: payload.config.subjectName,
    topics: payload.config.topic ? [payload.config.topic] : [],
    difficulty: payload.config.difficulty,
    awardedPoints,
    maxPoints,
    percentage: maxPoints > 0 ? Math.round((awardedPoints / maxPoints) * 100) : 0,
    // The preview adapter never invents a Swiss grade.
    swissGrade: null,
    timeTakenSeconds: payload.timeTakenSeconds,
    submittedAt: payload.submittedAt,
    gradedAt: new Date().toISOString(),
    byQuestionType,
    byLearningGoal: [],
    strengths: [],
    improvements: [],
    questions: payload.questions,
    answers: payload.answers,
    results,
    includeInStats: payload.config.includeInStats,
  };
}

export const previewAssessmentApi: AssessmentApi = {
  ...unavailableAssessmentApi,
  async createGenerationJob(config) {
    const jobId = `preview-job-${Date.now()}`;
    jobs.set(jobId, {
      config,
      createdAt: Date.now(),
      cancelled: false,
      attemptId: `preview-attempt-${Date.now()}`,
    });
    return { ok: true, data: { jobId, phase: "queued" } };
  },
  async getGenerationStatus(jobId) {
    const job = jobs.get(jobId);
    if (!job) return { ok: false, failure: "backend_unavailable" };
    if (job.cancelled) {
      return {
        ok: true,
        data: { jobId, state: "cancelled", phase: null } satisfies GenerationStatus,
      };
    }
    const elapsed = Date.now() - job.createdAt;
    if (elapsed < GENERATION_MS * 0.4) {
      return { ok: true, data: { jobId, state: "generating", phase: "generating" } };
    }
    if (elapsed < GENERATION_MS) {
      return { ok: true, data: { jobId, state: "validating", phase: "validating" } };
    }
    return {
      ok: true,
      data: {
        jobId,
        state: "ready",
        phase: null,
        questions: buildQuestions(job.config),
        attemptId: job.attemptId,
      },
    };
  },
  async cancelGeneration(jobId) {
    const job = jobs.get(jobId);
    if (job) job.cancelled = true;
    return { ok: true, data: { cancelled: true } };
  },
  async beginAssessment() {
    return { ok: true, data: { startedAt: new Date().toISOString() } };
  },
  async heartbeat() {
    return { ok: true, data: { alive: true } };
  },
  async submitAssessment(payload) {
    attempts.set(payload.attemptId, { payload, gradedAt: Date.now() + GRADING_MS });
    return { ok: true, data: { attemptId: payload.attemptId } };
  },
  async abandonAssessment(reference) {
    if (reference.jobId) jobs.delete(reference.jobId);
    if (reference.attemptId)
      jobs.forEach((job, id) => {
        if (job.attemptId === reference.attemptId) jobs.delete(id);
      });
    return { ok: true, data: { cleaned: true } };
  },
  async getGradingStatus(attemptId) {
    const attempt = attempts.get(attemptId);
    if (!attempt) return { ok: false, failure: "backend_unavailable" };
    return {
      ok: true,
      data: {
        attemptId,
        status: Date.now() >= attempt.gradedAt ? "graded" : "grading",
      },
    };
  },
  async getResult(attemptId) {
    const attempt = attempts.get(attemptId);
    if (!attempt || Date.now() < attempt.gradedAt) {
      return { ok: false, failure: "backend_unavailable" };
    }
    return { ok: true, data: buildResult(attempt.payload) };
  },
};

/** True only in a development build. */
export function isPreviewAdapterEnabled(): boolean {
  return Boolean(import.meta.env?.DEV);
}

/** Installs the preview adapter in development builds only. */
export function installPreviewAdapterInDevelopment(): void {
  if (isPreviewAdapterEnabled()) setAssessmentApi(previewAssessmentApi);
}
