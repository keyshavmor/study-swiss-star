import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Clock, GraduationCap, Sparkle, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { DAILY_OVERVIEW } from "@/lib/mock/planner";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — Alim's Study Assistant" },
      {
        name: "description",
        content: "Your daily study overview: averages, next exam, planned study time and activities.",
      },
      { property: "og:title", content: "Home — Alim's Study Assistant" },
      {
        property: "og:description",
        content: "Your daily study overview: averages, next exam and planned study time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <AppShell>
      <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[46px]">
        Alim's Study Assistant
      </h1>
      <p className="mt-4 max-w-xl text-[16px] text-muted-foreground sm:text-[17px]">
        Everything for your Gymnasium exams in one calm place.
      </p>

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
          description="Organise exams, study sessions, activities, deadlines and reminders."
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
            value={DAILY_OVERVIEW.yearAverage.toFixed(1)}
          />
          <Stat
            icon={<GraduationCap className="h-[18px] w-[18px]" />}
            label="Next exam"
            value={DAILY_OVERVIEW.nextExam}
          />
          <Stat
            icon={<Clock className="h-[18px] w-[18px]" />}
            label="Study time today"
            value={DAILY_OVERVIEW.studyTimeToday}
          />
          <Stat
            icon={<Sparkle className="h-[18px] w-[18px]" />}
            label="Activity"
            value={DAILY_OVERVIEW.nextActivity}
          />
        </div>
      </section>
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

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
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
