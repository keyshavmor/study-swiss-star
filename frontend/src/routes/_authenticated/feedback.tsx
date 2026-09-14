/** Feedback screen. Submits through the `feedback-submit` Edge Function. */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { PageNav } from "@/components/app/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n/provider";
import { track, trackFailure } from "@/lib/telemetry";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback — Alim's Study Assistant" },
      { name: "description", content: "Share ideas and report problems with the study assistant." },
      { property: "og:title", content: "Feedback — Alim's Study Assistant" },
      { property: "og:description", content: "Share ideas and report problems." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeedbackPage,
});

const CATEGORIES = [
  { value: "idea", labelKey: "feedback.category.idea" },
  { value: "bug", labelKey: "feedback.category.bug" },
  { value: "general", labelKey: "feedback.category.general" },
] as const;

const MIN_LENGTH = 10;
const MAX_LENGTH = 4000;

function FeedbackPage() {
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = message.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_LENGTH;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (trimmed.length < MIN_LENGTH) {
      setError(t("feedback.error.tooShort", { min: MIN_LENGTH }));
      return;
    }
    setSending(true);
    try {
      const { error: fnError } = await supabase.functions.invoke("feedback-submit", {
        body: {
          message: trimmed,
          category,
          context: {
            route: window.location.pathname,
            user_agent: navigator.userAgent.slice(0, 200),
            submitted_at: new Date().toISOString(),
          },
        },
      });
      if (fnError) throw fnError;

      setMessage("");
      setSent(true);
      track({ event_name: "feedback_submitted", feature: "feedback", properties: { category } });
      toast.success(t("feedback.success.toast"));
    } catch (err) {
      trackFailure("feedback_submit_failed", err, {
        feature: "feedback",
        properties: { category },
      });
      setError(
        err instanceof Error
          ? t("feedback.error.submitFailed", { message: err.message })
          : t("feedback.error.submitFailedGeneric"),
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <AppShell>
      <PageNav
        back={{ to: "/home", label: t("nav.home") }}
        crumbs={[{ label: t("nav.home"), to: "/home" }, { label: t("nav.feedback") }]}
      />
      <PageHeading title={t("feedback.heading")} description={t("feedback.description")} />
      <form onSubmit={handleSubmit} className="app-card max-w-2xl space-y-4 p-5">
        <div className="max-w-xs space-y-2">
          <Label htmlFor="category">{t("feedback.category.label")}</Label>
          <Select value={category} onValueChange={setCategory} disabled={sending}>
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {t(item.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">{t("feedback.message.label")}</Label>
          <Textarea
            id="message"
            rows={6}
            maxLength={MAX_LENGTH}
            placeholder={t("feedback.message.placeholder")}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setSent(false);
            }}
            disabled={sending}
            required
          />
          <p className="text-[12.5px] text-muted-foreground">
            {t("feedback.charCount", { count: trimmed.length, max: MAX_LENGTH })}
            {tooShort ? t("feedback.charCount.tooShort", { min: MIN_LENGTH }) : ""}
          </p>
        </div>

        {error && (
          <p className="rounded-[14px] bg-destructive/10 p-3 text-[13.5px] text-destructive">
            {error}
          </p>
        )}
        {sent && !error && (
          <p className="rounded-[14px] bg-surface-2 p-3 text-[13.5px] text-muted-foreground">
            {t("feedback.success.saved")}
          </p>
        )}

        <Button type="submit" disabled={sending || trimmed.length < MIN_LENGTH}>
          {sending ? t("feedback.submit.pending") : t("feedback.submit")}
        </Button>
      </form>
    </AppShell>
  );
}
