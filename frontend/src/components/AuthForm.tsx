/**
 * The single authentication surface for the app, rendered at `/` (and by the
 * `/auth` alias). Supports email/password, username/password (via the
 * `username-login` Edge Function), password reset, and GitHub / LinkedIn /
 * Spotify OAuth. Successful sign-in always lands on `/home`.
 */
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitHubLogo, LinkedInLogo, SpotifyLogo } from "@/components/app/BrandLogos";
import { track, trackFailure } from "@/lib/telemetry";
import { toast } from "sonner";

type Mode = "signin" | "signup" | "reset";
type OAuthProvider = "github" | "linkedin_oidc" | "spotify";

/** Only these OAuth providers are offered. */
const OAUTH_PROVIDERS: {
  provider: OAuthProvider;
  label: string;
  Logo: (props: { className?: string }) => React.JSX.Element;
}[] = [
  { provider: "github", label: "GitHub", Logo: GitHubLogo },
  { provider: "linkedin_oidc", label: "LinkedIn", Logo: LinkedInLogo },
  { provider: "spotify", label: "Spotify", Logo: SpotifyLogo },
];

export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;

/** Normalise a username the same way the database does. */
export function normaliseUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Returns an error message, or null when the username is acceptable. */
export function validateUsername(raw: string): string | null {
  const value = normaliseUsername(raw);
  if (value.length < 3 || value.length > 30) {
    return "Your username needs between 3 and 30 characters.";
  }
  if (!USERNAME_PATTERN.test(value)) {
    return "Use only letters, numbers, dots, underscores and hyphens.";
  }
  return null;
}

interface UsernameLoginResult {
  access_token?: string;
  refresh_token?: string;
}

interface UsernameAvailabilityResult {
  available?: boolean;
  valid?: boolean;
}


