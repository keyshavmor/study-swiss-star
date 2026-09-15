/* Throwaway production auth smoke test. Not part of the app build. */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const url = "https://ucacmeadsufiedxrgqit.supabase.co";
const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
const rand = randomBytes(6).toString("hex");
const email = `smoke.${rand}@example.com`;
const username = `smoke${rand}`;
const password = `Pw-${randomBytes(12).toString("base64url")}`;

const supabase = createClient(url, key, { auth: { persistSession: false } });
const report: Record<string, unknown> = {};

const availability = await supabase.functions.invoke("username-availability", {
  body: { username },
});
report["availability"] = {
  transportError: Boolean(availability.error),
  data: availability.data,
};

const signUp = await supabase.auth.signUp({
  email,
  password,
  options: { data: { username } },
});
report["signup"] = {
  status: signUp.error?.status ?? 200,
  code: signUp.error?.code ?? null,
  userCreated: Boolean(signUp.data.user),
  sessionCreated: Boolean(signUp.data.session),
};

const emailLogin = await supabase.auth.signInWithPassword({ email, password });
report["emailLogin"] = {
  status: emailLogin.error?.status ?? 200,
  code: emailLogin.error?.code ?? null,
  sessionCreated: Boolean(emailLogin.data.session),
};

const usernameLogin = await supabase.functions.invoke("username-login", {
  body: { username, password },
});
const ul = usernameLogin.data as Record<string, unknown> | null;
report["usernameLogin"] = {
  transportError: Boolean(usernameLogin.error),
  ok: ul?.["ok"] ?? null,
  errorCode: ul?.["error_code"] ?? null,
  hasAccessToken: Boolean(ul?.["access_token"]),
  hasRefreshToken: Boolean(ul?.["refresh_token"]),
};

if (ul?.["ok"] === true) {
  const set = await supabase.auth.setSession({
    access_token: String(ul["access_token"]),
    refresh_token: String(ul["refresh_token"]),
  });
  const got = await supabase.auth.getSession();
  const out = await supabase.auth.signOut();
  const after = await supabase.auth.getSession();
  report["session"] = {
    setSessionOk: !set.error,
    getSessionHasUser: Boolean(got.data.session?.user),
    signOutOk: !out.error,
    clearedAfterSignOut: !after.data.session,
  };
}

console.log(JSON.stringify(report, null, 2));
