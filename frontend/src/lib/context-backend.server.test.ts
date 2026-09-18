import { afterEach, describe, expect, it, vi } from "vitest";
import { ContextBackendError, requestContextAnswer } from "./context-backend.server";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

const answer = {
  thread_id: "thread-a",
  message_id: "message-a",
  answer: "Verified local answer",
  sources: [],
  exam_tip: null,
  used_model: "fake-local-model",
  retrieval_summary: { chunks_considered: 0, chunks_used: 0, collections: [] },
  language: "en",
  created_at: "2026-09-18T00:00:00Z",
};

describe("subject-chat local backend contract", () => {
  it("forwards the already-verified caller token and subject as a cross-check", async () => {
    const captured: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      captured.push({ url, init });
      return new Response(JSON.stringify(answer), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const result = await requestContextAnswer({
      accessToken: "header.payload.signature",
      studentId: "user-a",
      threadId: "thread-a",
      userMessageId: "message-user",
      question: "Explain ATP",
      subject: "Biology",
      academicYear: "2026/27",
      gradeLevel: 11,
    });

    expect(result).toEqual(answer);
    expect(captured[0]?.url).toBe("http://127.0.0.1:8001/api/chat");
    const headers = new Headers(captured[0]?.init.headers);
    expect(headers.get("authorization")).toBe("Bearer header.payload.signature");
    expect(headers.get("x-student-id")).toBe("user-a");
    expect(JSON.parse(String(captured[0]?.init.body))).toMatchObject({
      thread_id: "thread-a",
      user_message_id: "message-user",
      question: "Explain ATP",
      subject_id: "biology",
      stream: false,
    });
  });

  it("preserves bounded backend status, code, retryability, and correlation id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "model_unavailable",
              message: "Model unavailable\nprivate line removed",
              retryable: true,
              request_id: "req_fixture",
            },
          }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const failure = await requestContextAnswer({
      accessToken: "header.payload.signature",
      studentId: "user-a",
      threadId: "thread-a",
      question: "Explain ATP",
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ContextBackendError);
    expect(failure).toMatchObject({
      status: 503,
      code: "model_unavailable",
      requestId: "req_fixture",
      retryable: true,
      message: "Model unavailable private line removed",
    });
  });

  it("maps caller cancellation separately from timeout and offline failure", async () => {
    vi.stubGlobal("fetch", (_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      });
    });
    const controller = new AbortController();
    const pending = requestContextAnswer({
      accessToken: "header.payload.signature",
      studentId: "user-a",
      threadId: "thread-a",
      question: "Explain ATP",
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ status: 499, code: "request_cancelled" });
  });

  it("maps the configured deadline to a retryable timeout without a fake answer", async () => {
    vi.useFakeTimers();
    vi.stubEnv("ALIM_CONTEXT_BACKEND_TIMEOUT_MS", "100");
    vi.stubGlobal("fetch", (_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      });
    });
    const pending = requestContextAnswer({
      accessToken: "header.payload.signature",
      studentId: "user-a",
      threadId: "thread-a",
      question: "Explain ATP",
    });
    await vi.advanceTimersByTimeAsync(100);
    await expect(pending).rejects.toMatchObject({
      status: 504,
      code: "context_backend_timeout",
      retryable: true,
    });
  });
});
