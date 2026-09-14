/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { PageNav } from "@/components/app/Breadcrumbs";
import { useI18n } from "@/lib/i18n/provider";
import { LANGUAGES } from "@/lib/i18n/languages";
import type { LanguageCode } from "@/lib/i18n/languages";
import type { TranslationKey } from "@/lib/i18n/messages";

export const Route = createFileRoute("/_authenticated/help")({
  head: () => ({
    meta: [
      { title: "Help — Alim's Study Assistant" },
      {
        name: "description",
        content: "How study material, grades and study plans work in Alim's Study Assistant.",
      },
      { property: "og:title", content: "Help — Alim's Study Assistant" },
      { property: "og:description", content: "Guides for materials, grades and study plans." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HelpPage,
});

/** Static A4 guides in `public/help-guides`, with their verified page counts. */
const GUIDE_PAGES: Record<LanguageCode, number> = {
  en: 13,
  de: 14,
  ru: 15,
  es: 14,
  fr: 14,
};

const TOPICS: ReadonlyArray<{ title: TranslationKey; body: TranslationKey }> = [
  { title: "help.topic.indexing.title", body: "help.topic.indexing.body" },
  { title: "help.topic.grading.title", body: "help.topic.grading.body" },
  { title: "help.topic.plans.title", body: "help.topic.plans.body" },
  { title: "help.topic.calendar.title", body: "help.topic.calendar.body" },
  { title: "help.topic.language.title", body: "help.topic.language.body" },
  { title: "help.topic.audio.title", body: "help.topic.audio.body" },
];

function HelpPage() {
  const { t } = useI18n();

  return (
    <AppShell>
      <PageNav
        back={{ to: "/home", label: t("help.crumbHome") }}
        crumbs={[{ label: t("help.crumbHome"), to: "/home" }, { label: t("help.crumb") }]}
      />
      <PageHeading title={t("help.title")} description={t("help.description")} />

      <div className="grid gap-4 sm:grid-cols-2">
        {TOPICS.map((topic) => (
          <article key={topic.title} className="app-card p-5">
            <h2 className="text-[17px] font-semibold tracking-tight">{t(topic.title)}</h2>
            <p className="mt-2 text-[14.5px] text-muted-foreground">{t(topic.body)}</p>
          </article>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="text-[19px] font-semibold tracking-tight">{t("help.guides.title")}</h2>
        <p className="mt-1.5 max-w-2xl text-[14.5px] text-muted-foreground">
          {t("help.guides.description")}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LANGUAGES.map((entry) => (
            <a
              key={entry.code}
              href={`/help-guides/alim-user-guide-${entry.code}.pdf`}
              target="_blank"
              rel="noreferrer"
              className="app-card flex items-center gap-3.5 p-4 transition-colors hover:bg-hover"
            >
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-[20px]"
              >
                {entry.flag}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{entry.nativeName}</span>
                <span className="block text-[13px] text-muted-foreground">
                  {t("help.guides.meta", { pages: GUIDE_PAGES[entry.code] })}
                </span>
              </span>
              <FileText className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
              <span className="sr-only">{t("help.guides.open")}</span>
            </a>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
