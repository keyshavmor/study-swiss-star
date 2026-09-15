import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.111.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_HEADERS = { ...CORS, "Content-Type": "application/json; charset=utf-8" };
const SAFE_NAME = /^[a-z0-9_.-]{1,64}$/;
const ANONYMOUS_EVENTS = new Set(["auth_signin_failed", "oauth_signin_failed"]);
const FORBIDDEN_PROPERTY =
  /(password|token|secret|key|authorization|cookie|message|content|prompt|body|title|description|location|summary|email)/i;

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function cleanText(value: unknown, max = 240): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/[\r\n\t]+/g, " ").trim();
  return text ? text.slice(0, max) : null;
}

function cleanProperties(value: unknown): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>).slice(0, 20)) {
    if (!/^[a-zA-Z0-9_.-]{1,48}$/.test(key)) continue;
    if (FORBIDDEN_PROPERTY.test(key)) continue;
    if (typeof raw === "string") out[key] = raw.replace(/[\r\n\t]+/g, " ").slice(0, 400);
    else if (typeof raw === "number" && Number.isFinite(raw)) out[key] = raw;
    else if (typeof raw === "boolean" || raw === null) out[key] = raw;
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return respond(405, { error: "Method not allowed." });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return respond(400, { error: "Invalid request." });
  }
  const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const eventName = cleanText(body.event_name, 64)?.toLowerCase() ?? "";
  const feature = cleanText(body.feature, 64)?.toLowerCase() ?? null;
  const subject = cleanText(body.subject, 80);
  const properties = cleanProperties(body.properties);
  if (!SAFE_NAME.test(eventName) || (feature && !SAFE_NAME.test(feature))) {
    return respond(400, { error: "Invalid event." });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) return respond(500, { error: "Logging is unavailable." });
  const admin = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  let userId: string | null = null;
  const authorization = req.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (token && !token.startsWith("sb_")) {
    const { data } = await admin.auth.getUser(token);
    userId = data.user?.id ?? null;
  }
  if (!userId && !ANONYMOUS_EVENTS.has(eventName)) {
    return respond(401, { error: "Authentication required." });
  }

  const id = crypto.randomUUID();
  const occurredAt = new Date().toISOString();
  const { error: insertError } = await admin.from("usage_events").insert({
    id,
    user_id: userId,
    event_name: eventName,
    feature,
    subject,
    properties,
    occurred_at: occurredAt,
  });
  if (insertError) return respond(500, { error: "Could not record activity." });

  const day = occurredAt.slice(0, 10);
  const prefix = userId ?? "anonymous";
  const objectPath = `${prefix}/${day}/${id}.log`;
  const text = JSON.stringify(
    { id, user_id: userId, event_name: eventName, feature, subject, properties, occurred_at: occurredAt },
    null,
    2,
  );
  const { error: storageError } = await admin.storage
    .from("activity-logs")
    .upload(objectPath, new Blob([text], { type: "text/plain" }), { upsert: false });

  return respond(storageError ? 207 : 200, {
    ok: !storageError,
    database_recorded: true,
    storage_recorded: !storageError,
  });
});
