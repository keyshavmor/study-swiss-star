/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/app/LegalDocumentPage";
import { LEGAL_VERSIONS } from "@/lib/compliance";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — Alim's Study Assistant" },
      {
        name: "description",
        content:
          "The Terms of Use governing student and teacher accounts on Alim's Study Assistant.",
      },
      { property: "og:title", content: "Terms of Use — Alim's Study Assistant" },
      {
        property: "og:description",
        content: "How students and teachers may use this study assistant.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const t = useT();
  return (
    <LegalDocumentPage
      title={t("legal.terms.title")}
      intro={t("legal.terms.intro")}
      version={LEGAL_VERSIONS.terms}
      sections={[
        { title: t("legal.terms.eligibility.title"), body: t("legal.terms.eligibility.body") },
        { title: t("legal.terms.use.title"), body: t("legal.terms.use.body") },
        { title: t("legal.terms.content.title"), body: t("legal.terms.content.body") },
        { title: t("legal.terms.availability.title"), body: t("legal.terms.availability.body") },
        { title: t("legal.terms.termination.title"), body: t("legal.terms.termination.body") },
      ]}
    />
  );
}
