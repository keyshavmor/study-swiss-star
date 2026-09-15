import { describe, expect, it } from "vitest";
import {
  createDefaultConfig,
  MAX_TOTAL_QUESTIONS,
  setMixCount,
  totalQuestions,
  validateSetup,
} from "./config";
import { assessmentReducer, createSession, isDurable, isEphemeral } from "./lifecycle";
import {
  answerKeySchema,
  isAnswered,
  publicQuestionSchema,
  type AssessmentConfig,
  type PublicQuestion,
} from "./types";
import { unavailableAssessmentApi } from "./api";

function config(overrides: Partial<AssessmentConfig> = {}): AssessmentConfig {
  return {
    ...createDefaultConfig({
      kind: "quiz",
      subjectSlug: "biology",
      subjectName: "Biology",
      language: "German",
      schoolLevel: "Gymnasium",
      academicYear: "2025/26",
    }),
    ...overrides,
  };
}

const mcq: PublicQuestion = {
  id: "q1",
  type: "multiple_choice",
  subject: "Biology",
  difficulty: "medium",
  cognitiveDemand: "understanding",
  points: 1,
  learningGoalIds: [],
  prompt: [{ kind: "prose", text: "Which organelle makes ATP?" }],
  media: [],
  sources: [],
  selection: "single",
  options: [
    { id: "a", content: [{ kind: "prose", text: "Mitochondrion" }] },
    { id: "b", content: [{ kind: "prose", text: "Ribosome" }] },
  ],
};

describe("question contract", () => {
  it("validates a well-formed public question", () => {
    expect(publicQuestionSchema.safeParse(mcq).success).toBe(true);
  });

  it("rejects a multiple choice question with a single option", () => {
    const broken = { ...mcq, options: [mcq.type === "multiple_choice" ? mcq.options[0] : null] };
    expect(publicQuestionSchema.safeParse(broken).success).toBe(false);
  });

  it("never carries answer-key fields on the visible question", () => {
    const parsed = publicQuestionSchema.parse(mcq) as Record<string, unknown>;
    expect(parsed).not.toHaveProperty("correctOptionIds");
    expect(parsed).not.toHaveProperty("rubric");
    expect(parsed).not.toHaveProperty("modelAnswer");
  });

  it("keeps the answer key in a separate schema", () => {
    const key = answerKeySchema.safeParse({
      questionId: "q1",
      type: "multiple_choice",
      correctOptionIds: ["a"],
    });
    expect(key.success).toBe(true);
  });

  it("treats empty answers as unanswered", () => {
    expect(isAnswered(undefined)).toBe(false);
    expect(
      isAnswered({
        type: "multiple_choice",
        questionId: "q1",
        selectedOptionIds: [],
        eliminatedOptionIds: ["b"],
      }),
    ).toBe(false);
    expect(
      isAnswered({
        type: "multiple_choice",
        questionId: "q1",
        selectedOptionIds: ["a"],
        eliminatedOptionIds: [],
      }),
    ).toBe(true);
  });
});

describe("setup validation", () => {
  it("counts the question mix", () => {
    const mix = setMixCount(config().questionMix, "essay", 3);
    expect(mix.essay).toBe(3);
    expect(totalQuestions(mix)).toBe(totalQuestions(config().questionMix) + 3);
  });

  it("rejects an empty mix", () => {
    const issues = validateSetup(
      config({
        questionMix: {
          multiple_choice: 0,
          true_false: 0,
          short_answer: 0,
          matching: 0,
          essay: 0,
          calculation: 0,
        },
      }),
    );
    expect(issues.map((issue) => issue.messageKey)).toContain("assessment.setup.error.noQuestions");
  });

  it("rejects more questions than the maximum", () => {
    const issues = validateSetup(
      config({
        questionMix: {
          multiple_choice: 30,
          true_false: 30,
          short_answer: 30,
          matching: 0,
          essay: 0,
          calculation: 0,
        },
      }),
    );
    expect(totalQuestions(config().questionMix)).toBeLessThan(MAX_TOTAL_QUESTIONS);
    expect(issues.map((issue) => issue.messageKey)).toContain(
      "assessment.setup.error.tooManyQuestions",
    );
  });

  it("requires a time allowance for a mock exam", () => {
    const issues = validateSetup(config({ kind: "mock_exam", timeLimitMinutes: null }));
    expect(issues.map((issue) => issue.messageKey)).toContain(
      "assessment.setup.error.examNeedsTime",
    );
  });

  it("keeps AI practice out of subject averages by default", () => {
    expect(config().includeInStats).toBe(false);
  });
});

