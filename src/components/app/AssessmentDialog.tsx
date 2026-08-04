import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CURRENT_YEAR_ID, SCHOOL_YEARS } from "@/lib/mock/academic";
import { isFailing } from "@/lib/mock/grades";
import { SUBJECTS } from "@/lib/mock/subjects";
import { gradeOf, pointsToGrade } from "@/lib/grade-math";
import { useAppData } from "@/lib/store/app-data";
import type { Assessment, AssessmentType, GradeSource } from "@/lib/store/types";
import { ASSESSMENT_TYPES, GRADE_SOURCES } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Draft {
  subjectSlug: string;
  title: string;
  type: AssessmentType;
  topic: string;
  date: string;
  yearId: string;
  points: string;
  maxPoints: string;
  teacherGrade: string;
  weight: string;
  notes: string;
  source: GradeSource;
  includeInStats: boolean;
}

function toDraft(record: Assessment | undefined, subjectSlug: string | undefined): Draft {
  if (record) {
    return {
      subjectSlug: record.subjectSlug,
      title: record.title,
      type: record.type,
      topic: record.topic,
      date: record.date,
      yearId: record.yearId,
      points: record.points === null ? "" : String(record.points),
      maxPoints: record.maxPoints === null ? "" : String(record.maxPoints),
      teacherGrade: record.teacherGrade === null ? "" : String(record.teacherGrade),
      weight: String(record.weight),
      notes: record.notes,
      source: record.source,
      includeInStats: record.includeInStats,
    };
  }
  return {
    subjectSlug: subjectSlug ?? SUBJECTS[0]!.slug,
    title: "",
    type: "Written exam",
    topic: "",
    date: new Date().toISOString().slice(0, 10),
    yearId: CURRENT_YEAR_ID,
    points: "",
    maxPoints: "",
    teacherGrade: "",
    weight: "1",
    notes: "",
    source: "Calculated from points",
    includeInStats: true,
  };
}

/**
 * Add or edit a test. Every field stays editable after saving — records are
 * never locked.
 */
