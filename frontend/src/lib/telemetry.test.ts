/**
 * Signed-out telemetry must call the production `activity-log` function ONLY
 * for the whitelisted anonymous pre-session auth events, and never carry an
 * identifier, credential or raw form value.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const invoked: { name: string; body: Record<string, unknown> }[] = [];
let session: unknown = null;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session } }) },
    functions: {
      invoke: (name: string, options: { body: Record<string, unknown> }) => {
        invoked.push({ name, body: options.body });
        return Promise.resolve({ data: null, error: null });
      },
    },
  },
}));

const { ANONYMOUS_EVENTS, logActivity } = await import("./telemetry");

beforeEach(() => {
  invoked.length = 0;
  session = null;
});

describe("signed-out telemetry", () => {
  it("sends exactly the whitelisted anonymous auth events", async () => {
    expect([...ANONYMOUS_EVENTS].sort()).toEqual(
      [
        "auth_password_reset_failed",
        "auth_password_reset_requested",
        "auth_signin_failed",
        "auth_signup_failed",
        "auth_signup_succeeded",
        "oauth_signin_failed",
      ].sort(),
    );

    for (const event_name of ANONYMOUS_EVENTS) {
      await logActivity({ event_name, feature: "auth" });
    }
    expect(invoked).toHaveLength(ANONYMOUS_EVENTS.size);
    expect(invoked.every((call) => call.name === "activity-log")).toBe(true);
  });

  it("skips every other event while signed out", async () => {
    await logActivity({ event_name: "planner_event_created", feature: "planner" });
    await logActivity({ event_name: "browser_error", feature: "runtime" });
    expect(invoked).toHaveLength(0);
  });

  it("sends non-whitelisted events once a session exists", async () => {
    session = { access_token: "t" };
    await logActivity({ event_name: "planner_event_created", feature: "planner" });
    expect(invoked).toHaveLength(1);
  });

  it("strips identifiers, credentials and raw form values", async () => {
    await logActivity({
      event_name: "auth_signin_failed",
      feature: "auth",
      properties: {
        email: "keyshavmor2611@gmail.com",
        username: "alim.study",
        identifier: "alim.study",
        password: "hunter2",
        access_token: "abc",
        message: "Invalid login credentials",
        method: "username",
      },
    });
    const properties = invoked[0]!.body["properties"] as Record<string, unknown>;
    expect(properties["method"]).toBe("username");
    for (const forbidden of ["email", "password", "access_token", "message", "identifier"]) {
      expect(properties).not.toHaveProperty(forbidden);
    }
    expect(JSON.stringify(invoked[0]!.body)).not.toContain("hunter2");
    expect(JSON.stringify(invoked[0]!.body)).not.toContain("@");
  });
});
