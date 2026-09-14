/**
 * Best-effort activity + error telemetry.
 *
 * Every event is forwarded to the Supabase Edge Function `activity-log`, which
 * writes a row into `public.usage_events` and a text mirror into the private
 * `activity-logs` Storage bucket.
 *
 * Rules enforced here:
 * - Never send passwords, access/refresh/provider tokens, raw form values,
 *   chat prompts or responses, document contents, or calendar event content.
 * - Payloads are shallow, string/number/boolean only, and bounded in size.
 * - A failure never surfaces to the user and never breaks the primary action.
 */
import { supabase } from "@/integrations/supabase/client";

/** Property values we are willing to send. */
type Primitive = string | number | boolean | null;

export interface ActivityEvent {
  event_name: string;
  feature?: string;
  subject?: string;
  properties?: Record<string, Primitive | undefined>;
}

const MAX_STRING = 200;
const MAX_PROPERTIES = 12;

/** Keys that must never leave the browser, whatever the caller passes. */
const FORBIDDEN_KEY =
  /(password|token|secret|key|authorization|cookie|message|content|prompt|body|title|description|location|summary|email)/i;

function sanitiseValue(value: unknown): Primitive | undefined {
  if (value === null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") return value.slice(0, MAX_STRING);
  return undefined;
}

function sanitiseProperties(
  properties: Record<string, Primitive | undefined> | undefined,
): Record<string, Primitive> | undefined {
  if (!properties) return undefined;
  const out: Record<string, Primitive> = {};
  let count = 0;
  for (const [key, raw] of Object.entries(properties)) {
    if (count >= MAX_PROPERTIES) break;
    if (FORBIDDEN_KEY.test(key)) continue;
    const value = sanitiseValue(raw);
    if (value === undefined) continue;
    out[key] = value;
    count += 1;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Send one activity event. Fire-and-forget: the returned promise always
 * resolves and errors are swallowed after a single console warning.
 */
export async function logActivity(event: ActivityEvent): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const payload: Record<string, unknown> = {
      event_name: event.event_name.slice(0, 80),
    };
    if (event.feature) payload["feature"] = event.feature.slice(0, 80);
    if (event.subject) payload["subject"] = event.subject.slice(0, 120);
    const properties = sanitiseProperties({
      route: window.location.pathname,
      ...event.properties,
    });
    if (properties) payload["properties"] = properties;

    await supabase.functions.invoke("activity-log", { body: payload });
  } catch {
    // Telemetry is best-effort only.
  }
}

/** Convenience wrapper for call sites that must not await. */
export function track(event: ActivityEvent): void {
  void logActivity(event);
}

/**
 * Classify a thrown value without forwarding its message.
 *
 * Error messages routinely contain user content (an email address, a form
 * value, a calendar title, a database row), so they are never sent. Only the
 * constructor name and an explicit numeric/short status or code are kept.
 */
export function classifyError(error: unknown): Record<string, Primitive> {
  const out: Record<string, Primitive> = { error_name: "UnknownError" };
  if (error instanceof Error) {
    out["error_name"] = error.name.slice(0, 80);
  } else if (typeof error === "string") {
    out["error_name"] = "StringError";
  }

  if (error && typeof error === "object") {
    const candidate = error as { status?: unknown; statusCode?: unknown; code?: unknown };
    const status = candidate.status ?? candidate.statusCode;
    if (typeof status === "number" && Number.isFinite(status)) out["error_status"] = status;
    // Supabase/Postgres codes are short, opaque identifiers such as "23505".
    if (typeof candidate.code === "string" && candidate.code.length <= 12) {
      out["error_code"] = candidate.code;
    } else if (typeof candidate.code === "number") {
      out["error_code"] = candidate.code;
    }
  }
  return out;
}

/**
 * Log a failed operation as a bounded, non-sensitive classification.
 * The raw error is deliberately not forwarded; show it in the UI instead.
 */
export function trackFailure(
  event_name: string,
  error: unknown,
  extra?: { feature?: string; subject?: string; properties?: Record<string, Primitive> },
): void {
  track({
    event_name,
    ...(extra?.feature ? { feature: extra.feature } : {}),
    ...(extra?.subject ? { subject: extra.subject } : {}),
    properties: {
      ...extra?.properties,
      ...classifyError(error),
    },
  });
}

let globalHandlersInstalled = false;

/** Install global `error` / `unhandledrejection` telemetry once. */
export function installGlobalErrorTelemetry(): () => void {
  if (typeof window === "undefined" || globalHandlersInstalled) return () => {};
  globalHandlersInstalled = true;

  const onError = (event: ErrorEvent) => {
    trackFailure("browser_error", event.error ?? event.message, {
      feature: "runtime",
      properties: { source: "window.error" },
    });
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    trackFailure("browser_unhandled_rejection", event.reason, {
      feature: "runtime",
      properties: { source: "unhandledrejection" },
    });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    globalHandlersInstalled = false;
  };
}
