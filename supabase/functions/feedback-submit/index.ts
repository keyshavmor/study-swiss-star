import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.111.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_HEADERS = { ...CORS, "Content-Type": "application/json; charset=utf-8" };
const FORBIDDEN_CONTEXT_KEY =
  /(password|token|secret|key|authorization|cookie|content|prompt|body|email)/i;

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanContext(value: unknown): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>).slice(0, 20)) {
    if (!/^[a-zA-Z0-9_.-]{1,48}$/.test(key)) continue;
    if (FORBIDDEN_CONTEXT_KEY.test(key)) continue;
    if (typeof raw === "string") out[key] = raw.replace(/[\r\n\t]+/g, " ").slice(0, 400);
    else if (typeof raw === "number" && Number.isFinite(raw)) out[key] = raw;
    else if (typeof raw === "boolean" || raw === null) out[key] = raw;
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return respond(405, { error: "Method not allowed." });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) return respond(500, { error: "Feedback service unavailable." });
  const admin = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const authorization = req.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return respond(401, { error: "Authentication required." });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const userId = userData.user?.id;
  if (userError || !userId) return respond(401, { error: "Authentication required." });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return respond(400, { error: "Invalid request." });
  }
  const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const message = cleanText(body.message, 8000);
  const category = cleanText(body.category, 64).toLowerCase() || "general";
  const context = cleanContext(body.context);
  if (message.length < 2) return respond(400, { error: "Please enter feedback." });

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const { error: insertError } = await admin.from("feedback").insert({
    id,
    user_id: userId,
    category,
    message,
    context,
    created_at: createdAt,
  });
  if (insertError) return respond(500, { error: "Could not save feedback." });

  const objectPath = `${userId}/${createdAt.slice(0, 10)}/${id}.txt`;
  const text = [
    `id: ${id}`,
    `user_id: ${userId}`,
    `category: ${category}`,
    `created_at: ${createdAt}`,
    `context: ${JSON.stringify(context)}`,
    "",
    message,
  ].join("\n");
  const { error: storageError } = await admin.storage
    .from("feedback-messages")
    .upload(objectPath, new Blob([text], { type: "text/plain; charset=utf-8" }), { upsert: false });

  return respond(storageError ? 207 : 200, {
    ok: !storageError,
    database_recorded: true,
    storage_recorded: !storageError,
  });
});
