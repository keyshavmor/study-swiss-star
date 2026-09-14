/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { PageNav } from "@/components/app/Breadcrumbs";
import { AssistantChat } from "@/components/assistant/AssistantChat";

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
  component: () => (
    <AppShell>
      <PageNav
        back={{ to: "/home", label: "Home" }}
        crumbs={[{ label: "Home", to: "/home" }, { label: "Assistant" }]}
      />
      <PageHeading
        title="Assistant"
        description="General-purpose chat with attachments, kept separate from subject tutoring."
      />
      <AssistantChat />
    </AppShell>
  ),
});
