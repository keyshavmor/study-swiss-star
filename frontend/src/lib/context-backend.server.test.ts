import { afterEach, describe, expect, test } from "bun:test";
import { ContextBackendError, requestContextAnswer } from "./context-backend.server";

const originalFetch = globalThis.fetch;
const originalUrl = process.env["ALIM_CONTEXT_BACKEND_URL"];

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env["ALIM_CONTEXT_BACKEND_URL"];
  else process.env["ALIM_CONTEXT_BACKEND_URL"] = originalUrl;
});

describe("local backend adapter", () => {
  test("forwards the verified caller token, matching student context, and language", async () => {
    process.env["ALIM_CONTEXT_BACKEND_URL"] = "http://backend.test";
    let captured: Request | undefined;
    globalThis.fetch = async (input, init) => {
      captured = new Request(input, init);
      return Response.json({
        thread_id: "thread-1",
        message_id: "reply-1",
        answer: "Antwort",
        sources: [],
        exam_tip: null,
        used_model: "qwen-test",
        retrieval_summary: { chunks_considered: 0, chunks_used: 0, collections: [] },
        language: "gsw",
        created_at: "2026-09-15T00:00:00Z",
      });
    };

    await requestContextAnswer({
      accessToken: "caller.jwt.value",
      studentId: "user-1",
      threadId: "thread-1",
      question: "Chasch mier das erklärä?",
      responseLanguage: "gsw",
    });

    expect(captured?.headers.get("authorization")).toBe("Bearer caller.jwt.value");
    expect(captured?.headers.get("x-student-id")).toBe("user-1");
    expect(await captured?.json()).toMatchObject({ language: "gsw", stream: false });
  });

  test("preserves backend status, code, and request id without exposing the token", async () => {
    globalThis.fetch = async () =>
      Response.json(
        { error: { code: "invalid_token", message: "Unauthorized", request_id: "req_123" } },
        { status: 401, headers: { "X-Request-Id": "req_123" } },
      );

    try {
      await requestContextAnswer({
        accessToken: "sensitive.jwt.value",
        studentId: "user-1",
        threadId: "thread-1",
        question: "Hello",
        responseLanguage: "en",
      });
      throw new Error("expected request to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ContextBackendError);
      expect(error).toMatchObject({ status: 401, code: "invalid_token", requestId: "req_123" });
      expect(String(error)).not.toContain("sensitive.jwt.value");
    }
  });
});