export function AuthForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [identifier, setIdentifier] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const goHome = () => navigate({ to: "/home", replace: true });

  const handleSignIn = async () => {
    const value = identifier.trim();
    if (value.includes("@")) {
      const { error } = await supabase.auth.signInWithPassword({ email: value, password });
      if (error) throw error;
      track({
        event_name: "auth_signin_succeeded",
        feature: "auth",
        properties: { method: "email" },
      });
      await goHome();
      return;
    }

    const normalised = normaliseUsername(value);
    const invalid = validateUsername(normalised);
    if (invalid) throw new Error(invalid);

    const { data, error } = await supabase.functions.invoke<UsernameLoginResult>("username-login", {
      body: { username: normalised, password },
    });
    if (error || !data?.access_token || !data?.refresh_token) {
      throw new Error("That username and password combination did not work.");
    }
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (sessionError) throw sessionError;
    track({
      event_name: "auth_signin_succeeded",
      feature: "auth",
      properties: { method: "username" },
    });
    await goHome();
  };

  const handleSignUp = async () => {
    const normalised = normaliseUsername(username);
    const invalid = validateUsername(normalised);
    if (invalid) throw new Error(invalid);

    // Ask the availability function first, so the student sees a clear message
    // instead of a database constraint error. When the check itself cannot run
    // we continue and let the unique index stay the final authority.
    const availability = await supabase.functions.invoke<UsernameAvailabilityResult>(
      "username-availability",
      { body: { username: normalised } },
    );
    if (!availability.error && availability.data) {
      if (availability.data.valid === false) {
        throw new Error("Use only letters, numbers, dots, underscores and hyphens.");
      }
      if (availability.data.available === false) {
        throw new Error("That username is already taken. Please pick another one.");
      }
    }



    const { error } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/home`,
        data: { username: normalised },
      },
    });
    if (error) {
      if (/username/i.test(error.message) && /(exists|duplicate|unique)/i.test(error.message)) {
        throw new Error("That username is already taken. Please pick another one.");
      }
      throw error;
    }
    track({ event_name: "auth_signup_succeeded", feature: "auth" });
    toast.success("Check your email to confirm your account.");
    setMode("signin");
    setIdentifier(normalised);
    setPassword("");
  };

  const handleReset = async () => {
    const email = resetEmail.trim();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    if (error) throw error;
    track({ event_name: "auth_password_reset_requested", feature: "auth" });
    toast.success("Password reset link sent. Check your email.");
    setMode("signin");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (mode === "reset") await handleReset();
      else if (mode === "signup") await handleSignUp();
      else await handleSignIn();
    } catch (err) {
      trackFailure(
        mode === "signup"
          ? "auth_signup_failed"
          : mode === "reset"
            ? "auth_password_reset_failed"
            : "auth_signin_failed",
        err,
        {
          feature: "auth",
          properties: { method: identifier.includes("@") ? "email" : "username" },
        },
      );
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: OAuthProvider, label: string) => {
    setIsLoading(true);
    track({ event_name: "oauth_signin_started", feature: "auth", properties: { provider } });
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/home` },
    });
    if (error) {
      trackFailure("oauth_signin_failed", error, {
        feature: "auth",
        properties: { provider },
      });
      toast.error(error.message || `${label} sign-in failed`);
      setIsLoading(false);
    }
  };

  const submitLabel =
    mode === "reset" ? "Send reset link" : mode === "signin" ? "Sign in" : "Create account";

  return (
    <div className="app-card space-y-6 p-7">
      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === "signin" && (
          <div className="space-y-2">
            <Label htmlFor="identifier" className="text-[13px] font-semibold text-muted-foreground">
              Email or username
            </Label>
            <Input
              id="identifier"
              type="text"
              autoComplete="username"
              placeholder="you@example.com or your username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoFocus
            />
          </div>
        )}

        {mode === "signup" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[13px] font-semibold text-muted-foreground">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="alim.study"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
              <p className="text-[12.5px] text-muted-foreground">
                3–30 characters: lowercase letters, numbers, dots, underscores or hyphens.
              </p>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="signupEmail"
                className="text-[13px] font-semibold text-muted-foreground"
              >
                Email
              </Label>
              <Input
                id="signupEmail"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                required
              />
            </div>
          </>
        )}

        {mode === "reset" && (
          <div className="space-y-2">
            <Label htmlFor="resetEmail" className="text-[13px] font-semibold text-muted-foreground">
              Email
            </Label>
            <Input
              id="resetEmail"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
              autoFocus
            />
            <p className="text-[14px] text-muted-foreground">
              Password resets always go by email. Enter the email address on your account and we
              will send a secure link.
            </p>
          </div>
        )}

        {mode !== "reset" && (
          <div className="space-y-2">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <Label htmlFor="password" className="text-[13px] font-semibold text-muted-foreground">
                Password
              </Label>
              {mode === "signin" && (
                <button
                  type="button"
                  className="text-[13px] font-semibold text-primary hover:text-primary-hover"
                  onClick={() => {
                    if (identifier.includes("@")) setResetEmail(identifier.trim());
                    setMode("reset");
                  }}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Please wait…" : submitLabel}
        </Button>
      </form>

      {mode !== "reset" && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[12px] font-semibold uppercase tracking-wide">
              <span className="bg-card px-3 text-muted-foreground">Or</span>
            </div>
          </div>

          <div className="space-y-3">
            {OAUTH_PROVIDERS.map(({ provider, label, Logo }) => (
              <Button
                key={provider}
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => void handleOAuth(provider, label)}
                disabled={isLoading}
              >
                <Logo className="h-[18px] w-[18px]" />
                Continue with {label}
              </Button>
            ))}
          </div>
        </>
      )}

      <p className="text-center text-[14px] text-muted-foreground">
        {mode === "reset" ? (
          <button
            type="button"
            className="font-semibold text-primary hover:text-primary-hover"
            onClick={() => setMode("signin")}
          >
            Back to sign in
          </button>
        ) : (
          <>
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="font-semibold text-primary hover:text-primary-hover"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </>
        )}
      </p>
    </div>
  );
}
