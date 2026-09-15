/** TanStack route module: /system-health — capacity, storage and data rights. */
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { DataRightsPanel } from "@/components/app/DataRightsPanel";
import { SystemHealthPanel } from "@/components/app/SystemHealthPanel";
import { useI18n } from "@/lib/i18n/provider";

export const Route = createFileRoute("/_authenticated/system-health")({
  head: () => ({
    meta: [
      { title: "System health — Alim's Study Assistant" },
      {
        name: "description",
        content:
          "Live capacity of the local AI server, storage usage of this installation and controls to delete your own data.",
      },
      { property: "og:title", content: "System health — Alim's Study Assistant" },
      {
        property: "og:description",
        content: "Capacity, storage usage and your own data controls.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SystemHealthPage,
});

function SystemHealthPage() {
  const { t } = useI18n();
  return (
    <AppShell>
      <PageHeading title={t("systemHealth.title")} description={t("systemHealth.subtitle")} />
      <div className="space-y-6">
        <SystemHealthPanel />
        <DataRightsPanel />
      </div>
    </AppShell>
  );
}
