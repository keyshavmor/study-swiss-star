/** Small, mockable Supabase Auth boundary shared by the existing auth UI. */

export type SocialProvider = "google" | "apple" | "azure";
export type EmailMode = "signin" | "signup";

interface AuthResult {
  error: { message: string } | null;
}

export interface SupabaseAuthBoundary {
  signInWithOAuth(input: {
    provider: SocialProvider;
    options: { redirectTo: string; scopes?: string };
  }): Promise<AuthResult>;
  signInWithPassword(input: { email: string; password: string }): Promise<AuthResult>;
  signUp(input: {
    email: string;
    password: string;
    options: { emailRedirectTo: string };
  }): Promise<AuthResult>;
}

export function signInWithSocialProvider(
  auth: SupabaseAuthBoundary,
  provider: SocialProvider,
  redirectTo: string,
): Promise<AuthResult> {
  return auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      ...(provider === "azure" ? { scopes: "email" } : {}),
    },
  });
}

export function signInWithEmail(
  auth: SupabaseAuthBoundary,
  mode: EmailMode,
  email: string,
  password: string,
  redirectTo: string,
): Promise<AuthResult> {
  return mode === "signup"
    ? auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })
    : auth.signInWithPassword({ email, password });
}
