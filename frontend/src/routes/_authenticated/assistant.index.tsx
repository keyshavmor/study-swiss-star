/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { PageNav } from "@/components/app/Breadcrumbs";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { AiBlockedNotice } from "@/components/app/AiFeatureGate";
import { useI18n } from "@/lib/i18n/provider";

export const Route = createFileRoute("/_authenticated/assistant/")({
  head: () => ({
    meta: [
      { title: "Assistant — Alim's Study Assistant" },
      {
        name: "description",
        content: "A general-purpose AI chat, separate from subject tutoring.",
      },
      { property: "og:title", content: "Assistant — Alim's Study Assistant" },
      {
        property: "og:description",
        content: "A general-purpose AI chat, separate from subject tutoring.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssistantIndexPage,
});

function AssistantIndexPage() {
  const { t } = useI18n();
  return (
    <AppShell>
      <PageNav
        back={{ to: "/home", label: t("assistant.crumbHome") }}
        crumbs={[
          { label: t("assistant.crumbHome"), to: "/home" },
          { label: t("assistant.crumbAssistant") },
        ]}
      />
      <PageHeading title={t("assistant.pageTitle")} description={t("assistant.pageDescription")} />
      <AiBlockedNotice />
      <AssistantChat />
    </AppShell>
  );
}
