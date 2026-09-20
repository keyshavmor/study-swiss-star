import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createGenerationOnBackend,
  generationStatusOnBackend,
  submitAssessmentOnBackend,
} from "./assessment-backend.server";
import type { AssessmentConfig } from "./assessment/types";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const config: AssessmentConfig = {
  kind: "quiz",
  subjectSlug: "biology",
  subjectName: "Biology",
  learningGoalIds: [],
  difficulty: "medium",
  sourceScope: "materials",
  selectedMaterialIds: [],
  questionMix: {
    multiple_choice: 1,
    true_false: 0,
    short_answer: 0,
    matching: 0,
    essay: 0,
    calculation: 0,
  },
  timeLimitMinutes: 20,
  feedbackMode: "deferred",
  schoolLevel: null,
  academicYear: null,
  language: "German",
  includeInStats: false,
};

describe("assessment loopback adapter", () => {
  it("forwards verified identity, model, config and idempotency without browser secrets", async () => {
    const captured: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      captured.push({ url, init });
      return new Response(JSON.stringify({ jobId: "job-1", phase: "queued" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const result = await createGenerationOnBackend({
      accessToken: "header.payload.signature",
      studentId: "user-a",
      config,
      modelId: "Qwen/Qwen3.8-27B",
      idempotencyKey: "generation-key",
    });
    expect(result).toEqual({ ok: true, data: { jobId: "job-1", phase: "queued" } });
    expect(captured[0]?.url).toBe("http://127.0.0.1:8001/api/assessments/generation");
    const headers = new Headers(captured[0]?.init.headers);
    expect(headers.get("authorization")).toBe("Bearer header.payload.signature");
    expect(headers.get("x-student-id")).toBe("user-a");
    expect(JSON.parse(String(captured[0]?.init.body))).toMatchObject({
      config,
      model_id: "Qwen/Qwen3.8-27B",
      idempotency_key: "generation-key",
    });
  });

  it("uses encoded owned IDs and maps validation failures without exposing provider bodies", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "assessment_snapshot_mismatch" } }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const result = await generationStatusOnBackend({
      accessToken: "token",
      studentId: "user-a",
      jobId: "job/unsafe",
    });
    expect(result).toEqual({ ok: false, failure: "invalid_payload" });
    expect(fetch.mock.calls[0]?.[0]).toContain("job%2Funsafe");
  });

  it("fails closed when submission transport is offline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const result = await submitAssessmentOnBackend({
      accessToken: "token",
      studentId: "user-a",
      idempotencyKey: "submission-key",
      payload: {
        attemptId: "attempt-1",
        config,
        questions: [],
        answers: [],
        startedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        timeTakenSeconds: 0,
        autoSubmitted: false,
      },
    });
    expect(result).toEqual({ ok: false, failure: "backend_unavailable" });
  });
});
