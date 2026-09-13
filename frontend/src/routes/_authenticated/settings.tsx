/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { PageNav } from "@/components/app/Breadcrumbs";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Alim's Study Assistant" },
      { name: "description", content: "Appearance, notification and study preferences." },
      { property: "og:title", content: "Settings — Alim's Study Assistant" },
      { property: "og:description", content: "Appearance, notification and study preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <PageNav
        back={{ to: "/home", label: "Home" }}
        crumbs={[{ label: "Home", to: "/home" }, { label: "Settings" }]}
      />
      <PageHeading title="Settings" description="Preferences for the prototype interface." />
      <div className="app-card max-w-2xl divide-y divide-border p-5">
        {["Exam reminders", "Daily study summary", "Apple Reminders sync", "Sound effects"].map(
          (label, i) => (
            <div
              key={label}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3.5"
            >
              <span className="text-[15px] font-medium">{label}</span>
              <Switch defaultChecked={i < 2} />
            </div>
          ),
        )}
      </div>
    </AppShell>
  ),
});
