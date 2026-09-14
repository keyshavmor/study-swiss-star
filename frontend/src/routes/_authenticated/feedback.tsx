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
  { value: "idea", label: "Idea or suggestion" },
  { value: "bug", label: "Something is broken" },
  { value: "general", label: "General feedback" },
] as const;

const MIN_LENGTH = 10;
const MAX_LENGTH = 4000;

function FeedbackPage() {
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
      setError(`Please write at least ${MIN_LENGTH} characters so we can act on it.`);
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
      toast.success("Thank you — your feedback was saved.");
    } catch (err) {
      trackFailure("feedback_submit_failed", err, { feature: "feedback", properties: { category } });
      setError(
        err instanceof Error
          ? `Your feedback was not saved: ${err.message}`
          : "Your feedback was not saved. Please try again.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <AppShell>
      <PageNav
        back={{ to: "/home", label: "Home" }}
        crumbs={[{ label: "Home", to: "/home" }, { label: "Feedback" }]}
      />
      <PageHeading title="Feedback" description="Tell us what should work better." />
      <form onSubmit={handleSubmit} className="app-card max-w-2xl space-y-4 p-5">
        <div className="max-w-xs space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={setCategory} disabled={sending}>
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Your feedback</Label>
          <Textarea
            id="message"
            rows={6}
            maxLength={MAX_LENGTH}
            placeholder="What would you improve?"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setSent(false);
            }}
            disabled={sending}
            required
          />
          <p className="text-[12.5px] text-muted-foreground">
            {trimmed.length}/{MAX_LENGTH} characters
            {tooShort ? ` · at least ${MIN_LENGTH} needed` : ""}
          </p>
        </div>

        {error && (
          <p className="rounded-[14px] bg-destructive/10 p-3 text-[13.5px] text-destructive">
            {error}
          </p>
        )}
        {sent && !error && (
          <p className="rounded-[14px] bg-surface-2 p-3 text-[13.5px] text-muted-foreground">
            Saved. Thank you — we read every message.
          </p>
        )}

        <Button type="submit" disabled={sending || trimmed.length < MIN_LENGTH}>
          {sending ? "Sending…" : "Send feedback"}
        </Button>
      </form>
    </AppShell>
  );
}
