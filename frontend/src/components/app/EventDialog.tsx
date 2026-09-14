/** Alim application component for study, planning, profile, or navigation workflows. */
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
import { Textarea } from "@/components/ui/textarea";
import {
  WEEKDAY_INITIAL,
  WEEKDAY_LONG,
  todayIso,
  weekdayIndex,
  weekdayName,
} from "@/lib/date-utils";
import { SUBJECTS } from "@/lib/mock/subjects";
import { useAppData } from "@/lib/store/app-data";
import type { EventCategory, PlannerEvent, Recurrence } from "@/lib/store/types";
import {
  CATEGORY_COLOR,
  EVENT_CATEGORIES,
  EVENT_CATEGORY_LABEL_KEY,
  LINK_ACCENTS,
  RECURRENCE_LABEL_KEY,
  REMINDER_LABEL_KEY,
  REMINDER_OPTIONS,
} from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import { toast } from "sonner";

const NO_SUBJECT = "__none";

export type EditScope = "only" | "future" | "series";

interface Draft {
  title: string;
  category: EventCategory;
  date: string;
  start: string;
  end: string;
  subjectSlug: string;
  location: string;
  travelBefore: string;
  travelAfter: string;
  recurrence: Recurrence;
  weekdays: number[];
  until: string;
  reminder: string;
  color: string;
  notes: string;
}

function toDraft(record: PlannerEvent | undefined, defaults: Partial<Draft>): Draft {
  const date = record?.date ?? defaults.date ?? todayIso();
  return {
    title: record?.title ?? defaults.title ?? "",
    category: record?.category ?? defaults.category ?? "Study session",
    date,
    start: record?.start ?? defaults.start ?? "16:00",
    end: record?.end ?? defaults.end ?? "17:00",
    subjectSlug: record?.subjectSlug ?? defaults.subjectSlug ?? NO_SUBJECT,
    location: record?.location ?? "",
    travelBefore: String(record?.travelBefore ?? record?.travelMinutes ?? ""),
    travelAfter: String(record?.travelAfter ?? record?.travelMinutes ?? ""),
    recurrence: record?.recurrence ?? defaults.recurrence ?? "none",
    weekdays: record?.weekdays?.length ? [...record.weekdays] : [weekdayIndex(date)],
    until: record?.until ?? "",
    reminder: record?.reminder ?? "None",
    color: record?.color ?? "",
    notes: record?.notes ?? "",
  };
}

