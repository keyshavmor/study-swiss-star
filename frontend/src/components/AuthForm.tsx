/**
 * The single authentication surface for the app, rendered at `/` (and by the
 * `/auth` alias). Supports email/password, username/password (via the
 * `username-login` Edge Function), password reset, and GitHub / LinkedIn /
 * Spotify OAuth. Successful sign-in enters the authenticated startup flow
 * (language onboarding, then the per-session model readiness gate).
 */
import { useCallback, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitHubLogo, LinkedInLogo, SpotifyLogo } from "@/components/app/BrandLogos";
import { track, trackFailure } from "@/lib/telemetry";
import { toast } from "sonner";
import { UiError, localizedMessage } from "@/lib/ui-error";
import { localizedAuthError } from "@/lib/auth-errors";
import { classifyUsernameLogin, type UsernameLoginPayload } from "@/lib/username-login";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/messages";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { validateComplianceInput, type ComplianceValidationError } from "@/lib/compliance";
import { AuthCaptcha } from "@/components/auth/AuthCaptcha";
import { captchaAuthOptions, getAuthCaptchaConfig } from "@/lib/auth-captcha";

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
export function validateUsername(raw: string, t: (key: TranslationKey) => string): string | null {
  const value = normaliseUsername(raw);
  if (value.length < 3 || value.length > 30) {
    return t("auth.usernameLengthError");
  }
  if (!USERNAME_PATTERN.test(value)) {
    return t("auth.usernameCharsError");
  }
  return null;
}

/**
 * CURRENT SUPABASE (`username-login` v2, verified 2026-09-15): expected bad
 * credentials come back as an HTTP 200 payload with `ok:false` and a stable
 * `error_code`, never as an HTTP 401 Edge Function runtime error.
 */
type UsernameLoginResult = UsernameLoginPayload;

interface UsernameAvailabilityResult {
  available?: boolean;
  valid?: boolean;
}

