import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.111.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_HEADERS = { ...CORS, "Content-Type": "application/json; charset=utf-8" };
const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function invalidCredentials() {
  return response(401, { error: "Invalid username or password." });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return response(405, { error: "Method not allowed." });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return response(400, { error: "Invalid request." });
  }

  const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!USERNAME_RE.test(username) || password.length < 6 || password.length > 1024) {
    return invalidCredentials();
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceRole || !anonKey) return response(500, { error: "Authentication is unavailable." });

  const admin = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("user_id")
    .eq("username", username)
    .maybeSingle();
  if (profileError || !profile?.user_id) return invalidCredentials();

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(profile.user_id);
  const email = userData.user?.email;
  if (userError || !email) return invalidCredentials();

  const publicClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await publicClient.auth.signInWithPassword({ email, password });
  if (error || !data.session) return invalidCredentials();

  return response(200, {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type,
  });
});
