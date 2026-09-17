/**
 * Sign-out acceptance tests.
 *
 * Guarantees:
 * - the future local backend is asked to release this user's runtime FIRST,
 *   while the bearer token is still valid, and a failure never blocks sign-out;
 * - Supabase sign-out uses the current-session ("local") scope;
 * - every session-scoped frontend gate/cache is cleared afterwards.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const signOut = vi.fn(async (_options?: { scope?: string }) => ({ error: null }));
const releaseMyRuntime = vi.fn(async () => ({}));
const abandonActiveAssessment = vi.fn();
const clearAiSession = vi.fn();
const clearLanguageSession = vi.fn();
const clearAdmissionSession = vi.fn();
const clearMessagingSessionState = vi.fn();
const clearGoogleAccess = vi.fn();
const invalidateStartupCache = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signOut: (options?: { scope?: string }) => signOut(options) } },
}));
vi.mock("@/lib/google-calendar", () => ({ clearGoogleAccess }));
vi.mock("@/lib/ai-session", () => ({ clearAiSession }));
vi.mock("@/lib/language-session", () => ({ clearLanguageSession }));
vi.mock("@/lib/admission-session", () => ({
  clearAdmissionSession,
  readAdmissionSession: () => ({ leaseId: "lease-1" }),
}));
vi.mock("@/lib/messaging-session", () => ({ clearMessagingSessionState }));
vi.mock("@/lib/startup-flow", () => ({ invalidateStartupCache }));
vi.mock("@/lib/telemetry", () => ({ logActivity: vi.fn(), trackFailure: vi.fn() }));
vi.mock("@/lib/assessment/api", () => ({ abandonActiveAssessment }));
vi.mock("@/lib/system.functions", () => ({ releaseMyRuntime }));

const { signOutCompletely } = await import("./sign-out");

describe("signOutCompletely", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signOut.mockResolvedValue({ error: null });
    releaseMyRuntime.mockResolvedValue({});
  });

  it("releases the local runtime and signs out with the local scope", async () => {
    await signOutCompletely();
    expect(releaseMyRuntime).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("clears every session-scoped gate and cache", async () => {
    await signOutCompletely();
    expect(clearLanguageSession).toHaveBeenCalled();
    expect(clearAiSession).toHaveBeenCalled();
    expect(clearAdmissionSession).toHaveBeenCalled();
    expect(clearMessagingSessionState).toHaveBeenCalled();
    expect(clearGoogleAccess).toHaveBeenCalled();
    expect(invalidateStartupCache).toHaveBeenCalled();
    expect(abandonActiveAssessment).toHaveBeenCalled();
  });

  it("never lets a failed backend release trap the user in the app", async () => {
    releaseMyRuntime.mockRejectedValue(new Error("backend unavailable"));
    await expect(signOutCompletely()).resolves.toBeUndefined();
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(clearAiSession).toHaveBeenCalled();
  });
});