describe("lifecycle state machine", () => {
  function ready() {
    let session = createSession(null);
    session = assessmentReducer(session, { type: "configure", config: config() });
    session = assessmentReducer(session, { type: "request_generation" });
    session = assessmentReducer(session, { type: "generation_accepted", jobId: "job-1" });
    return assessmentReducer(session, {
      type: "generation_ready",
      questions: [mcq],
      attemptId: "attempt-1",
    });
  }

  it("walks setup → ready → in progress → submitted", () => {
    let session = ready();
    expect(session.state).toBe("ready");
    session = assessmentReducer(session, {
      type: "begin",
      startedAt: new Date().toISOString(),
      secondsRemaining: 60,
    });
    expect(session.state).toBe("in_progress");
    session = assessmentReducer(session, { type: "submit" });
    expect(session.state).toBe("submitting");
    session = assessmentReducer(session, { type: "submitted", attemptId: "attempt-1" });
    expect(session.state).toBe("submitted");
  });

  it("ignores invalid transitions", () => {
    const session = assessmentReducer(createSession(null), { type: "submit" });
    expect(session.state).toBe("setup");
  });

  it("does not start the timer before Begin", () => {
    expect(ready().secondsRemaining).toBeNull();
  });

  it("auto-submits when the time runs out", () => {
    let session = assessmentReducer(ready(), {
      type: "begin",
      startedAt: new Date().toISOString(),
      secondsRemaining: 1,
    });
    session = assessmentReducer(session, { type: "tick" });
    expect(session.secondsRemaining).toBe(0);
    expect(session.state).toBe("submitting");
  });

  it("allows skipping and returning to a question", () => {
    let session = assessmentReducer(ready(), {
      type: "begin",
      startedAt: new Date().toISOString(),
      secondsRemaining: null,
    });
    session = assessmentReducer(session, { type: "goto", index: 0 });
    session = assessmentReducer(session, { type: "toggle_review", questionId: "q1" });
    expect(session.markedForReview).toEqual(["q1"]);
    session = assessmentReducer(session, { type: "toggle_review", questionId: "q1" });
    expect(session.markedForReview).toEqual([]);
  });

  it("discards generated content when the attempt is abandoned", () => {
    const session = assessmentReducer(
      assessmentReducer(ready(), {
        type: "begin",
        startedAt: new Date().toISOString(),
        secondsRemaining: null,
      }),
      { type: "abandon" },
    );
    expect(session.state).toBe("abandoned");
    expect(session.questions).toEqual([]);
    expect(session.answers).toEqual({});
  });

  it("marks pre-submission states ephemeral and graded results durable", () => {
    expect(isEphemeral("generating")).toBe(true);
    expect(isEphemeral("ready")).toBe(true);
    expect(isEphemeral("in_progress")).toBe(true);
    expect(isDurable("submitted")).toBe(true);
    expect(isDurable("graded")).toBe(true);
    expect(isDurable("ready")).toBe(false);
  });
});

describe("production assessment adapter", () => {
  it("reports the backend as unavailable instead of inventing content", async () => {
    const response = await unavailableAssessmentApi.createGenerationJob(config());
    expect(response.ok).toBe(false);
    if (!response.ok) expect(response.failure).toBe("backend_unavailable");
  });
});
