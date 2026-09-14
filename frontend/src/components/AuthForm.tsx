/** Top-level tutoring/authentication component used by TanStack routes. */
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "signup") {
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
        navigate({ to: "/chat" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple" | "azure", label: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
        ...(provider === "azure" ? { scopes: "email" } : {}),
      },
    });
    if (error) {
      toast.error(error.message || `${label} sign-in failed`);
      setIsLoading(false);
    }
  };

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
        <div className="space-y-2">
          <Label htmlFor="password" className="text-[13px] font-semibold text-muted-foreground">
            Password
          </Label>
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
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-[12px] font-semibold uppercase tracking-wide">
          <span className="bg-card px-3 text-muted-foreground">Or</span>
        </div>
      </div>

      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleOAuth("google", "Google")}
          disabled={isLoading}
        >
          Continue with Google
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleOAuth("apple", "Apple")}
          disabled={isLoading}
        >
          Continue with Apple
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleOAuth("azure", "Microsoft")}
          disabled={isLoading}
        >
          Continue with Microsoft
        </Button>
      </div>

      <p className="text-center text-[14px] text-muted-foreground">
        {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
        <button
          type="button"
          className="font-semibold text-primary hover:text-primary-hover"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Sign up" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
