/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Clock, GraduationCap, Sparkle, TrendingUp } from "lucide-react";
import { AcademicYearSelector } from "@/components/app/AcademicYearSelector";
import { AppShell } from "@/components/app/AppShell";
import { DemoModeBanner } from "@/components/app/DemoMode";
import { SchoolLinksSection } from "@/components/app/SchoolLinksSection";
import { addDays, durationLabel, minutesOf, todayIso } from "@/lib/date-utils";
import { formatDate, summariseYear } from "@/lib/grade-math";
import { SCHOOL_SUBJECTS } from "@/lib/mock/subjects";
import { useAcademicYear } from "@/lib/store/academic-year";
import { occurrencesInRange, useAppData } from "@/lib/store/app-data";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — Alim's Study Assistant" },
      {
        name: "description",
        content:
          "Your daily study overview: school-year average, next exam, planned study time, activities and your own school links.",
      },
      { property: "og:title", content: "Home — Alim's Study Assistant" },
      {
        property: "og:description",
        content: "Your daily study overview: averages, next exam, study time and school links.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { assessments, events, profile } = useAppData();
  const { yearId, yearLabel } = useAcademicYear();

  const year = summariseYear(
    assessments.filter((a) => a.yearId === yearId),
    SCHOOL_SUBJECTS,
  );

  const today = todayIso();
  const upcoming = occurrencesInRange(events, today, addDays(today, 30));
  const nextExam = upcoming.find((o) => o.event.category === "School exam");
  const todayItems = upcoming.filter((o) => o.date === today);
  const studyToday = todayItems
    .filter((o) => o.event.category === "Study session")
    .reduce((sum, o) => sum + minutesOf(o.end) - minutesOf(o.start), 0);
  const nextActivity = todayItems.find((o) => o.event.category === "Extracurricular activity");
  const greetingName = profile.preferredName || profile.fullName;

  return (
    <AppShell>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[46px]">
            {greetingName ? `${greetingName}'s Study Assistant` : "Alim's Study Assistant"}
          </h1>
          <p className="mt-4 max-w-xl text-[16px] text-muted-foreground sm:text-[17px]">
            {yearLabel} · everything for your Gymnasium exams in one calm place.
          </p>
        </div>
        <AcademicYearSelector className="shrink-0" />
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <BigCard
          to="/school"
          icon={<GraduationCap className="h-7 w-7" />}
          title="School"
          description="Open your subjects, study materials, quizzes, exams and academic progress."
        />
        <BigCard
          to="/planner"
          icon={<CalendarDays className="h-7 w-7" />}
          title="Planner"
          description="Organise classes, exams, study sessions, activities, deadlines and reminders."
        />
      </div>

      <section className="mt-10">
        <h2 className="text-[15px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Today
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            icon={<TrendingUp className="h-[18px] w-[18px]" />}
            label="School-year average"
            value={year.exactYearAverage === null ? "—" : year.exactYearAverage.toFixed(2)}
          />
          <Stat
            icon={<GraduationCap className="h-[18px] w-[18px]" />}
            label="Next exam"
            value={nextExam ? `${nextExam.title} · ${formatDate(nextExam.date)}` : "None planned"}
          />
          <Stat
            icon={<Clock className="h-[18px] w-[18px]" />}
            label="Study time today"
            value={
              studyToday === 0
                ? "Nothing planned"
                : durationLabel(
                    "00:00",
                    `${String(Math.floor(studyToday / 60)).padStart(2, "0")}:${String(studyToday % 60).padStart(2, "0")}`,
                  )
            }
          />
          <Stat
            icon={<Sparkle className="h-[18px] w-[18px]" />}
            label="Activity"
            value={nextActivity ? `${nextActivity.title} · ${nextActivity.start}` : "None today"}
          />
        </div>

        {todayItems.length > 0 && (
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {todayItems.slice(0, 6).map((o) => (
              <li
                key={`${o.event.id}-${o.originalDate}`}
                className="app-card flex items-baseline justify-between gap-3 p-3.5"
              >
                <span className="min-w-0 truncate text-[14.5px] font-medium">{o.title}</span>
                <span className="tabular shrink-0 text-[13px] text-muted-foreground">
                  {o.start}–{o.end}
                </span>
              </li>
            ))}
          </ul>
        )}

        <DemoModeBanner className="mt-5" />
      </section>

      <SchoolLinksSection className="mt-12" />
    </AppShell>
  );
}

function BigCard({
  to,
  icon,
  title,
  description,
}: {
  to: "/school" | "/planner";
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link to={to} className="landing-card group flex flex-col gap-5 p-8 sm:p-10">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <h2 className="text-[26px] font-semibold tracking-tight sm:text-[30px]">{title}</h2>
        <p className="mt-2 max-w-sm text-[15.5px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <span className="mt-2 inline-flex items-center gap-2 text-[15px] font-medium text-primary">
        Open {title}
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="app-card flex items-start gap-3 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <p className="tabular mt-0.5 text-[15.5px] font-semibold">{value}</p>
      </div>
    </div>
  );
}
