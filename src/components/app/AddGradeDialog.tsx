import { Lock, TriangleAlert } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENT_YEAR_ID, SCHOOL_YEARS } from "@/lib/mock/academic";
import { isFailing } from "@/lib/mock/grades";
import { SUBJECTS } from "@/lib/mock/subjects";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TYPES = [
  "Written exam",
  "Oral exam",
  "Presentation",
  "Essay",
  "Laboratory work",
  "Practical assessment",
  "Project",
];

function swissGrade(points: number, maxPoints: number) {
  if (!maxPoints) return null;
  const raw = 1 + 5 * (points / maxPoints);
  return Math.min(6, Math.max(1, raw));
}

function ReviewRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-[13.5px] text-muted-foreground">{label}</span>
      <span className="tabular text-[14px] font-medium">{value}</span>
    </div>
  );
}

/**
 * Prototype grade entry: Enter → Review → Confirm permanent record → Save.
 * Nothing is stored; the flow demonstrates the permanence rules only.
 */
export function AddGradeDialog({
  trigger,
  subjectSlug,
}: {
  trigger: ReactNode;
  subjectSlug?: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"enter" | "review">("enter");
  const [confirmed, setConfirmed] = useState(false);
  const [subject, setSubject] = useState(subjectSlug ?? SUBJECTS[0]!.slug);
  const [title, setTitle] = useState("");
  const [type, setType] = useState(TYPES[0]!);
  const [date, setDate] = useState("2026-08-04");
  const [points, setPoints] = useState("42");
  const [maxPoints, setMaxPoints] = useState("50");
  const [teacherGrade, setTeacherGrade] = useState("");
  const [yearId, setYearId] = useState(CURRENT_YEAR_ID);

  const subjectName = SUBJECTS.find((s) => s.slug === subject)?.name ?? "—";
  const p = Number(points);
  const mp = Number(maxPoints);
  const percentage = mp > 0 ? Math.round((p / mp) * 100) : null;
  const calculated = swissGrade(p, mp);
  const parsedDate = date ? new Date(date) : null;
  const monthYear = parsedDate
    ? new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(parsedDate)
    : "—";
  const prettyDate = parsedDate
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(
        parsedDate,
      )
    : "—";
  const year = SCHOOL_YEARS.find((y) => y.id === yearId);

  function reset() {
    setStep("enter");
    setConfirmed(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{step === "enter" ? "Enter assessment" : "Review assessment"}</DialogTitle>
          <DialogDescription>
            {step === "enter"
              ? "Step 1 of 2 — enter the assessment details."
              : "Step 2 of 2 — confirm the permanent record."}
          </DialogDescription>
        </DialogHeader>

        {step === "enter" ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s.slug} value={s.slug}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="grade-title">Assessment title</Label>
              <Input
                id="grade-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Cell biology test"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Assessment type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="grade-date">Test date</Label>
                <Input
                  id="grade-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="grade-points">Achieved points</Label>
                <Input
                  id="grade-points"
                  inputMode="numeric"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="grade-max">Maximum points</Label>
                <Input
                  id="grade-max"
                  inputMode="numeric"
                  value={maxPoints}
                  onChange={(e) => setMaxPoints(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="grade-teacher">Teacher-entered grade (optional)</Label>
                <Input
                  id="grade-teacher"
                  inputMode="decimal"
                  value={teacherGrade}
                  onChange={(e) => setTeacherGrade(e.target.value)}
                  placeholder="5.2"
                />
              </div>
              <div className="grid gap-2">
                <Label>School year</Label>
                <Select value={yearId} onValueChange={setYearId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHOOL_YEARS.map((y) => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="rounded-[18px] bg-surface-2 p-4">
              <ReviewRow label="Subject" value={subjectName} />
              <ReviewRow label="Assessment title" value={title || "Untitled assessment"} />
              <ReviewRow label="Assessment type" value={type} />
              <ReviewRow label="Test date" value={prettyDate} />
              <ReviewRow label="Month and year" value={monthYear} />
              <ReviewRow label="Achieved points" value={Number.isFinite(p) ? p : "—"} />
              <ReviewRow label="Maximum points" value={Number.isFinite(mp) ? mp : "—"} />
              <ReviewRow label="Percentage" value={percentage === null ? "—" : `${percentage}%`} />
              <ReviewRow
                label="Calculated Swiss grade"
                value={
                  calculated === null ? (
                    "—"
                  ) : (
                    <span className={cn(isFailing(calculated) && "text-warning")}>
                      {calculated.toFixed(2)}
                    </span>
                  )
                }
              />
              <ReviewRow label="Teacher-entered grade" value={teacherGrade || "Not provided"} />
              <ReviewRow label="School year" value={year?.label ?? "—"} />
              <ReviewRow
                label="Grade source"
                value={teacherGrade ? "Teacher grade" : "Calculated from points"}
              />
            </div>

            <p className="flex items-start gap-2 rounded-[14px] bg-warning-soft p-3.5 text-[13.5px] leading-relaxed text-warning">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              Review this information carefully. Once saved as a recorded test, this assessment
              cannot be edited or deleted.
            </p>

            <label className="flex cursor-pointer items-start gap-3 text-[13.5px] leading-relaxed">
              <Checkbox
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
                className="mt-0.5"
              />
              I have reviewed the assessment and understand that the saved test will become a
              permanent record.
            </label>
          </div>
        )}

        <DialogFooter>
          {step === "enter" ? (
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setStep("review")}>Review Assessment</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep("enter")}>
                Go Back
              </Button>
              <Button
                disabled={!confirmed}
                onClick={() => {
                  setOpen(false);
                  reset();
                  toast.success("Saved as a permanent recorded test", {
                    description: "Prototype only — the record is now locked and read-only.",
                  });
                }}
              >
                <Lock className="h-4 w-4" />
                Save Permanent Test
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
