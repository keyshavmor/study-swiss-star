/** TanStack route module defining one Alim screen or local API boundary. */
import { useCallback, useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Check, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import { LANGUAGES, type LanguageCode } from "@/lib/i18n/languages";
import { savePreferences } from "@/lib/account-data";
import {
  invalidateStartupCache,
  languageOnboardingStatus,
  MODEL_ONBOARDING_PATH,
} from "@/lib/startup-flow";
import { track, trackFailure } from "@/lib/telemetry";


export const Route = createFileRoute("/_authenticated/onboarding/language")({
  head: () => ({
    meta: [
      { title: "Choose your language — Alim's Study Assistant" },
      {
        name: "description",
        content: "Pick the default language for your study assistant before you start.",
      },
      { property: "og:title", content: "Choose your language — Alim's Study Assistant" },
      {
        property: "og:description",
        content: "Set the default language for your Swiss Gymnasium study assistant.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LanguageOnboardingPage,
});

function LanguageOnboardingPage() {
  const { t, setLanguage } = useI18n();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<LanguageCode | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const choose = (code: LanguageCode) => {
    setSelected(code);
    setError(false);
    // Switches the whole onboarding UI immediately and persists app_language.
    setLanguage(code);
  };

  const handleContinue = async () => {
    if (!selected) return;
    setSaving(true);
    setError(false);
    try {
      await savePreferences({
        app_language: selected,
        language_onboarding_completed: true,
      });
      invalidateStartupCache();
      track({ event_name: "onboarding_language_confirmed", feature: "onboarding" });
      await navigate({ to: MODEL_ONBOARDING_PATH, replace: true });
    } catch (err) {
      trackFailure("onboarding_language_save_failed", err, { feature: "onboarding" });
      setError(true);
    } finally {
      setSaving(false);
    }
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
            const active = selected ? selected === entry.code : false;
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
                      {entry.englishName}
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
        {error && (
          <p className="mt-2 text-center text-[13px] text-destructive">
            {t("onboarding.language.saveError")}
          </p>
        )}

        <div className="mt-6 flex justify-center">
          <Button
            size="lg"
            disabled={!selected || saving}
            onClick={() => void handleContinue()}
            aria-label={t("onboarding.language.continue")}
          >
            {saving ? t("onboarding.language.saving") : t("onboarding.language.continue")}
          </Button>
        </div>
      </div>
    </div>
  );
}
