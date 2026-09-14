/** Alim application component for study, planning, profile, or navigation workflows. */
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
import { useI18n } from "@/lib/i18n/provider";
import { Textarea } from "@/components/ui/textarea";
import { CURRENT_YEAR_ID, SCHOOL_YEARS } from "@/lib/mock/academic";
import { isFailing } from "@/lib/mock/grades";
import { SUBJECTS } from "@/lib/mock/subjects";
import { gradeOf, pointsToGrade } from "@/lib/grade-math";
import { useAppData } from "@/lib/store/app-data";
import type { Assessment, AssessmentType, GradeSource } from "@/lib/store/types";
import {
  ASSESSMENT_TYPES,
  ASSESSMENT_TYPE_LABEL_KEY,
  GRADE_SOURCES,
  GRADE_SOURCE_LABEL_KEY,
} from "@/lib/store/types";
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
  const { t } = useI18n();
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
      toast.success(t("grades.toast.updatedTitle"), {
        description: t("grades.toast.editDeleteAnytime"),
      });
    } else {
      addAssessment(payload);
      toast.success(t("grades.toast.addedTitle"), {
        description: t("grades.toast.editDeleteAnytime"),
      });
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {record ? t("grades.dialog.editTitle") : t("grades.dialog.addTitle")}
          </DialogTitle>
          <DialogDescription>{t("grades.dialog.description")}</DialogDescription>
        </DialogHeader>

        {confirmDiscard ? (
          <div className="rounded-[18px] bg-surface-2 p-4">
            <p className="text-[15px] font-medium">{t("grades.dialog.discardTitle")}</p>
            <p className="mt-1 text-[13.5px] text-muted-foreground">
              {t("grades.dialog.discardDescription")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setConfirmDiscard(false)}>
                {t("grades.dialog.keepEditing")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setConfirmDiscard(false);
                  setOpen(false);
                }}
              >
                {t("grades.dialog.discardChanges")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("grades.field.subject")}>
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
              <Field label={t("grades.field.schoolYear")}>
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

            <Field label={t("grades.field.title")} htmlFor="a-title">
              <Input
                id="a-title"
                value={draft.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder={t("grades.field.titlePlaceholder")}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("grades.field.type")}>
                <Select value={draft.type} onValueChange={(v) => set("type", v as AssessmentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSESSMENT_TYPES.map((assessmentType) => (
                      <SelectItem key={assessmentType} value={assessmentType}>
                        {t(ASSESSMENT_TYPE_LABEL_KEY[assessmentType])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("grades.field.topic")} htmlFor="a-topic">
                <Input
                  id="a-topic"
                  value={draft.topic}
                  onChange={(e) => set("topic", e.target.value)}
                  placeholder={t("grades.field.topicPlaceholder")}
                />
              </Field>
              <Field label={t("grades.field.date")} htmlFor="a-date">
                <Input
                  id="a-date"
                  type="date"
                  value={draft.date}
                  onChange={(e) => set("date", e.target.value)}
                />
              </Field>
              <Field label={t("grades.field.weight")} htmlFor="a-weight">
                <Input
                  id="a-weight"
                  inputMode="decimal"
                  value={draft.weight}
                  onChange={(e) => set("weight", e.target.value)}
                />
              </Field>
              <Field label={t("grades.field.achievedPoints")} htmlFor="a-points">
                <Input
                  id="a-points"
                  inputMode="decimal"
                  value={draft.points}
                  onChange={(e) => set("points", e.target.value)}
                  placeholder={t("grades.field.achievedPointsPlaceholder")}
                />
              </Field>
              <Field label={t("grades.field.maxPoints")} htmlFor="a-max">
                <Input
                  id="a-max"
                  inputMode="decimal"
                  value={draft.maxPoints}
                  onChange={(e) => set("maxPoints", e.target.value)}
                  placeholder={t("grades.field.maxPointsPlaceholder")}
                />
              </Field>
              <Field label={t("grades.field.teacherGrade")} htmlFor="a-teacher">
                <Input
                  id="a-teacher"
                  inputMode="decimal"
                  value={draft.teacherGrade}
                  onChange={(e) => set("teacherGrade", e.target.value)}
                  placeholder={t("grades.field.teacherGradePlaceholder")}
                />
              </Field>
              <Field label={t("grades.field.gradeSource")}>
                <Select value={draft.source} onValueChange={(v) => set("source", v as GradeSource)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_SOURCES.map((gradeSource) => (
                      <SelectItem key={gradeSource} value={gradeSource}>
                        {t(GRADE_SOURCE_LABEL_KEY[gradeSource])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label={t("grades.field.notes")} htmlFor="a-notes">
              <Textarea
                id="a-notes"
                value={draft.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder={t("grades.field.notesPlaceholder")}
              />
            </Field>

            <div className="flex items-center justify-between gap-4 rounded-[16px] bg-surface-2 p-3.5">
              <div>
                <p className="text-[14.5px] font-medium">{t("grades.includeInStats.title")}</p>
                <p className="text-[13px] text-muted-foreground">
                  {t("grades.includeInStats.description")}
                </p>
              </div>
              <Switch
                checked={draft.includeInStats}
                onCheckedChange={(v) => set("includeInStats", v)}
              />
            </div>

            <div className="rounded-[16px] bg-surface-2 p-3.5">
              <p className="text-[13px] text-muted-foreground">{t("grades.resultingGrade")}</p>
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
              {t("common.cancel")}
            </Button>
            <Button disabled={invalid} onClick={save}>
              {record ? t("grades.saveChanges") : t("grades.addTestButton")}
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
