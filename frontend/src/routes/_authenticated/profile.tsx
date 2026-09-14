/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, User } from "lucide-react";
import { useEffect, useState } from "react";
import { AcademicYearSelector } from "@/components/app/AcademicYearSelector";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { PageNav } from "@/components/app/Breadcrumbs";
import { EditProfileDialog } from "@/components/app/EditProfileDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { summariseYear } from "@/lib/grade-math";
import { SCHOOL_SUBJECTS } from "@/lib/mock/subjects";
import { useAcademicYear } from "@/lib/store/academic-year";
import { useAppData } from "@/lib/store/app-data";
import { avatarSignedUrl, fetchAccountProfile, type AccountProfile } from "@/lib/account-data";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n/provider";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Alim's Study Assistant" },
      {
        name: "description",
        content:
          "Student profile: personal details, school information, academic summary and app preferences.",
      },
      { property: "og:title", content: "Profile — Alim's Study Assistant" },
      {
        property: "og:description",
        content: "Personal details, school information and academic summary.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t, formatDate } = useI18n();
  const { profile, assessments, events, materials, links } = useAppData();
  const { yearId, year, yearLabel } = useAcademicYear();
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [accountAvatar, setAccountAvatar] = useState("");
  const [accountEmail, setAccountEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [{ data: userData }, loaded] = await Promise.all([
          supabase.auth.getUser(),
          fetchAccountProfile(),
        ]);
        if (cancelled) return;
        setAccountEmail(userData.user?.email ?? "");
        setAccount(loaded);
        if (loaded?.photoPath) {
          const url = await avatarSignedUrl(loaded.photoPath);
          if (!cancelled) setAccountAvatar(url);
        }
      } catch {
        // Account details stay empty; the local prototype details still render.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = summariseYear(
    assessments.filter((a) => a.yearId === yearId),
    SCHOOL_SUBJECTS,
  );
  const yearAssessments = assessments.filter((a) => a.yearId === yearId);
  const displayName = account?.fullName || profile.fullName || t("profile.page.title");
  const avatarSrc = accountAvatar || profile.photo;
  const notSet = (value: string) => (value.trim() ? value : t("profile.notSet"));

  return (
    <AppShell>
      <PageNav
        back={{ to: "/home", label: t("nav.home") }}
        crumbs={[{ label: t("nav.home"), to: "/home" }, { label: t("nav.profile") }]}
      />
      <PageHeading
        title={t("profile.page.title")}
        description={t("profile.page.description")}
        action={
          <EditProfileDialog
            trigger={
              <Button>
                <Pencil className="h-4 w-4" />
                {t("profile.editButton")}
              </Button>
            }
          />
        }
      />

      <div className="mb-6">
        <AcademicYearSelector />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-5">
          <section className="app-card p-6">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
              <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-surface-2 text-muted-foreground">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-8 w-8" />
                )}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-[24px] font-semibold tracking-tight">{displayName}</h2>
                <p className="mt-1 text-[14.5px] text-muted-foreground">
                  {profile.className
                    ? t("profile.className", { className: profile.className, year: yearLabel })
                    : yearLabel}
                </p>
                {profile.schoolName && (
                  <p className="text-[14px] text-muted-foreground">{profile.schoolName}</p>
                )}
              </div>
            </div>
          </section>

          <Section title={t("profile.personal.title")}>
            <Row
              label={t("profile.personal.fullName")}
              value={notSet(account?.fullName || profile.fullName)}
            />
            <Row
              label={t("profile.personal.preferredName")}
              value={notSet(account?.preferredName || profile.preferredName)}
            />
            <Row
              label={t("profile.personal.nationality")}
              value={notSet(account?.nationality ?? "")}
            />
            <Row
              label={t("profile.personal.contactPhone")}
              value={notSet(account?.contactPhone ?? "")}
            />
            <Row
              label={t("profile.personal.address")}
              value={notSet(account?.contactDetails["address"] ?? "")}
            />
            <Row
              label={t("profile.personal.dateOfBirth")}
              value={profile.dateOfBirth ? formatDate(profile.dateOfBirth) : t("profile.notSet")}
            />
            <Row label={t("profile.personal.interfaceLanguage")} value={notSet(profile.language)} />
          </Section>

          <Section title={t("profile.school.title")}>
            <Row label={t("profile.school.name")} value={notSet(profile.schoolName)} />
            <Row label={t("profile.school.type")} value={notSet(profile.schoolType)} />
            <Row label={t("profile.school.academicYear")} value={year.label} />
            <Row label={t("profile.school.gradeLevel")} value={year.gradeLevel} />
            <Row label={t("profile.school.class")} value={notSet(profile.className)} />
            <Row label={t("profile.school.classTeacher")} value={notSet(profile.classTeacher)} />
            <Row label={t("profile.school.focusSubject")} value={notSet(profile.focusSubject)} />
          </Section>

          <Section title={t("profile.account.title")}>
            <Row label={t("profile.account.signInEmail")} value={notSet(accountEmail)} />
            <Row label={t("profile.account.schoolEmail")} value={notSet(profile.schoolEmail)} />
            <Row label={t("profile.account.studentNumber")} value={notSet(profile.studentNumber)} />
            <Row
              label={t("profile.account.username")}
              value={notSet(account?.username || profile.username)}
            />
          </Section>
        </div>

        <aside className="flex h-fit flex-col gap-5 lg:sticky lg:top-24">
          <Section title={t("profile.summary.title", { year: year.label })}>
            <Row
              label={t("profile.summary.yearAverage")}
              value={summary.exactYearAverage === null ? "—" : summary.exactYearAverage.toFixed(2)}
            />
            <Row
              label={t("profile.summary.roundedAverage")}
              value={
                summary.roundedYearAverage === null ? "—" : summary.roundedYearAverage.toFixed(1)
              }
            />
            <Row
              label={t("profile.summary.assessmentsRecorded")}
              value={String(yearAssessments.length)}
            />
            <Row
              label={t("profile.summary.subjectsWithGrades")}
              value={String(summary.subjectAverages.length)}
            />
          </Section>

          <Section title={t("profile.content.title")}>
            <Row label={t("profile.content.plannerItems")} value={String(events.length)} />
            <Row label={t("profile.content.materials")} value={String(materials.length)} />
            <Row label={t("profile.content.schoolLinks")} value={String(links.length)} />
          </Section>

          <div className="app-card p-5">
            <h2 className="text-[17px] font-semibold tracking-tight">
              {t("profile.storage.title")}
            </h2>
            <p className="mt-2 text-[14px] text-muted-foreground">{t("profile.storage.body")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{t("profile.storage.accountBadge")}</Badge>
              <Badge variant="secondary">{t("profile.storage.localBadge")}</Badge>
            </div>
            <Link
              to="/settings"
              className="mt-4 inline-flex text-[14px] font-semibold text-primary hover:text-primary-hover"
            >
              {t("profile.storage.manageLink")}
            </Link>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="app-card p-5">
      <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
      <dl className="mt-3 divide-y divide-border">{children}</dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 py-2.5">
      <dt className="text-[14.5px] text-muted-foreground">{label}</dt>
      <dd className="tabular text-right text-[15px] font-medium">{value}</dd>
    </div>
  );
}
