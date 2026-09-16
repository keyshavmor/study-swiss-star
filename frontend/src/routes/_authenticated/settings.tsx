/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { PageNav } from "@/components/app/Breadcrumbs";
import {
  AccountSection,
  ComplianceSection,
  MessagingSection,
  PreferencesSections,
  PrivacySection,
  StorageSection,
} from "@/components/app/SettingsSections";
import { SystemCapabilityPanel } from "@/components/app/SystemCapabilityPanel";
import { UserQuotaCard } from "@/components/app/UserQuotaCard";
import { useI18n } from "@/lib/i18n/provider";

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
  const { t } = useI18n();
  return (
    <AppShell>
      <PageNav
        back={{ to: "/home", label: t("nav.home") }}
        crumbs={[{ label: t("nav.home"), to: "/home" }, { label: t("nav.settings") }]}
      />
      <PageHeading title={t("settings.page.title")} description={t("settings.page.description")} />
      <div className="max-w-3xl space-y-5">
        <AccountSection />
        <PreferencesSections />
        <MessagingSection />
        <SystemCapabilityPanel />
        <UserQuotaCard />
        <StorageSection />
        <PrivacySection />
        <ComplianceSection />
      </div>
    </AppShell>
  );
}
