import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { PageNav } from "@/components/app/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  component: () => (
    <AppShell>
      <PageNav back={{ to: "/home", label: "Home" }} crumbs={[{ label: "Home", to: "/home" }, { label: "Feedback" }]} />
      <PageHeading title="Feedback" description="Tell us what should work better." />
      <div className="app-card max-w-2xl p-5">
        <Textarea rows={6} placeholder="What would you improve?" />
        <Button className="mt-4">Send feedback</Button>
        <p className="mt-3 text-[13px] text-muted-foreground">Prototype — nothing is submitted.</p>
      </div>
    </AppShell>
  ),
});
