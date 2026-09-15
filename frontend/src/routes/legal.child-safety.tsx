/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/app/LegalDocumentPage";
import { LEGAL_VERSIONS } from "@/lib/compliance";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/legal/child-safety")({
  head: () => ({
    meta: [
      { title: "Child Safety Notice — Alim's Study Assistant" },
      {
        name: "description",
        content: "The Child Safety Notice describing safety rules and reporting for minors.",
      },
      { property: "og:title", content: "Child Safety Notice — Alim's Study Assistant" },
      {
        property: "og:description",
        content: "Safety comes before convenience: how we protect students under 18.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChildSafetyPage,
});

function ChildSafetyPage() {
  const t = useT();
  return (
    <LegalDocumentPage
      title={t("legal.childSafety.title")}
      intro={t("legal.childSafety.intro")}
      version={LEGAL_VERSIONS.child_safety}
      sections={[
        { title: t("legal.childSafety.title"), body: t("legal.childSafety.warning") },
        { title: t("legal.childSafety.report.title"), body: t("legal.childSafety.report.body") },
        {
          title: t("legal.childSafety.guardians.title"),
          body: t("legal.childSafety.guardians.body"),
        },
      ]}
    />
  );
}
