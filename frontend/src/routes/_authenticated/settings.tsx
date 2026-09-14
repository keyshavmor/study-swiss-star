/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { PageNav } from "@/components/app/Breadcrumbs";
import {
  AccountSection,
  PreferencesSections,
  StorageSection,
} from "@/components/app/SettingsSections";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Alim's Study Assistant" },
      {
        name: "description",
        content: "Account, local model, storage and study preferences.",
      },
      { property: "og:title", content: "Settings — Alim's Study Assistant" },
      {
        property: "og:description",
        content: "Account, local model, storage and study preferences.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppShell>
      <PageNav
        back={{ to: "/home", label: "Home" }}
        crumbs={[{ label: "Home", to: "/home" }, { label: "Settings" }]}
      />
      <PageHeading
        title="Settings"
        description="Your account, the local model, storage and study preferences."
      />
      <div className="max-w-3xl space-y-5">
        <AccountSection />
        <PreferencesSections />
        <StorageSection />
      </div>
    </AppShell>
  );
}
