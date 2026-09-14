/** Top-level authentication component used by the public /auth route. */
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Mode = "signin" | "signup" | "reset";

/** Only these OAuth providers are offered. */
const OAUTH_PROVIDERS = [
  { provider: "github" as const, label: "GitHub" },
  { provider: "linkedin_oidc" as const, label: "LinkedIn" },
  { provider: "spotify" as const, label: "Spotify" },
];

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/update-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent. Check your email.");
        setMode("signin");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate({ to: "/home" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: "github" | "linkedin_oidc" | "spotify", label: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      toast.error(error.message || `${label} sign-in failed`);
      setIsLoading(false);
    }
  };

  const submitLabel =
    mode === "reset" ? "Send reset link" : mode === "signin" ? "Sign in" : "Create account";

  return (
    <div className="app-card space-y-6 p-7">
      <form onSubmit={handleEmailSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[13px] font-semibold text-muted-foreground">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
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
                  onClick={() => setMode("reset")}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
        )}
        {mode === "reset" && (
          <p className="text-[14px] text-muted-foreground">
            We will email you a secure link to choose a new password.
          </p>
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
            {OAUTH_PROVIDERS.map((item) => (
              <Button
                key={item.provider}
                variant="outline"
                className="w-full"
                onClick={() => handleOAuth(item.provider, item.label)}
                disabled={isLoading}
              >
                Continue with {item.label}
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
