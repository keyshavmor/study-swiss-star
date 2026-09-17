/** TanStack route module defining one Alim screen or local API boundary. */
import { useCallback, useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ModelReadinessPanel } from "@/components/app/ModelReadinessPanel";
import { SystemCapabilityPanel } from "@/components/app/SystemCapabilityPanel";
import { useI18n } from "@/lib/i18n/provider";
import { DEFAULT_PREFERENCES, fetchPreferences } from "@/lib/account-data";
import { useAiAvailability } from "@/lib/ai-availability";
import { resolveStartupDestination } from "@/lib/startup-flow";
import { signOutCompletely } from "@/lib/sign-out";
import { track } from "@/lib/telemetry";

export const Route = createFileRoute("/_authenticated/onboarding/model")({
  head: () => ({
    meta: [
      { title: "Prepare your study AI — Alim's Study Assistant" },
      {
        name: "description",
        content:
          "Choose your local study model and check whether the local AI backend can run it in this session.",
      },
      { property: "og:title", content: "Prepare your study AI — Alim's Study Assistant" },
      {
        property: "og:description",
        content: "Check the local AI backend before starting a study session.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ModelOnboardingPage,
});

function ModelOnboardingPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const ai = useAiAvailability();
  // SEQUENCE: durable preferred model → capability probe (with that model as
  // input) → advisory recommendation preselects the picker → the user explicitly
  // presses check/prepare. Preparation is NEVER auto-started from a persisted
  // preference, so the system report is always visible first.
  const [preferredModel, setPreferredModel] = useState<string | null>(null);
  const [recommendedModel, setRecommendedModel] = useState<string | null>(null);
  // STRICT INITIAL SYSTEM-ASSESSMENT GATE: the model picker/prepare controls are
  // not mounted until the FIRST capability probe resolves — either with a real
  // report or with the truthful unavailable fallback. A later "Re-check" never
  // re-closes this gate and never clobbers a manual model choice.
  const [initialProbeResolved, setInitialProbeResolved] = useState(false);

  useEffect(() => {
    void fetchPreferences()
      .then((prefs) => setPreferredModel(prefs.selected_qwen_model))
      .catch(() => setPreferredModel(DEFAULT_PREFERENCES.selected_qwen_model));
  }, []);

  const handleReady = useCallback(
    (modelId: string) => {
      // ONLY an explicit backend `ready` confirmation may unlock AI features.
      ai.setReady(modelId);
    },
    [ai],
  );

  const handleUnavailable = useCallback(() => {
    ai.setUnavailable();
  }, [ai]);

  const continueWithoutAi = async () => {
    ai.setNonAi();
    track({ event_name: "ai_session_non_ai_selected", feature: "ai" });
    await navigate({ to: await resolveStartupDestination(), replace: true });
  };

  // Best-effort runtime release, then a deterministic landing on the public
  // auth page even if the release call fails.
  const handleSignOut = async () => {
    try {
      await signOutCompletely();
    } catch {
      /* never trap the user in the app */
    }
    await navigate({ to: "/", replace: true });
  };

  const continueToApp = async () => {
    if (!ai.aiEnabled) return;
    await navigate({ to: await resolveStartupDestination(), replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[680px]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Cpu className="h-6 w-6" />
          </div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em] text-foreground">
            {t("onboarding.model.title")}
          </h1>
          <p className="mx-auto mt-3 max-w-[460px] text-[15px] leading-relaxed text-muted-foreground">
            {t("onboarding.model.subtitle")}
          </p>
        </div>

        <div className="mb-5">
          {preferredModel !== null && (
            <SystemCapabilityPanel
              preferredModelId={preferredModel}
              onReport={(report) => {
                // Advisory only. Hardware values are never inferred in the
                // browser and a recommendation never means "ready".
                setRecommendedModel(report.recommendation.recommended_model_id);
              }}
            />
          )}
        </div>

        <div className="app-card p-5 sm:p-6">
          {preferredModel !== null && (
            <ModelReadinessPanel
              initialModelId={preferredModel}
              recommendedModelId={recommendedModel}
              onReady={handleReady}
              onPreparing={ai.setPreparing}
              onUnavailable={handleUnavailable}
            />
          )}
        </div>

        {!ai.aiEnabled && ai.status !== "preparing" && (
          <div
            role="status"
            className="mt-5 rounded-[16px] border border-destructive/40 bg-destructive/10 p-4"
          >
            <p className="flex items-center gap-2 text-[15px] font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {t("onboarding.model.notReadyTitle")}
            </p>
            <p className="mt-1 text-[14px] text-foreground">{t("onboarding.model.notReadyBody")}</p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {/* Normal continue exists only after a backend ready confirmation. */}
          {ai.aiEnabled && (
            <Button size="lg" onClick={() => void continueToApp()}>
              {t("onboarding.model.continueToApp")}
            </Button>
          )}
          <Button size="lg" variant="outline" onClick={() => void continueWithoutAi()}>
            {t("onboarding.model.continueWithoutAi")}
          </Button>
          <Button size="lg" variant="ghost" onClick={() => void handleSignOut()}>
            {t("onboarding.model.logout")}
          </Button>
        </div>
        <p className="mt-3 text-center text-[12px] text-muted-foreground">
          {t("onboarding.model.sessionNote")}
        </p>
      </div>
    </div>
  );
}