export function AuthForm() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("signin");
  const [identifier, setIdentifier] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [signupAccountType, setSignupAccountType] = useState<"student" | "teacher" | "">("");
  const [signupDob, setSignupDob] = useState("");
  const [signupGuardianEmail, setSignupGuardianEmail] = useState("");
  const [signupAcceptedTerms, setSignupAcceptedTerms] = useState(false);
  const [signupAcceptedPrivacy, setSignupAcceptedPrivacy] = useState(false);
  const [signupAcceptedAcceptableUse, setSignupAcceptedAcceptableUse] = useState(false);
  const [signupAcceptedChildSafety, setSignupAcceptedChildSafety] = useState(false);
  const [complianceErrors, setComplianceErrors] = useState<ComplianceValidationError[]>([]);
  const [resetEmail, setResetEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetNonce, setCaptchaResetNonce] = useState(0);
  const navigate = useNavigate();
  const handleCaptchaToken = useCallback((token: string | null) => setCaptchaToken(token), []);

  const verifiedCaptchaToken = () => {
    if (!getAuthCaptchaConfig()) throw new UiError(t("auth.captchaUnavailable"));
    try {
      return captchaAuthOptions(captchaToken);
    } catch {
      throw new UiError(t("auth.captchaRequired"));
    }
  };

  // Enter the startup flow rather than jumping straight to Home.
  const goHome = async () => {
    const { resolveStartupDestination, invalidateStartupCache } =
      await import("@/lib/startup-flow");
    invalidateStartupCache();
    await navigate({ to: await resolveStartupDestination(), replace: true });
  };

  const handleSignIn = async () => {
    const value = identifier.trim();
    if (value.includes("@")) {
      const { error } = await supabase.auth.signInWithPassword({
        email: value,
        password,
        options: verifiedCaptchaToken(),
      });
      if (error) throw new UiError(localizedAuthError(t, error));
      track({
        event_name: "auth_signin_succeeded",
        feature: "auth",
        properties: { method: "email" },
      });
      await goHome();
      return;
    }

    const normalised = normaliseUsername(value);
    const invalid = validateUsername(normalised, t);
    if (invalid) throw new UiError(invalid);

    const { data, error } = await supabase.functions.invoke<UsernameLoginResult>("username-login", {
      body: { username: normalised, password },
    });
    // A transport/runtime failure or an unavailable auth service is NOT a wrong
    // password: show a generic service error instead of blaming the credentials.
    const outcome = classifyUsernameLogin(data, error);
    if (outcome.kind === "unavailable") throw new UiError(t("auth.errorGeneric"));
    if (outcome.kind === "invalid_credentials") {
      // Deliberately generic: never reveal whether the username exists, and
      // never surface the account email behind it.
      throw new UiError(t("auth.usernamePasswordError"));
    }
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: outcome.accessToken,
      refresh_token: outcome.refreshToken,
    });
    if (sessionError) throw new UiError(localizedAuthError(t, sessionError));
    track({
      event_name: "auth_signin_succeeded",
      feature: "auth",
      properties: { method: "username" },
    });
    await goHome();
  };

  const handleSignUp = async () => {
    const normalised = normaliseUsername(username);
    const invalid = validateUsername(normalised, t);
    if (invalid) throw new UiError(invalid);

    const complianceErrs = validateComplianceInput({
      accountType: signupAccountType,
      dateOfBirth: signupDob,
      guardianEmail: signupGuardianEmail,
      accountEmail: signupEmail,
      acceptedTerms: signupAcceptedTerms,
      acceptedPrivacy: signupAcceptedPrivacy,
      acceptedAcceptableUse: signupAcceptedAcceptableUse,
      acceptedChildSafety: signupAcceptedChildSafety,
    });
    setComplianceErrors(complianceErrs);
    if (complianceErrs.length > 0 || signupAccountType === "") {
      throw new UiError(t(`compliance.error.${complianceErrs[0]}` as TranslationKey));
    }

    // Ask the availability function first, so the student sees a clear message
    // instead of a database constraint error. When the check itself cannot run
    // we continue and let the unique index stay the final authority.
    const availability = await supabase.functions.invoke<UsernameAvailabilityResult>(
      "username-availability",
      { body: { username: normalised } },
    );
    if (!availability.error && availability.data) {
      if (availability.data.valid === false) {
        throw new UiError(t("auth.usernameCharsError"));
      }
      if (availability.data.available === false) {
        throw new UiError(t("auth.usernameTaken"));
      }
    }

    // DOB/guardian email are only a prefill hint here — the compliance RPC on
    // /onboarding/compliance is the sole authority that persists them.
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        ...verifiedCaptchaToken(),
        data: {
          username: normalised,
          account_type_prefill: signupAccountType,
          date_of_birth_prefill: signupDob,
          guardian_email_prefill: signupAccountType === "student" ? signupGuardianEmail : null,
        },
      },
    });
    if (error) {
      // The raw message is never shown; only a stable code/status decides copy.
      // A 500 / `unexpected_failure` can equally be a service outage, so it is
      // NOT special-cased to "username taken" at all: the availability preflight
      // above already handles the normal duplicate case, and stable duplicate
      // codes are mapped by the shared safe mapper.
      throw new UiError(localizedAuthError(t, error));
    }
    track({ event_name: "auth_signup_succeeded", feature: "auth" });
    setComplianceErrors([]);
    // When email confirmation is disabled, signUp already returns a session:
    // continue straight into the startup gates instead of asking for an email
    // that will never arrive.
    if (signUpData.session) {
      await goHome();
      return;
    }
    toast.success(t("auth.checkEmailToConfirm"));
    setMode("signin");
    setIdentifier(normalised);
    setPassword("");
  };

  const handleReset = async () => {
    const email = resetEmail.trim();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
      ...verifiedCaptchaToken(),
    });
    if (error) throw new UiError(localizedAuthError(t, error));
    track({ event_name: "auth_password_reset_requested", feature: "auth" });
    toast.success(t("auth.resetLinkSent"));
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
      // Raw provider errors are English: log them, show localized copy.
      if (!localizedMessage(err)) console.error("auth failed", err);
      toast.error(localizedMessage(err) ?? t("auth.authenticationFailed"));
    } finally {
      setIsLoading(false);
      setCaptchaToken(null);
      setCaptchaResetNonce((value) => value + 1);
    }
  };

  const handleOAuth = async (provider: OAuthProvider, label: string) => {
    setIsLoading(true);
    track({ event_name: "oauth_signin_started", feature: "auth", properties: { provider } });
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) {
      trackFailure("oauth_signin_failed", error, {
        feature: "auth",
        properties: { provider },
      });
      console.error("oauth sign-in failed", error);
      toast.error(t("auth.oauthSignInFailed", { provider: label }));
      setIsLoading(false);
    }
  };

  const submitLabel =
    mode === "reset"
      ? t("auth.submitReset")
      : mode === "signin"
        ? t("auth.submitSignIn")
        : t("auth.submitSignUp");

  return (
    <div className="app-card space-y-6 p-7">
      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === "signin" && (
          <div className="space-y-2">
            <Label htmlFor="identifier" className="text-[13px] font-semibold text-muted-foreground">
              {t("auth.identifierLabel")}
            </Label>
            <Input
              id="identifier"
              type="text"
              autoComplete="username"
              placeholder={t("auth.identifierPlaceholder")}
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
                {t("auth.usernameLabel")}
              </Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                placeholder={t("auth.usernamePlaceholder")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
              <p className="text-[12.5px] text-muted-foreground">{t("auth.usernameHelper")}</p>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="signupEmail"
                className="text-[13px] font-semibold text-muted-foreground"
              >
                {t("auth.emailLabel")}
              </Label>
              <Input
                id="signupEmail"
                type="email"
                autoComplete="email"
                placeholder={t("auth.emailPlaceholder")}
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-muted-foreground">
                {t("signup.accountType.label")}
              </Label>
              <RadioGroup
                value={signupAccountType}
                onValueChange={(value) => setSignupAccountType(value as "student" | "teacher")}
                className="grid gap-2 sm:grid-cols-2"
              >
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2">
                  <RadioGroupItem value="student" id="signup-account-student" />
                  <span className="text-[13.5px] text-foreground">
                    {t("signup.accountType.student")}
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2">
                  <RadioGroupItem value="teacher" id="signup-account-teacher" />
                  <span className="text-[13.5px] text-foreground">
                    {t("signup.accountType.teacher")}
                  </span>
                </label>
              </RadioGroup>
              <p className="text-[12.5px] text-muted-foreground">{t("signup.accountType.hint")}</p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="signupDob"
                className="text-[13px] font-semibold text-muted-foreground"
              >
                {t("signup.dob.label")}
              </Label>
              <Input
                id="signupDob"
                type="date"
                value={signupDob}
                onChange={(e) => setSignupDob(e.target.value)}
                required
              />
              <p className="text-[12.5px] text-muted-foreground">{t("signup.dob.hint")}</p>
            </div>

            {signupAccountType === "student" && (
              <div className="space-y-2">
                <Label
                  htmlFor="signupGuardianEmail"
                  className="text-[13px] font-semibold text-muted-foreground"
                >
                  {t("signup.guardianEmail.label")}
                </Label>
                <Input
                  id="signupGuardianEmail"
                  type="email"
                  value={signupGuardianEmail}
                  onChange={(e) => setSignupGuardianEmail(e.target.value)}
                  required
                />
                <p className="text-[12.5px] text-muted-foreground">
                  {t("signup.guardianEmail.hint")}
                </p>
              </div>
            )}

            <div className="space-y-2 rounded-md border border-input p-3">
              <p className="text-[13px] font-semibold text-muted-foreground">
                {t("signup.consent.title")}
              </p>
              <SignupConsentRow
                id="signup-consent-terms"
                checked={signupAcceptedTerms}
                onChange={setSignupAcceptedTerms}
                label={t("signup.consent.terms")}
                href="/legal/terms"
                linkLabel={t("signup.consent.openLink")}
              />
              <SignupConsentRow
                id="signup-consent-privacy"
                checked={signupAcceptedPrivacy}
                onChange={setSignupAcceptedPrivacy}
                label={t("signup.consent.privacy")}
                href="/legal/privacy"
                linkLabel={t("signup.consent.openLink")}
              />
              <SignupConsentRow
                id="signup-consent-acceptable-use"
                checked={signupAcceptedAcceptableUse}
                onChange={setSignupAcceptedAcceptableUse}
                label={t("signup.consent.acceptableUse")}
                href="/legal/acceptable-use"
                linkLabel={t("signup.consent.openLink")}
              />
              <SignupConsentRow
                id="signup-consent-child-safety"
                checked={signupAcceptedChildSafety}
                onChange={setSignupAcceptedChildSafety}
                label={t("signup.consent.childSafety")}
                href="/legal/child-safety"
                linkLabel={t("signup.consent.openLink")}
              />
              <p className="text-[12px] text-muted-foreground">{t("signup.consent.required")}</p>
            </div>

            {complianceErrors.length > 0 && (
              <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
                {complianceErrors.map((code) => (
                  <p key={code} className="text-[12.5px] text-destructive">
                    {t(`compliance.error.${code}` as TranslationKey)}
                  </p>
                ))}
              </div>
            )}
          </>
        )}

        {mode === "reset" && (
          <div className="space-y-2">
            <Label htmlFor="resetEmail" className="text-[13px] font-semibold text-muted-foreground">
              {t("auth.emailLabel")}
            </Label>
            <Input
              id="resetEmail"
              type="email"
              autoComplete="email"
              placeholder={t("auth.emailPlaceholder")}
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
              autoFocus
            />
            <p className="text-[14px] text-muted-foreground">{t("auth.resetHelper")}</p>
          </div>
        )}

        {mode !== "reset" && (
          <div className="space-y-2">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <Label htmlFor="password" className="text-[13px] font-semibold text-muted-foreground">
                {t("auth.passwordLabel")}
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
                  {t("auth.forgotPassword")}
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

        {(mode === "signup" || mode === "reset" || (mode === "signin" && identifier.includes("@"))) && (
          <AuthCaptcha onToken={handleCaptchaToken} resetNonce={captchaResetNonce} />
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t("auth.pleaseWait") : submitLabel}
        </Button>
      </form>

      {mode !== "reset" && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[12px] font-semibold uppercase tracking-wide">
              <span className="bg-card px-3 text-muted-foreground">{t("auth.or")}</span>
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
                {t("auth.continueWith", { provider: label })}
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
            {t("auth.backToSignIn")}
          </button>
        ) : (
          <>
            {mode === "signin" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
            <button
              type="button"
              className="font-semibold text-primary hover:text-primary-hover"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? t("auth.signUpLink") : t("auth.signInLink")}
            </button>
          </>
        )}
      </p>
    </div>
  );
}

function SignupConsentRow({
  id,
  checked,
  onChange,
  label,
  href,
  linkLabel,
}: {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(value === true)} />
        <Label htmlFor={id} className="cursor-pointer text-[13px] font-normal text-foreground">
          {label}
        </Label>
      </div>
      <Link
        to={href}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 text-[12.5px] font-semibold text-primary hover:text-primary-hover"
      >
        {linkLabel}
      </Link>
    </div>
  );
}
