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
import { formatLongDate } from "@/lib/date-utils";
import { summariseYear } from "@/lib/grade-math";
import { SCHOOL_SUBJECTS } from "@/lib/mock/subjects";
import { useAcademicYear } from "@/lib/store/academic-year";
import { useAppData } from "@/lib/store/app-data";
import { avatarSignedUrl, fetchAccountProfile, type AccountProfile } from "@/lib/account-data";
import { supabase } from "@/integrations/supabase/client";

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
  const displayName = account?.fullName || profile.fullName || "Your profile";
  const avatarSrc = accountAvatar || profile.photo;
  const notSet = (value: string) => (value.trim() ? value : "Not set");

  return (
    <AppShell>
      <PageNav
        back={{ to: "/home", label: "Home" }}
        crumbs={[{ label: "Home", to: "/home" }, { label: "Profile" }]}
      />
      <PageHeading
        title="Profile"
        description="Your details, school information and academic summary. Everything here is editable."
        action={
          <EditProfileDialog
            trigger={
              <Button>
                <Pencil className="h-4 w-4" />
                Edit Profile
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
                  {profile.className ? `Class ${profile.className} · ${yearLabel}` : yearLabel}
                </p>
                {profile.schoolName && (
                  <p className="text-[14px] text-muted-foreground">{profile.schoolName}</p>
                )}
              </div>
            </div>
          </section>

          <Section title="Personal information">
            <Row label="Full name" value={notSet(account?.fullName || profile.fullName)} />
            <Row
              label="Preferred name"
              value={notSet(account?.preferredName || profile.preferredName)}
            />
            <Row label="Nationality" value={notSet(account?.nationality ?? "")} />
            <Row label="Contact phone" value={notSet(account?.contactPhone ?? "")} />
            <Row label="Address" value={notSet(account?.contactDetails["address"] ?? "")} />
            <Row
              label="Date of birth"
              value={profile.dateOfBirth ? formatLongDate(profile.dateOfBirth) : "Not set"}
            />
            <Row label="Interface language" value={notSet(profile.language)} />
          </Section>

          <Section title="School information">
            <Row label="School" value={notSet(profile.schoolName)} />
            <Row label="School type" value={notSet(profile.schoolType)} />
            <Row label="Academic year" value={year.label} />
            <Row label="Grade level" value={year.gradeLevel} />
            <Row label="Class" value={notSet(profile.className)} />
            <Row label="Class teacher" value={notSet(profile.classTeacher)} />
            <Row label="Focus subject" value={notSet(profile.focusSubject)} />
          </Section>

          <Section title="Account">
            <Row label="Sign-in email" value={notSet(accountEmail)} />
            <Row label="School email" value={notSet(profile.schoolEmail)} />
            <Row label="Student number" value={notSet(profile.studentNumber)} />
            <Row label="Username" value={notSet(account?.username || profile.username)} />
          </Section>
        </div>

        <aside className="flex h-fit flex-col gap-5 lg:sticky lg:top-24">
          <Section title={`Academic summary · ${year.label}`}>
            <Row
              label="Year average"
              value={summary.exactYearAverage === null ? "—" : summary.exactYearAverage.toFixed(2)}
            />
            <Row
              label="Rounded average"
              value={
                summary.roundedYearAverage === null ? "—" : summary.roundedYearAverage.toFixed(1)
              }
            />
            <Row label="Assessments recorded" value={String(yearAssessments.length)} />
            <Row label="Subjects with grades" value={String(summary.subjectAverages.length)} />
          </Section>

          <Section title="Your content">
            <Row label="Planner items" value={String(events.length)} />
            <Row label="Materials" value={String(materials.length)} />
            <Row label="School links" value={String(links.length)} />
          </Section>

          <div className="app-card p-5">
            <h2 className="text-[17px] font-semibold tracking-tight">Where this is stored</h2>
            <p className="mt-2 text-[14px] text-muted-foreground">
              Your account details, picture and contact information are saved to your account. Grades,
              planner items and materials are still kept in this browser only.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Account data</Badge>
              <Badge variant="secondary">Local prototype data</Badge>
            </div>
            <Link
              to="/settings"
              className="mt-4 inline-flex text-[14px] font-semibold text-primary hover:text-primary-hover"
            >
              Manage account settings
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