export function AssessmentDialog({
  trigger,
  subjectSlug,
  record,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: ReactNode;
  subjectSlug?: string;
  record?: Assessment;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { addAssessment, updateAssessment } = useAppData();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const [draft, setDraft] = useState<Draft>(() => toDraft(record, subjectSlug));
  const [initial, setInitial] = useState<Draft>(draft);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    if (open) {
      const next = toDraft(record, subjectSlug);
      setDraft(next);
      setInitial(next);
      setConfirmDiscard(false);
    }
  }, [open, record, subjectSlug]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const points = draft.points === "" ? null : Number(draft.points);
  const maxPoints = draft.maxPoints === "" ? null : Number(draft.maxPoints);
  const teacherGrade = draft.teacherGrade === "" ? null : Number(draft.teacherGrade);
  const preview = teacherGrade ?? pointsToGrade(points, maxPoints);

  const invalid =
    draft.title.trim() === "" ||
    draft.date === "" ||
    (teacherGrade === null && (points === null || maxPoints === null || maxPoints <= 0)) ||
    (teacherGrade !== null && (teacherGrade < 1 || teacherGrade > 6));

  function requestClose(next: boolean) {
    if (!next && dirty) {
      setConfirmDiscard(true);
      return;
    }
    setOpen(next);
  }

  function save() {
    const payload: Omit<Assessment, "id"> = {
      subjectSlug: draft.subjectSlug,
      title: draft.title.trim(),
      type: draft.type,
      topic: draft.topic.trim(),
      date: draft.date,
      yearId: draft.yearId,
      points,
      maxPoints,
      teacherGrade,
      weight: Number(draft.weight) || 1,
      notes: draft.notes.trim(),
      source: draft.source,
      includeInStats: draft.includeInStats,
    };
    if (record) {
      updateAssessment(record.id, payload);
      toast.success("Test updated", { description: "You can edit or delete it again at any time." });
    } else {
      addAssessment(payload);
      toast.success("Test added", { description: "You can edit or delete it again at any time." });
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{record ? "Edit test" : "Add test"}</DialogTitle>
          <DialogDescription>
            All details can be changed later — nothing you add here becomes permanent.
          </DialogDescription>
        </DialogHeader>

        {confirmDiscard ? (
          <div className="rounded-[18px] bg-surface-2 p-4">
            <p className="text-[15px] font-medium">Discard your changes?</p>
            <p className="mt-1 text-[13.5px] text-muted-foreground">
              You have unsaved changes to this test.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setConfirmDiscard(false)}>
                Keep editing
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setConfirmDiscard(false);
                  setOpen(false);
                }}
              >
                Discard changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Subject">
                <Select value={draft.subjectSlug} onValueChange={(v) => set("subjectSlug", v)}>
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
              </Field>
              <Field label="School year">
                <Select value={draft.yearId} onValueChange={(v) => set("yearId", v)}>
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
              </Field>
            </div>

            <Field label="Title" htmlFor="a-title">
              <Input
                id="a-title"
                value={draft.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Cell biology test"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type">
                <Select
                  value={draft.type}
                  onValueChange={(v) => set("type", v as AssessmentType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSESSMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Topic (optional)" htmlFor="a-topic">
                <Input
                  id="a-topic"
                  value={draft.topic}
                  onChange={(e) => set("topic", e.target.value)}
                  placeholder="Mitosis"
                />
              </Field>
              <Field label="Date" htmlFor="a-date">
                <Input
                  id="a-date"
                  type="date"
                  value={draft.date}
                  onChange={(e) => set("date", e.target.value)}
                />
              </Field>
              <Field label="Weight" htmlFor="a-weight">
                <Input
                  id="a-weight"
                  inputMode="decimal"
                  value={draft.weight}
                  onChange={(e) => set("weight", e.target.value)}
                />
              </Field>
              <Field label="Achieved points" htmlFor="a-points">
                <Input
                  id="a-points"
                  inputMode="decimal"
                  value={draft.points}
                  onChange={(e) => set("points", e.target.value)}
                  placeholder="42"
                />
              </Field>
              <Field label="Maximum points" htmlFor="a-max">
                <Input
                  id="a-max"
                  inputMode="decimal"
                  value={draft.maxPoints}
                  onChange={(e) => set("maxPoints", e.target.value)}
                  placeholder="50"
                />
              </Field>
              <Field label="Teacher grade (optional)" htmlFor="a-teacher">
                <Input
                  id="a-teacher"
                  inputMode="decimal"
                  value={draft.teacherGrade}
                  onChange={(e) => set("teacherGrade", e.target.value)}
                  placeholder="5.2"
                />
              </Field>
              <Field label="Grade source">
                <Select
                  value={draft.source}
                  onValueChange={(v) => set("source", v as GradeSource)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Notes (optional)" htmlFor="a-notes">
              <Textarea
                id="a-notes"
                value={draft.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="What to review before the next test…"
              />
            </Field>

            <div className="flex items-center justify-between gap-4 rounded-[16px] bg-surface-2 p-3.5">
              <div>
                <p className="text-[14.5px] font-medium">Include in statistics</p>
                <p className="text-[13px] text-muted-foreground">
                  Turn off to keep the record without affecting averages.
                </p>
              </div>
              <Switch
                checked={draft.includeInStats}
                onCheckedChange={(v) => set("includeInStats", v)}
              />
            </div>

            <div className="rounded-[16px] bg-surface-2 p-3.5">
              <p className="text-[13px] text-muted-foreground">Resulting grade</p>
              <p
                className={cn(
                  "tabular text-[22px] font-semibold",
                  isFailing(preview) && "text-warning",
                )}
              >
                {preview === null ? "—" : preview.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {!confirmDiscard && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => requestClose(false)}>
              Cancel
            </Button>
            <Button disabled={invalid} onClick={save}>
              {record ? "Save changes" : "Add test"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export { gradeOf };
