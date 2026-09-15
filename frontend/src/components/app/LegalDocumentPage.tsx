/** Shared polished card layout for the four public legal documents. */
import { Link } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useT } from "@/lib/i18n";

export interface LegalDocumentSection {
  title: string;
  body: string;
}

export interface LegalDocumentPageProps {
  title: string;
  intro: string;
  sections: LegalDocumentSection[];
  version: string;
}

export function LegalDocumentPage({ title, intro, sections, version }: LegalDocumentPageProps) {
  const t = useT();

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-12">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[720px]">
        <div className="mb-6">
          <Link
            to="/"
            className="text-[13px] font-semibold text-primary hover:text-primary-hover"
          >
            {t("legal.backHome")}
          </Link>
        </div>

        <div className="app-card p-7">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <ScrollText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-[26px] font-bold tracking-[-0.02em] text-foreground">{title}</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {t("legal.version", { version })}
              </p>
            </div>
          </div>

          <p className="mb-6 text-[15px] leading-relaxed text-muted-foreground">{intro}</p>

          <div className="space-y-6">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="mb-2 text-[16px] font-semibold text-foreground">{section.title}</h2>
                <p className="text-[14.5px] leading-relaxed text-muted-foreground">{section.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-border bg-surface-2 px-4 py-3">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {t("legal.baselineNote")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
