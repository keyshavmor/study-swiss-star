import { Upload } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
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
import { CURRENT_YEAR_ID } from "@/lib/mock/academic";
import { SUBJECTS } from "@/lib/mock/subjects";
import { useAppData } from "@/lib/store/app-data";
import type { Assessment } from "@/lib/store/types";
import { toast } from "sonner";

interface Row {
  key: string;
  subjectSlug: string;
  title: string;
  grade: string;
  date: string;
}

function blankRow(index: number): Row {
  return {
    key: `r${index}`,
    subjectSlug: SUBJECTS[0]!.slug,
    title: "",
    grade: "",
    date: new Date().toISOString().slice(0, 10),
  };
}

/**
 * Transcript upload prototype. Extracted rows are editable before import and
 * stay fully editable afterwards, exactly like manually added tests.
 */
export function TranscriptImportDialog({
  trigger,
  subjectSlug,
}: {
  trigger: ReactNode;
  subjectSlug?: string;
}) {
  const { addAssessment } = useAppData();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [rows, setRows] = useState<Row[]>([]);

  function reset() {
    setStep("upload");
    setRows([]);
  }

  function startReview() {
    setRows([
      { ...blankRow(1), subjectSlug: subjectSlug ?? SUBJECTS[0]!.slug },
      { ...blankRow(2), subjectSlug: subjectSlug ?? SUBJECTS[0]!.slug },
    ]);
    setStep("review");
  }

  function update(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  const valid = rows.filter((r) => r.title.trim() !== "" && r.grade.trim() !== "");

  function importRows() {
    valid.forEach((r) => {
      const payload: Omit<Assessment, "id"> = {
        subjectSlug: r.subjectSlug,
        title: r.title.trim(),
        type: "Written exam",
        topic: "",
        date: r.date,
        yearId: CURRENT_YEAR_ID,
        points: null,
        maxPoints: null,
        teacherGrade: Number(r.grade),
        weight: 1,
        notes: "",
        source: "Imported from transcript",
        includeInStats: true,
        importedFrom: "Transcript upload",
      };
      addAssessment(payload);
    });
    setOpen(false);
    reset();
    toast.success(`${valid.length} grade${valid.length === 1 ? "" : "s"} imported`, {
      description: "Imported grades can be edited or deleted like any other test.",
    });
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
            {step === "upload" ? "Upload transcript" : "Review extracted grades"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload"
              ? "Prototype only — no file is parsed. You enter the grades you want to import."
              : "Check every row. Imported grades stay editable afterwards."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" ? (
          <div className="rounded-[18px] border border-dashed border-border-strong bg-surface-2 p-8 text-center">
            <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-3 text-[14.5px] font-medium">Drop a transcript PDF or photo here</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Extraction is simulated — you confirm each grade yourself.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.key} className="grid gap-3 rounded-[16px] bg-surface-2 p-3.5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Subject</Label>
                    <Select
                      value={row.subjectSlug}
                      onValueChange={(v) => update(row.key, { subjectSlug: v })}
                    >
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
                    <Label htmlFor={`${row.key}-title`}>Assessment title</Label>
                    <Input
                      id={`${row.key}-title`}
                      value={row.title}
                      onChange={(e) => update(row.key, { title: e.target.value })}
                      placeholder="Semester test"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`${row.key}-grade`}>Grade</Label>
                    <Input
                      id={`${row.key}-grade`}
                      inputMode="decimal"
                      value={row.grade}
                      onChange={(e) => update(row.key, { grade: e.target.value })}
                      placeholder="5.0"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`${row.key}-date`}>Date</Label>
                    <Input
                      id={`${row.key}-date`}
                      type="date"
                      value={row.date}
                      onChange={(e) => update(row.key, { date: e.target.value })}
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-self-start text-destructive"
                  onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                >
                  Remove row
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRows((prev) => [...prev, blankRow(prev.length + 1)])}
            >
              Add another row
            </Button>
          </div>
        )}

        <DialogFooter>
          {step === "upload" ? (
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={startReview}>Continue</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep("upload")}>
                Go back
              </Button>
              <Button disabled={valid.length === 0} onClick={importRows}>
                Import {valid.length || ""} grade{valid.length === 1 ? "" : "s"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
