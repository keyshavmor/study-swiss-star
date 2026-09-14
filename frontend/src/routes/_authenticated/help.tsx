/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { PageNav } from "@/components/app/Breadcrumbs";
import { EmptyState } from "@/components/app/States";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/help")({
  head: () => ({
    meta: [
      { title: "Help — Alim's Study Assistant" },
      {
        name: "description",
        content: "How study material, grades and study plans work in Alim's Study Assistant.",
      },
      { property: "og:title", content: "Help — Alim's Study Assistant" },
      { property: "og:description", content: "Guides for materials, grades and study plans." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <PageNav
        back={{ to: "/home", label: "Home" }}
        crumbs={[{ label: "Home", to: "/home" }, { label: "Help" }]}
      />
      <PageHeading title="Help" description="Short guides for every part of the assistant." />
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          [
            "How material indexing works",
            "Upload notes, syllabi and grading criteria; they are indexed for study modes.",
          ],
          [
            "Swiss grading",
            "Grade = 1.0 + 5.0 × (achieved points ÷ maximum points), from 1.0 to 6.0.",
          ],
          ["Study plans", "Plans combine exam dates, free time and your activity schedule."],
          [
            "Google Calendar",
            "Connect Google Calendar in the Planner to see your appointments alongside your plan. They stay read-only.",
          ],
        ].map(([title, body]) => (
          <article key={title} className="app-card p-5">
            <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
            <p className="mt-2 text-[14.5px] text-muted-foreground">{body}</p>
          </article>
        ))}
      </div>
      <EmptyState
        className="mt-6"
        heading="Need something else?"
        description="Send a note and it will appear in the feedback inbox."
        action={<Button variant="secondary">Contact support</Button>}
      />
    </AppShell>
  ),
});
