import assert from "node:assert/strict";
import test from "node:test";
import {
  signInWithEmail,
  signInWithSocialProvider,
  type SupabaseAuthBoundary,
} from "./auth.supabase.ts";

function authDouble(calls: Array<{ method: string; input: unknown }>): SupabaseAuthBoundary {
  return {
    async signInWithOAuth(input) {
      calls.push({ method: "oauth", input });
      return { error: null };
    },
    async signInWithPassword(input) {
      calls.push({ method: "password", input });
      return { error: null };
    },
    async signUp(input) {
      calls.push({ method: "signup", input });
      return { error: null };
    },
  };
}

test("social providers call Supabase directly with the expected options", async () => {
  const calls: Array<{ method: string; input: unknown }> = [];
  const auth = authDouble(calls);
  const redirectTo = "http://localhost:8080";

  await signInWithSocialProvider(auth, "google", redirectTo);
  await signInWithSocialProvider(auth, "apple", redirectTo);
  await signInWithSocialProvider(auth, "azure", redirectTo);

  assert.deepEqual(calls, [
    { method: "oauth", input: { provider: "google", options: { redirectTo } } },
    { method: "oauth", input: { provider: "apple", options: { redirectTo } } },
    {
      method: "oauth",
      input: { provider: "azure", options: { redirectTo, scopes: "email" } },
    },
  ]);
});

test("email sign-in and sign-up retain their Supabase contracts", async () => {
  const calls: Array<{ method: string; input: unknown }> = [];
  const auth = authDouble(calls);

  await signInWithEmail(auth, "signin", "student@example.test", "secret12", "https://app.test");
  await signInWithEmail(auth, "signup", "student@example.test", "secret12", "https://app.test");

  assert.deepEqual(calls, [
    {
      method: "password",
      input: { email: "student@example.test", password: "secret12" },
    },
    {
      method: "signup",
      input: {
        email: "student@example.test",
        password: "secret12",
        options: { emailRedirectTo: "https://app.test" },
      },
    },
  ]);
});
