import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { PageNav } from "@/components/app/Breadcrumbs";
import { SuccessState } from "@/components/app/States";

export const Route = createFileRoute("/_authenticated/diagnostics")({
  head: () => ({
    meta: [
      { title: "Diagnostics — Alim's Study Assistant" },
      { name: "description", content: "Prototype status of indexing, sync and AI services." },
      { property: "og:title", content: "Diagnostics — Alim's Study Assistant" },
      { property: "og:description", content: "Prototype status of indexing, sync and AI services." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <PageNav back={{ to: "/home", label: "Home" }} crumbs={[{ label: "Home", to: "/home" }, { label: "Diagnostics" }]} />
      <PageHeading title="Diagnostics" description="Simulated service status for the prototype." />
      <SuccessState heading="All services nominal" description="Indexing, planner sync and chat are responding normally." />
    </AppShell>
  ),
});
