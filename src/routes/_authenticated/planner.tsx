import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({
    meta: [
      { title: "Planner — Alim's Study Assistant" },
      { name: "description", content: "Plan upcoming exams, deadlines and revision blocks." },
      { property: "og:title", content: "Planner — Alim's Study Assistant" },
      { property: "og:description", content: "Plan upcoming exams, deadlines and revision blocks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlannerPage,
});

function PlannerPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24">
        <h1 className="text-[30px] font-bold tracking-[-0.02em] sm:text-[36px]">Planner</h1>
        <p className="mt-3 max-w-lg text-[16px] text-muted-foreground">
          Your upcoming exams and revision blocks will appear here.
        </p>

        <section className="app-card mt-10 flex flex-col items-center justify-center px-8 py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-hover text-primary">
            <CalendarDays className="h-7 w-7" />
          </span>
          <h2 className="mt-6 text-[19px] font-semibold">Nothing planned yet</h2>
          <p className="mt-2 max-w-sm text-[15px] text-muted-foreground">
            Start a study session and the assistant can help you turn a syllabus into a revision plan.
          </p>
          <Button asChild className="mt-8">
            <Link to="/chat">Open School</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
