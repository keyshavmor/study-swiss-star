import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_AI_RUNTIME_POLICY } from "./model-readiness.types";
import { prepareModelOnBackend, pollModelOperationOnBackend } from "./model-backend.server";

afterEach(() => {
  vi.unstubAllGlobals();
});

const captured: Array<{ url: string; headers: Record<string, string> }> = [];

function stubFetch(response: Response | null) {
  captured.length = 0;
  vi.stubGlobal("fetch", (url: string, init: RequestInit) => {
    captured.push({
      url: String(url),
      headers: Object.fromEntries(new Headers(init.headers).entries()),
    });
    return response ? Promise.resolve(response) : Promise.reject(new Error("offline"));
  });
}

describe("local model backend adapter auth contract", () => {
  it("forwards the caller bearer token as authorization and the student id as context", async () => {
    stubFetch(
      new Response(JSON.stringify({ state: "ready", can_continue_with_ai: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const status = await prepareModelOnBackend({
      accessToken: "header.payload.signature",
      studentId: "user-uuid",
      modelId: "Qwen/Qwen3.8-27B",
      policy: DEFAULT_AI_RUNTIME_POLICY,
    });
    expect(status.state).toBe("ready");
    expect(captured[0]?.headers["authorization"]).toBe("Bearer header.payload.signature");
    expect(captured[0]?.headers["x-student-id"]).toBe("user-uuid");
  });

  it("maps an unreachable backend to backend_unavailable without inventing readiness", async () => {
    stubFetch(null);
    const status = await pollModelOperationOnBackend({
      accessToken: "header.payload.signature",
      studentId: "user-uuid",
      modelId: "Qwen/Qwen3.8-27B",
      operationId: "op-1",
      policy: DEFAULT_AI_RUNTIME_POLICY,
    });
    expect(status.state).toBe("backend_unavailable");
    expect(status.can_continue_with_ai).toBe(false);
    expect(status.can_continue_without_ai).toBe(true);
    expect(captured[0]?.headers["authorization"]).toBe("Bearer header.payload.signature");
  });
});