/** Add or edit any planner item. Everything stays fully editable. */
export function EventDialog({
  trigger,
  record,
  occurrenceDate,
  defaults,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: ReactNode;
  record?: PlannerEvent;
  /** The occurrence being edited — required for "this event only" edits. */
  occurrenceDate?: string;
  defaults?: Partial<Draft>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { addEvent, updateEvent, updateOccurrence, splitSeriesFrom } = useAppData();
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = onOpenChange ?? setUncontrolled;
  const [draft, setDraft] = useState<Draft>(() => toDraft(record, defaults ?? {}));
  const [scope, setScope] = useState<EditScope>("series");

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const repeats = draft.recurrence !== "none";
  const usesWeekdays = draft.recurrence === "weekly" || draft.recurrence === "biweekly";
  const invalid =
    draft.title.trim() === "" ||
    draft.end <= draft.start ||
    (usesWeekdays && draft.weekdays.length === 0);

  const isRecurringEdit = Boolean(record && record.recurrence !== "none");

  const previewText = (() => {
    if (!repeats) {
      return t("events.preview.once", {
        weekday: weekdayName(draft.date),
        start: draft.start,
        end: draft.end,
      });
    }
    if (usesWeekdays) {
      const days = [...draft.weekdays]
        .sort()
        .map((d) => WEEKDAY_LONG[d])
        .join(", ");
      return t(
        draft.recurrence === "weekly" ? "events.preview.weekly" : "events.preview.biweekly",
        {
          days: days || "—",
          start: draft.start,
          end: draft.end,
        },
      );
    }
    if (draft.recurrence === "daily") {
      return t("events.preview.daily", { start: draft.start, end: draft.end });
    }
    return t("events.preview.monthly", {
      day: Number(draft.date.slice(8)),
      start: draft.start,
      end: draft.end,
    });
  })();

  function save() {
    const payload = {
      title: draft.title.trim(),
      category: draft.category,
      date: draft.date,
      start: draft.start,
      end: draft.end,
      recurrence: draft.recurrence,
      ...(draft.subjectSlug === NO_SUBJECT ? {} : { subjectSlug: draft.subjectSlug }),
      ...(draft.location.trim() ? { location: draft.location.trim() } : {}),
      ...(draft.travelBefore ? { travelBefore: Number(draft.travelBefore) } : {}),
      ...(draft.travelAfter ? { travelAfter: Number(draft.travelAfter) } : {}),
      ...(usesWeekdays ? { weekdays: [...draft.weekdays].sort() } : {}),
      ...(repeats && draft.until ? { until: draft.until } : {}),
      ...(draft.reminder && draft.reminder !== "None" ? { reminder: draft.reminder } : {}),
      ...(draft.color ? { color: draft.color } : {}),
      ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
    };

    if (!record) {
      addEvent({ ...payload, done: false });
      toast.success(t("events.toast.added"));
      setOpen(false);
      return;
    }

    if (isRecurringEdit && occurrenceDate && scope === "only") {
      updateOccurrence(record.id, occurrenceDate, {
        title: payload.title,
        date: payload.date,
        start: payload.start,
        end: payload.end,
      });
      toast.success(t("events.toast.occurrenceUpdated"));
    } else if (isRecurringEdit && occurrenceDate && scope === "future") {
      splitSeriesFrom(record.id, occurrenceDate, payload);
      toast.success(t("events.toast.futureUpdated"));
    } else {
      updateEvent(record.id, payload);
      toast.success(isRecurringEdit ? t("events.toast.seriesUpdated") : t("events.toast.updated"));
    }
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setDraft(toDraft(record, defaults ?? {}));
          setScope("series");
        }
      }}
    >
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{record ? t("events.editTitle") : t("events.addTitle")}</DialogTitle>
          <DialogDescription>{t("events.dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ev-title">{t("events.title")}</Label>
            <Input
              id="ev-title"
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder={t("events.titlePlaceholder")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>{t("events.type")}</Label>
              <Select
                value={draft.category}
                onValueChange={(v) => set("category", v as EventCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(EVENT_CATEGORY_LABEL_KEY[c])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("events.subject")}</Label>
              <Select value={draft.subjectSlug} onValueChange={(v) => set("subjectSlug", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SUBJECT}>{t("events.noSubject")}</SelectItem>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s.slug} value={s.slug}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ev-date">{t("events.date")}</Label>
              <Input
                id="ev-date"
                type="date"
                value={draft.date}
                onChange={(e) => {
                  const value = e.target.value;
                  setDraft((d) => ({
                    ...d,
                    date: value,
                    weekdays: d.recurrence === "none" ? d.weekdays : [weekdayIndex(value)],
                  }));
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("events.weekday")}</Label>
              <Input value={weekdayName(draft.date)} readOnly className="text-muted-foreground" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ev-start">{t("events.startTime")}</Label>
              <Input
                id="ev-start"
                type="time"
                value={draft.start}
                onChange={(e) => set("start", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ev-end">{t("events.endTime")}</Label>
              <Input
                id="ev-end"
                type="time"
                value={draft.end}
                onChange={(e) => set("end", e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-[14px] border border-border p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>{t("events.repeats")}</Label>
                <Select
                  value={draft.recurrence}
                  onValueChange={(v) => {
                    const next = v as Recurrence;
                    setDraft((d) => ({
                      ...d,
                      recurrence: next,
                      weekdays: d.weekdays.length ? d.weekdays : [weekdayIndex(d.date)],
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(RECURRENCE_LABEL_KEY) as Recurrence[]).map((r) => (
                      <SelectItem key={r} value={r}>
                        {t(RECURRENCE_LABEL_KEY[r])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {repeats && (
                <div className="grid gap-2">
                  <Label htmlFor="ev-until">{t("events.repeatUntil")}</Label>
                  <Input
                    id="ev-until"
                    type="date"
                    value={draft.until}
                    onChange={(e) => set("until", e.target.value)}
                  />
                </div>
              )}
            </div>

            {usesWeekdays && (
              <div className="mt-4 grid gap-2">
                <Label>{t("events.repeatOn")}</Label>
                <div className="flex gap-1.5">
                  {WEEKDAY_INITIAL.map((initial, index) => {
                    const on = draft.weekdays.includes(index);
                    return (
                      <button
                        key={index}
                        type="button"
                        aria-label={WEEKDAY_LONG[index]}
                        aria-pressed={on}
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            weekdays: on
                              ? d.weekdays.filter((w) => w !== index)
                              : [...d.weekdays, index],
                          }))
                        }
                        className={cn(
                          "h-10 w-10 rounded-full border text-[14px] font-semibold transition-colors duration-200",
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:bg-hover",
                        )}
                      >
                        {initial}
                      </button>
                    );
                  })}
                </div>
                {draft.weekdays.length === 0 && (
                  <p className="text-[13px] text-warning">{t("events.chooseWeekday")}</p>
                )}
              </div>
            )}

            <p className="mt-4 rounded-[12px] bg-surface-2 px-3.5 py-3 text-[13.5px] text-muted-foreground">
              {previewText}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ev-location">{t("events.location")}</Label>
              <Input
                id="ev-location"
                value={draft.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder={t("events.locationPlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("events.reminder")}</Label>
              <Select value={draft.reminder} onValueChange={(v) => set("reminder", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(REMINDER_LABEL_KEY[r])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ev-travel-before">{t("events.travelBefore")}</Label>
              <Input
                id="ev-travel-before"
                inputMode="numeric"
                value={draft.travelBefore}
                onChange={(e) => set("travelBefore", e.target.value.replace(/\D/g, ""))}
                placeholder="0"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ev-travel-after">{t("events.travelAfter")}</Label>
              <Input
                id="ev-travel-after"
                inputMode="numeric"
                value={draft.travelAfter}
                onChange={(e) => set("travelAfter", e.target.value.replace(/\D/g, ""))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>{t("events.colour")}</Label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => set("color", "")}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition-colors",
                  draft.color === ""
                    ? "border-border-strong text-foreground"
                    : "border-border text-muted-foreground hover:bg-hover",
                )}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLOR[draft.category] }}
                />
                {t("events.categoryColour")}
              </button>
              {LINK_ACCENTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={t("events.colourNamed", { colour: c })}
                  onClick={() => set("color", c)}
                  className={cn(
                    "h-9 w-9 rounded-full border-2 transition-transform",
                    draft.color === c ? "border-foreground scale-105" : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ev-notes">{t("events.notes")}</Label>
            <Textarea
              id="ev-notes"
              value={draft.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          {draft.end <= draft.start && (
            <p className="text-[13px] text-warning">{t("events.endBeforeStart")}</p>
          )}

          {isRecurringEdit && occurrenceDate && (
            <div className="rounded-[14px] border border-border p-4">
              <Label className="mb-2 block">{t("events.applyChangesTo")}</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["only", t("events.scope.only")],
                    ["future", t("events.scope.future")],
                    ["series", t("events.scope.series")],
                  ] as [EditScope, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setScope(value)}
                    className={cn(
                      "rounded-[12px] border px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                      scope === value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-hover",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {scope === "only" && (
                <p className="mt-2 text-[13px] text-muted-foreground">
                  {t("events.scope.onlyHint")}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("events.cancel")}
          </Button>
          <Button disabled={invalid} onClick={save}>
            {record ? t("events.saveChanges") : t("events.addToPlanner")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
