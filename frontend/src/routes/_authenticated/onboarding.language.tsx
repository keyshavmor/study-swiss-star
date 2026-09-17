/** TanStack route module defining one Alim screen or local API boundary. */
import { useCallback, useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Check, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import { LANGUAGES, type LanguageCode } from "@/lib/i18n/languages";
import { savePreferences, fetchPreferences } from "@/lib/account-data";
import { markLanguageSelected, markLanguageSkipped } from "@/lib/language-session";
import { invalidateStartupCache, MODEL_ONBOARDING_PATH } from "@/lib/startup-flow";
import { signOutCompletely } from "@/lib/sign-out";
import { track, trackFailure } from "@/lib/telemetry";

export const Route = createFileRoute("/_authenticated/onboarding/language")({
  head: () => ({
    meta: [
      { title: "Choose your language — Alim's Study Assistant" },
      {
        name: "description",
        content: "Pick the language for this study session before you continue.",
      },
      { property: "og:title", content: "Choose your language — Alim's Study Assistant" },
      {
        property: "og:description",
        content: "Set the language for your Swiss Gymnasium study session.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LanguageOnboardingPage,
});

function LanguageOnboardingPage() {
  const { t, language, setLanguage } = useI18n();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<LanguageCode | null>(null);
  const [persisted, setPersisted] = useState<LanguageCode | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // The durable Supabase app_language is only a SAVED DEFAULT VISUAL HINT. It
  // never counts as this session's choice and never enables Continue. A failed
  // read never blocks this screen: the user can still choose or skip.
  const loadPersisted = useCallback(async () => {
    invalidateStartupCache();
    try {
      const prefs = await fetchPreferences();
      const stored = prefs.app_language as LanguageCode | null | undefined;
      const known = LANGUAGES.some((entry) => entry.code === stored);
      setPersisted(known ? (stored as LanguageCode) : null);
      setLoadFailed(false);
    } catch {
      setPersisted(null);
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    void loadPersisted();
  }, [loadPersisted]);

  // The saved app_language is only a VISUAL default hint. It is never treated
  // as this session's decision: Continue stays disabled until the user clicks
  // a language in this session, and Skip records an explicit skip instead.

  const choose = (code: LanguageCode) => {
    setSelected(code);
    setError(false);
    // Switches the whole onboarding UI immediately and caches app_language.
    setLanguage(code);
  };

  const handleContinue = async () => {
    const target = selected;
    // Explicit choice required — a persisted default can never confirm for the user.
    if (!target) return;
    setSaving(true);
    setError(false);
    try {
      await savePreferences({
        app_language: target,
        // LEGACY profile metadata; the session decision below is the gate.
        language_onboarding_completed: true,
      });
      invalidateStartupCache();
      markLanguageSelected(target);
      track({ event_name: "onboarding_language_confirmed", feature: "onboarding" });
      await navigate({ to: MODEL_ONBOARDING_PATH, replace: true });
    } catch (err) {
      trackFailure("onboarding_language_save_failed", err, { feature: "onboarding" });
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  // Skipping keeps the persisted/current language and still records the
  // session-scoped decision, so the model screen cannot be bypassed.
  const handleSkip = async () => {
    markLanguageSkipped(persisted ?? (language as LanguageCode) ?? null);
    track({ event_name: "onboarding_language_skipped", feature: "onboarding" });
    await navigate({ to: MODEL_ONBOARDING_PATH, replace: true });
  };

  // Deterministic recovery: runtime release is best-effort, but the user always
  // lands back on the public auth landing page even when it fails.
  const handleSignOut = async () => {
    try {
      await signOutCompletely();
    } catch {
      /* best-effort runtime release / Supabase sign-out */
    }
    await navigate({ to: "/", replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[560px]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Languages className="h-6 w-6" />
          </div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em] text-foreground">
            {t("onboarding.language.title")}
          </h1>
          <p className="mx-auto mt-3 max-w-[420px] text-[15px] leading-relaxed text-muted-foreground">
            {t("onboarding.language.subtitle")}
          </p>
        </div>

        <div className="app-card grid gap-2 p-4 sm:grid-cols-2">
          {LANGUAGES.map((entry) => {
            const active = selected === entry.code;
            const isDefault = persisted === entry.code;
            return (
              <button
                key={entry.code}
                type="button"
                onClick={() => choose(entry.code)}
                aria-pressed={active}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border bg-surface-2 hover:bg-accent",
                )}
              >
                <span className="flex items-center gap-3">
                  <span className="text-[20px]" aria-hidden="true">
                    {entry.flag}
                  </span>
                  <span>
                    <span className="block text-[15px] font-medium text-foreground">
                      {entry.nativeName}
                    </span>
                    <span className="block text-[12px] text-muted-foreground">
                      {isDefault ? t("onboarding.language.savedDefault") : entry.englishName}
                    </span>
                  </span>
                </span>
                {active && (
                  <span className="flex items-center gap-1 text-[12px] font-medium text-primary">
                    <Check className="h-4 w-4" />
                    {t("onboarding.language.selected")}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-center text-[13px] text-muted-foreground">
          {t("onboarding.language.hint")}
        </p>
        <p className="mt-1 text-center text-[12px] text-muted-foreground">
          {t("onboarding.language.sessionNote")}
        </p>
        {selected === null && (
          <p className="mt-1 text-center text-[13px] text-muted-foreground">
            {t("onboarding.language.mustChoose")}
          </p>
        )}
        {error && (
          <p className="mt-2 text-center text-[13px] text-destructive">
            {t("onboarding.language.saveError")}
          </p>
        )}
        {loadFailed && (
          <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-center">
            <p className="flex items-center gap-2 text-[13px] font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {t("onboarding.language.loadError")}
            </p>
            <Button variant="outline" size="sm" onClick={() => void loadPersisted()}>
              {t("onboarding.language.retry")}
            </Button>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            size="lg"
            disabled={selected === null || saving}
            onClick={() => void handleContinue()}
            aria-label={t("onboarding.language.continue")}
          >
            {saving ? t("onboarding.language.saving") : t("onboarding.language.continue")}
          </Button>
          <Button size="lg" variant="outline" onClick={() => void handleSkip()}>
            {t("onboarding.language.skip")}
          </Button>
          <Button size="lg" variant="ghost" onClick={() => void handleSignOut()}>
            {t("onboarding.language.signOut")}
          </Button>
        </div>
      </div>
    </div>
  );
}
