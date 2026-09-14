/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute, useParams } from "@tanstack/react-router";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { PageNav } from "@/components/app/Breadcrumbs";
import { AssistantChat } from "@/components/assistant/AssistantChat";

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
  return (
    <AppShell>
      <PageNav
        back={{ to: "/assistant", label: "Assistant" }}
        crumbs={[
          { label: "Home", to: "/home" },
          { label: "Assistant", to: "/assistant" },
          { label: "Conversation" },
        ]}
      />
      <PageHeading
        title="Assistant"
        description="General-purpose chat with attachments, kept separate from subject tutoring."
      />
      <AssistantChat threadId={threadId} />
    </AppShell>
  );
}
