import { describe, expect, test } from "bun:test";
import { classifyError, sanitiseProperties } from "./telemetry";

describe("telemetry privacy", () => {
  test("drops secrets and private content while retaining bounded operational fields", () => {
    expect(
      sanitiseProperties({
        access_token: "secret",
        password: "secret",
        google_calendar_event_content: "private",
        document_content: "private",
        attachment_count: 2,
        source: "assistant",
      }),
    ).toEqual({ attachment_count: 2, source: "assistant" });
  });

  test("never forwards an error message", () => {
    const error = Object.assign(new Error("user@example.test secret"), {
      status: 503,
      code: "timeout",
    });
    expect(classifyError(error)).toEqual({
      error_name: "Error",
      error_status: 503,
      error_code: "timeout",
    });
  });
});
