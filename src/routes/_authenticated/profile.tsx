import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { CURRENT_YEAR_ID, SCHOOL_YEARS } from "@/lib/mock/academic";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Alim's Study Assistant" },
      { name: "description", content: "Student profile, school year and academic summary." },
      { property: "og:title", content: "Profile — Alim's Study Assistant" },
      { property: "og:description", content: "Student profile and academic summary." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const year = SCHOOL_YEARS.find((y) => y.id === CURRENT_YEAR_ID)!;
  return (
    <AppShell>
      <PageHeading title="Profile" description={`${year.label} · ${year.gradeLevel}`} />
      <div className="app-card max-w-2xl p-5">
        <dl className="divide-y divide-border">
          {[
            ["Name", "Alim"],
            ["School", "Swiss Gymnasium"],
            ["Grade level", year.gradeLevel],
            ["School-year average", year.average.toFixed(1)],
            ["Assessments recorded", String(year.assessments)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-[14.5px] text-muted-foreground">{label}</dt>
              <dd className="tabular text-[15px] font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </AppShell>
  );
}
