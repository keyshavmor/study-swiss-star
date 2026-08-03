import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Info, Upload } from "lucide-react";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { StatsOverviewPanel } from "@/components/app/StatsOverviewPanel";
import { SubjectGrid } from "@/components/app/SubjectCard";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SCHOOL_YEARS, SUBJECTS_MISSING_GRADES, CURRENT_YEAR_ID } from "@/lib/mock/academic";
import { SUBJECTS } from "@/lib/mock/subjects";

export const Route = createFileRoute("/_authenticated/school/")({
  head: () => ({
    meta: [
      { title: "School — Alim's Study Assistant" },
      {
        name: "description",
        content: "All subjects with averages, upcoming exams, material status and academic trends.",
      },
      { property: "og:title", content: "School — Alim's Study Assistant" },
      {
        property: "og:description",
        content: "All subjects with averages, upcoming exams and material status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SchoolPage,
});

function SchoolPage() {
  const year = SCHOOL_YEARS.find((y) => y.id === CURRENT_YEAR_ID)!;

  return (
    <AppShell wide>
      <PageHeading
        title="School"
        description={`${year.label} · ${year.gradeLevel} — ${SUBJECTS.length} subjects`}
        breadcrumb={
          <span className="inline-flex items-center gap-1">
            <Link to="/home" className="hover:text-foreground">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground">School</span>
          </span>
        }
        action={
          <Button variant="secondary" className="hidden sm:inline-flex">
            <Upload className="h-4 w-4" />
            Upload transcript
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <SubjectGrid />

          <section className="app-card mt-6 p-5">
            <h2 className="text-[18px] font-semibold tracking-tight">School-year average</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Metric label="Current average" value={year.average.toFixed(1)} />
              <Metric label="Previous month" value={(year.average - year.monthlyChange).toFixed(2)} />
              <Metric label="Difference" value={`+${year.monthlyChange.toFixed(2)}`} accent />
            </div>
            <p className="mt-4 text-[14px] text-muted-foreground">
              Subjects included: {SUBJECTS.length - SUBJECTS_MISSING_GRADES.length} · Missing grades:{" "}
              {SUBJECTS_MISSING_GRADES.join(", ")}
            </p>

            <Accordion type="single" collapsible className="mt-2">
              <AccordionItem value="method" className="border-0">
                <AccordionTrigger className="text-[14.5px]">
                  How the school-year average is calculated
                </AccordionTrigger>
                <AccordionContent>
                  <ol className="list-decimal space-y-1 pl-5 text-[14.5px] text-muted-foreground">
                    <li>Calculate each subject average.</li>
                    <li>Round each subject average to the nearest 0.5.</li>
                    <li>Average the rounded subject grades.</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="formula" className="border-0">
                <AccordionTrigger className="text-[14.5px]">
                  How was this grade calculated?
                </AccordionTrigger>
                <AccordionContent>
                  <div className="rounded-[14px] bg-surface-2 p-4 text-[14.5px]">
                    <p className="font-medium">Grade = 1.0 + 5.0 × (achieved points ÷ maximum points)</p>
                    <p className="mt-2 text-muted-foreground">Minimum grade: 1.0 · Maximum grade: 6.0</p>
                    <ul className="tabular mt-2 space-y-0.5 text-muted-foreground">
                      <li>0% → 1.0</li>
                      <li>50% → 3.5</li>
                      <li>80% → 5.0</li>
                      <li>100% → 6.0</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <p className="mt-3 inline-flex items-start gap-2 text-[13px] text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              Prototype figures — no calculations are performed.
            </p>
          </section>
        </div>

        <StatsOverviewPanel className="h-fit xl:sticky xl:top-24" />
      </div>
    </AppShell>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-[18px] bg-surface-2 p-4">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p
        className={`tabular mt-1 text-[26px] font-bold tracking-tight ${accent ? "text-chart-3" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
