/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/app/LegalDocumentPage";
import { LEGAL_VERSIONS } from "@/lib/compliance";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Notice — Alim's Study Assistant" },
      {
        name: "description",
        content: "The Privacy Notice explaining what data Alim's Study Assistant stores and why.",
      },
      { property: "og:title", content: "Privacy Notice — Alim's Study Assistant" },
      {
        property: "og:description",
        content: "What data we store, why, and how you stay in control.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const t = useT();
  return (
    <LegalDocumentPage
      title={t("legal.privacy.title")}
      intro={t("legal.privacy.intro")}
      version={LEGAL_VERSIONS.privacy}
      sections={[
        { title: t("legal.privacy.data.title"), body: t("legal.privacy.data.body") },
        { title: t("legal.privacy.purpose.title"), body: t("legal.privacy.purpose.body") },
        {
          title: t("legal.privacy.minimisation.title"),
          body: t("legal.privacy.minimisation.body"),
        },
        { title: t("legal.privacy.retention.title"), body: t("legal.privacy.retention.body") },
        { title: t("legal.privacy.rights.title"), body: t("legal.privacy.rights.body") },
        { title: t("legal.privacy.contact.title"), body: t("legal.privacy.contact.body") },
      ]}
    />
  );
}
