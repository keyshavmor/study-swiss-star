import { Lock, TriangleAlert, Upload } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { LockedBadge } from "@/components/app/Badges";
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
import { isFailing } from "@/lib/mock/grades";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ExtractedRow {
  id: string;
  subject: string;
  grade: string;
  date: string;
  semester: string;
  year: string;
  confidence: "High" | "Medium" | "Low";
}

const EXTRACTED: ExtractedRow[] = [
  {
    id: "x1",
    subject: "Mathematics",
    grade: "5.0",
    date: "18 September 2025",
    semester: "Semester 1",
    year: "2025–26",
    confidence: "High",
  },
  {
    id: "x2",
    subject: "French",
    grade: "3.5",
    date: "2 October 2025",
    semester: "Semester 1",
    year: "2025–26",
    confidence: "Medium",
  },
  {
    id: "x3",
    subject: "History",
    grade: "4.5",
    date: "21 November 2025",
    semester: "Semester 1",
    year: "2025–26",
    confidence: "Low",
  },
];

/**
 * Prototype transcript import: Upload → Review extracted grades → Correct
 * uncertain values → Confirm → grades become permanent read-only records.
 */
export function TranscriptImportDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "review" | "done">("upload");
  const [rows, setRows] = useState<ExtractedRow[]>(EXTRACTED);
  const [confirmed, setConfirmed] = useState(false);

  function reset() {
    setStep("upload");
    setRows(EXTRACTED);
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
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>
            {step === "upload"
              ? "Upload transcript"
              : step === "review"
                ? "Review extracted grades"
                : "Import complete"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload"
              ? "Prototype only — no file is uploaded or parsed."
              : step === "review"
                ? "Correct uncertain values now. After confirmation they can no longer be changed."
                : "These grades are now permanent academic records."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="rounded-[18px] border border-dashed border-border-strong bg-surface-2 p-8 text-center">
            <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-3 text-[14.5px] font-medium">Drop a transcript PDF or photo here</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              A sample transcript is used in this prototype.
            </p>
          </div>
        )}

        {step !== "upload" && (
          <div className="space-y-2.5">
            {rows.map((row) => (
              <div key={row.id} className="rounded-[16px] bg-surface-2 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[14.5px] font-medium">{row.subject}</p>
                  <span className="text-[12px] text-muted-foreground">
                    Extraction confidence: {row.confidence}
                  </span>
                </div>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                  {row.date} · {row.semester} · {row.year}
                </p>
                <div className="mt-2.5 flex items-center gap-3">
                  {step === "review" ? (
                    <>
                      <Input
                        aria-label={`${row.subject} grade`}
                        value={row.grade}
                        inputMode="decimal"
                        className="h-10 w-24"
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.id === row.id ? { ...r, grade: e.target.value } : r,
                            ),
                          )
                        }
                      />
                      <span className="text-[12.5px] text-muted-foreground">
                        Editable until import is confirmed
                      </span>
                    </>
                  ) : (
                    <>
                      <span
                        className={cn(
                          "tabular text-[16px] font-semibold",
                          isFailing(Number(row.grade)) && "text-warning",
                        )}
                      >
                        {row.grade}
                      </span>
                      <LockedBadge label="Locked record" />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === "review" && (
          <>
            <p className="flex items-start gap-2 rounded-[14px] bg-warning-soft p-3.5 text-[13.5px] leading-relaxed text-warning">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              After confirmation, these grades will become permanent academic records and cannot be
              changed or removed.
            </p>
            <label className="flex cursor-pointer items-start gap-3 text-[13.5px] leading-relaxed">
              <Checkbox
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
                className="mt-0.5"
              />
              I have reviewed the extracted grades and understand that they will become permanent
              records.
            </label>
          </>
        )}

        <DialogFooter>
          {step === "upload" && (
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setStep("review")}>Review Extracted Grades</Button>
            </>
          )}
          {step === "review" && (
            <>
              <Button variant="ghost" onClick={() => setStep("upload")}>
                Go Back
              </Button>
              <Button
                disabled={!confirmed}
                onClick={() => {
                  setStep("done");
                  toast.success("Transcript imported", {
                    description: "The imported grades are now locked and read-only.",
                  });
                }}
              >
                <Lock className="h-4 w-4" />
                Confirm Import
              </Button>
            </>
          )}
          {step === "done" && <Button onClick={() => setOpen(false)}>Done</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
