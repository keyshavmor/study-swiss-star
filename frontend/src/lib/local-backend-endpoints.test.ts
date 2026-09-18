import { afterEach, describe, expect, it, vi } from "vitest";
import { localBackendBaseUrl, localBackendTimeoutMs } from "./local-backend-endpoints";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("local backend endpoint configuration", () => {
  it("defaults to the loopback FastAPI URL", () => {
    vi.stubEnv("ALIM_CONTEXT_BACKEND_URL", "");
    expect(localBackendBaseUrl()).toBe("http://127.0.0.1:8001");
  });

  it("rejects remote, credentialed, and path-bearing backend URLs", () => {
    for (const value of [
      "https://preview.lovable.app",
      "http://example.invalid:8001",
      "http://user:password@127.0.0.1:8001",
      "http://127.0.0.1:8001/api",
    ]) {
      vi.stubEnv("ALIM_CONTEXT_BACKEND_URL", value);
      expect(() => localBackendBaseUrl()).toThrow(/loopback HTTP/);
    }
  });

  it("validates timeout bounds instead of accepting NaN or an unbounded wait", () => {
    vi.stubEnv("ALIM_TEST_TIMEOUT_MS", "90000");
    expect(localBackendTimeoutMs("ALIM_TEST_TIMEOUT_MS", 10)).toBe(90_000);
    vi.stubEnv("ALIM_TEST_TIMEOUT_MS", "not-a-number");
    expect(() => localBackendTimeoutMs("ALIM_TEST_TIMEOUT_MS", 10)).toThrow(/between 100/);
  });
});
