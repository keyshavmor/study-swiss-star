/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/app/LegalDocumentPage";
import { LEGAL_VERSIONS } from "@/lib/compliance";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/legal/acceptable-use")({
  head: () => ({
    meta: [
      { title: "Acceptable Use and Behaviour Policy — Alim's Study Assistant" },
      {
        name: "description",
        content: "The behaviour rules for study chats and messages on Alim's Study Assistant.",
      },
      {
        property: "og:title",
        content: "Acceptable Use and Behaviour Policy — Alim's Study Assistant",
      },
      {
        property: "og:description",
        content: "Rules that apply to study chats and to messages with other users.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AcceptableUsePage,
});

function AcceptableUsePage() {
  const t = useT();
  return (
    <LegalDocumentPage
      title={t("legal.acceptableUse.title")}
      intro={t("legal.acceptableUse.intro")}
      version={LEGAL_VERSIONS.acceptable_use}
      sections={[
        {
          title: t("legal.acceptableUse.allowed.title"),
          body: t("legal.acceptableUse.allowed.body"),
        },
        {
          title: t("legal.acceptableUse.forbidden.title"),
          body: t("legal.acceptableUse.forbidden.body"),
        },
        {
          title: t("legal.acceptableUse.enforcement.title"),
          body: t("legal.acceptableUse.enforcement.body"),
        },
      ]}
    />
  );
}
