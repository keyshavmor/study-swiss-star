/** TanStack route module defining one Alim screen or local API boundary. */
import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useT } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/messages";
import {
  completeComplianceOnboarding,
  fetchAccountCompliance,
  validateComplianceInput,
  type ComplianceValidationError,
} from "@/lib/compliance";
import { supabase } from "@/integrations/supabase/client";
import {
  invalidateStartupCache,
  resolveStartupDestination,
  SUSPENDED_PATH,
} from "@/lib/startup-flow";
import { track, trackFailure } from "@/lib/telemetry";

export const Route = createFileRoute("/_authenticated/onboarding/compliance")({
  head: () => ({
    meta: [
      { title: "Before you start — Alim's Study Assistant" },
      {
        name: "description",
        content: "Confirm your account type, age and safety agreements before you start.",
      },
      { property: "og:title", content: "Before you start — Alim's Study Assistant" },
      {
        property: "og:description",
        content: "A few details keep everyone safe on Alim's Study Assistant.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ComplianceOnboardingPage,
});

type AccountTypeChoice = "student" | "teacher" | "";

function ComplianceOnboardingPage() {
  const t = useT();
  const navigate = useNavigate();

  const [accountType, setAccountType] = useState<AccountTypeChoice>("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedAcceptableUse, setAcceptedAcceptableUse] = useState(false);
  const [acceptedChildSafety, setAcceptedChildSafety] = useState(false);

  const [accountEmail, setAccountEmail] = useState("");
  const [errors, setErrors] = useState<ComplianceValidationError[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [checking, setChecking] = useState(true);

  const refresh = useCallback(async () => {
    setChecking(true);
    setLoadFailed(false);
    try {
      const { data: auth } = await supabase.auth.getUser();
      setAccountEmail(auth.user?.email ?? "");

      // Signup stores role/DOB/guardian only as auth metadata prefill hints.
      // They are offered here for confirmation; the legal acknowledgements are
      // NEVER pre-accepted — each box must be ticked deliberately.
      const meta = (auth.user?.user_metadata ?? {}) as Record<string, unknown>;
      const typePrefill = meta["account_type_prefill"];
      if (typePrefill === "student" || typePrefill === "teacher") {
        setAccountType((current) => (current === "" ? typePrefill : current));
      }
      const dobPrefill = meta["date_of_birth_prefill"];
      if (typeof dobPrefill === "string" && dobPrefill) {
        setDateOfBirth((current) => (current === "" ? dobPrefill : current));
      }
      const guardianPrefill = meta["guardian_email_prefill"];
      if (typeof guardianPrefill === "string" && guardianPrefill) {
        setGuardianEmail((current) => (current === "" ? guardianPrefill : current));
      }

      const compliance = await fetchAccountCompliance();
      if (compliance?.complianceOnboardingCompleted) {
        await navigate({ to: await resolveStartupDestination(), replace: true });
        return;
      }
      if (compliance?.accountStatus === "suspended_pending_review") {
        await navigate({ to: SUSPENDED_PATH, replace: true });
        return;
      }
    } catch (err) {
      trackFailure("compliance_onboarding_load_failed", err, { feature: "onboarding" });
      setLoadFailed(true);
    } finally {
      setChecking(false);
    }
  }, [navigate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateComplianceInput({
      accountType,
      dateOfBirth,
      guardianEmail,
      accountEmail,
      acceptedTerms,
      acceptedPrivacy,
      acceptedAcceptableUse,
      acceptedChildSafety,
    });
    setErrors(validationErrors);
    setSaveFailed(false);
    if (validationErrors.length > 0 || accountType === "") return;

    setSaving(true);
    try {
      await completeComplianceOnboarding({
        accountType,
        dateOfBirth,
        guardianEmail: accountType === "student" ? guardianEmail.trim() : null,
      });
      invalidateStartupCache();

      // Never infer completion from local state — re-read the RPC-confirmed row.
      const confirmed = await fetchAccountCompliance();
      if (confirmed?.complianceOnboardingCompleted) {
        track({ event_name: "compliance_onboarding_completed", feature: "onboarding" });
        await navigate({ to: await resolveStartupDestination(), replace: true });
        return;
      }
      setSaveFailed(true);
    } catch (err) {
      trackFailure("compliance_onboarding_save_failed", err, { feature: "onboarding" });
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <p className="text-[14px] text-muted-foreground">{t("compliance.saving")}</p>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="absolute right-6 top-6">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-[480px] rounded-xl border border-destructive/40 bg-destructive/10 px-5 py-6 text-center">
          <p className="flex items-center justify-center gap-2 text-[14px] font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {t("compliance.error.loadFailed")}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => void refresh()}>
            {t("compliance.retry")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[640px]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em] text-foreground">
            {t("compliance.title")}
          </h1>
          <p className="mx-auto mt-3 max-w-[480px] text-[15px] leading-relaxed text-muted-foreground">
            {t("compliance.subtitle")}
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="app-card space-y-6 p-7">
          <div className="space-y-3">
            <h2 className="text-[15px] font-semibold text-foreground">
              {t("compliance.section.role")}
            </h2>
            <Label className="text-[13px] font-semibold text-muted-foreground">
              {t("signup.accountType.label")}
            </Label>
            <RadioGroup
              value={accountType}
              onValueChange={(value) => setAccountType(value as AccountTypeChoice)}
              className="grid gap-2 sm:grid-cols-2"
            >
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3">
                <RadioGroupItem value="student" id="compliance-account-student" />
                <span className="text-[14px] text-foreground">
                  {t("signup.accountType.student")}
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3">
                <RadioGroupItem value="teacher" id="compliance-account-teacher" />
                <span className="text-[14px] text-foreground">
                  {t("signup.accountType.teacher")}
                </span>
              </label>
            </RadioGroup>
            <p className="text-[12.5px] text-muted-foreground">{t("signup.accountType.hint")}</p>

            <div className="space-y-2">
              <Label
                htmlFor="compliance-dob"
                className="text-[13px] font-semibold text-muted-foreground"
              >
                {t("signup.dob.label")}
              </Label>
              <Input
                id="compliance-dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
              />
              <p className="text-[12.5px] text-muted-foreground">{t("signup.dob.hint")}</p>
            </div>

            {accountType === "student" && (
              <div className="space-y-2">
                <Label
                  htmlFor="compliance-guardian-email"
                  className="text-[13px] font-semibold text-muted-foreground"
                >
                  {t("signup.guardianEmail.label")}
                </Label>
                <Input
                  id="compliance-guardian-email"
                  type="email"
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                  required
                />
                <p className="text-[12.5px] text-muted-foreground">
                  {t("signup.guardianEmail.hint")}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-[15px] font-semibold text-foreground">
              {t("compliance.section.consents")}
            </h2>
            <ConsentRow
              id="compliance-consent-terms"
              checked={acceptedTerms}
              onChange={setAcceptedTerms}
              label={t("signup.consent.terms")}
              href="/legal/terms"
              linkLabel={t("signup.consent.openLink")}
            />
            <ConsentRow
              id="compliance-consent-privacy"
              checked={acceptedPrivacy}
              onChange={setAcceptedPrivacy}
              label={t("signup.consent.privacy")}
              href="/legal/privacy"
              linkLabel={t("signup.consent.openLink")}
            />
            <ConsentRow
              id="compliance-consent-acceptable-use"
              checked={acceptedAcceptableUse}
              onChange={setAcceptedAcceptableUse}
              label={t("signup.consent.acceptableUse")}
              href="/legal/acceptable-use"
              linkLabel={t("signup.consent.openLink")}
            />
            <ConsentRow
              id="compliance-consent-child-safety"
              checked={acceptedChildSafety}
              onChange={setAcceptedChildSafety}
              label={t("signup.consent.childSafety")}
              href="/legal/child-safety"
              linkLabel={t("signup.consent.openLink")}
            />
          </div>

          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-destructive">
              <ShieldAlert className="h-5 w-5" />
              {t("compliance.safety.heading")}
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-destructive/90">
              {t("compliance.safety.body")}
            </p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-destructive/90">
              {t("compliance.safety.consequences")}
            </p>
          </div>

          {errors.length > 0 && (
            <div className="space-y-1 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
              {errors.map((code) => (
                <p key={code} className="text-[13px] text-destructive">
                  {t(`compliance.error.${code}` as TranslationKey)}
                </p>
              ))}
            </div>
          )}

          {saveFailed && (
            <p className="text-center text-[13px] text-destructive">
              {t("compliance.error.saveFailed")}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            {saving ? t("compliance.saving") : t("compliance.submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}

function ConsentRow({
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3">
      <div className="flex items-center gap-3">
        <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(value === true)} />
        <Label htmlFor={id} className="cursor-pointer text-[14px] font-normal text-foreground">
          {label}
        </Label>
      </div>
      <Link
        to={href}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 text-[13px] font-semibold text-primary hover:text-primary-hover"
      >
        {linkLabel}
      </Link>
    </div>
  );
}
