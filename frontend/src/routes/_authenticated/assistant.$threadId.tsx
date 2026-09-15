/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute, useParams } from "@tanstack/react-router";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { PageNav } from "@/components/app/Breadcrumbs";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { useI18n } from "@/lib/i18n/provider";

export const Route = createFileRoute("/_authenticated/assistant/$threadId")({
  head: () => ({
    meta: [
      { title: "Assistant conversation — Alim's Study Assistant" },
      { name: "description", content: "Your saved general-purpose assistant conversation." },
      { property: "og:title", content: "Assistant conversation — Alim's Study Assistant" },
      { property: "og:description", content: "Your saved general-purpose assistant conversation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssistantThreadPage,
});

function AssistantThreadPage() {
  const { threadId } = useParams({ from: "/_authenticated/assistant/$threadId" });
  const { t } = useI18n();
  return (
    <AppShell>
      <PageNav
        back={{ to: "/assistant", label: t("assistant.crumbAssistant") }}
        crumbs={[
          { label: t("assistant.crumbHome"), to: "/home" },
          { label: t("assistant.crumbAssistant"), to: "/assistant" },
          { label: t("assistant.crumbConversation") },
        ]}
      />
      <PageHeading title={t("assistant.pageTitle")} description={t("assistant.pageDescription")} />
      <AssistantChat threadId={threadId} />
    </AppShell>
  );
}
