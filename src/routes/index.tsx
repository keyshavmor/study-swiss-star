import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, GraduationCap } from "lucide-react";
import { LiveClock } from "@/components/app/LiveClock";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alim's Study Assistant — Gymnasium exam prep" },
      {
        name: "description",
        content:
          "A calm study dashboard for Swiss Gymnasium exams: AI study sessions, subject overviews and an exam planner.",
      },
      { property: "og:title", content: "Alim's Study Assistant — Gymnasium exam prep" },
      {
        property: "og:description",
        content: "A calm study dashboard for Swiss Gymnasium exams: study sessions and exam planning.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TitleScreen,
});

function TitleScreen() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Study Assistant</span>
        </div>
        <div className="flex items-center gap-3">
          <LiveClock />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-10 sm:pt-16">
        <h1 className="max-w-3xl text-[34px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[46px] lg:text-[58px]">
          Alim's Study Assistant
        </h1>
        <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">
          Everything for your Gymnasium exams in one calm place — guided study sessions and a clear
          overview of what's coming next.
        </p>

        <div className="mt-12 grid gap-6 sm:mt-16 md:grid-cols-2">
          <LandingCard
            to="/chat"
            icon={<GraduationCap className="h-7 w-7" />}
            title="School"
            description="Study sessions per subject with an assistant that explains, quizzes and revises with you."
            action="Open School"
          />
          <LandingCard
            to="/planner"
            icon={<CalendarDays className="h-7 w-7" />}
            title="Planner"
            description="Keep upcoming exams, deadlines and revision blocks in a single simple timeline."
            action="Open Planner"
          />
        </div>
      </main>
    </div>
  );
}

function LandingCard({
  to,
  icon,
  title,
  description,
  action,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
}) {
  return (
    <Link
      to={to}
      className="landing-card group flex min-h-[200px] flex-col justify-between p-7 sm:min-h-[260px] sm:p-9 lg:min-h-[300px]"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-hover text-primary">
        {icon}
      </span>
      <div className="mt-8">
        <h2 className="text-[22px] font-semibold tracking-[-0.015em] sm:text-[26px]">{title}</h2>
        <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-muted-foreground">{description}</p>
        <span className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold text-primary">
          {action}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
