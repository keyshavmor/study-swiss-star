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
import { SUBJECTS } from "@/lib/mock/subjects";
import { useAppData } from "@/lib/store/app-data";
import type { EventCategory, PlannerEvent, Recurrence } from "@/lib/store/types";
import { EVENT_CATEGORIES } from "@/lib/store/types";
import { toast } from "sonner";

const NO_SUBJECT = "__none";

interface Draft {
  title: string;
  category: EventCategory;
  date: string;
  start: string;
  end: string;
  subjectSlug: string;
  location: string;
  travelMinutes: string;
  recurrence: Recurrence;
  until: string;
  notes: string;
}

function toDraft(record: PlannerEvent | undefined, defaults: Partial<Draft>): Draft {
  return {
    title: record?.title ?? "",
    category: record?.category ?? defaults.category ?? "Study session",
    date: record?.date ?? defaults.date ?? new Date().toISOString().slice(0, 10),
    start: record?.start ?? defaults.start ?? "16:00",
    end: record?.end ?? defaults.end ?? "17:00",
    subjectSlug: record?.subjectSlug ?? NO_SUBJECT,
    location: record?.location ?? "",
    travelMinutes: record?.travelMinutes ? String(record.travelMinutes) : "",
    recurrence: record?.recurrence ?? defaults.recurrence ?? "none",
    until: record?.until ?? "",
    notes: record?.notes ?? "",
  };
}

/** Add or edit any planner item. Everything stays fully editable. */
export function EventDialog({
  trigger,
  record,
  defaults,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: ReactNode;
  record?: PlannerEvent;
  defaults?: Partial<Draft>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { addEvent, updateEvent } = useAppData();
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = onOpenChange ?? setUncontrolled;
  const [draft, setDraft] = useState<Draft>(() => toDraft(record, defaults ?? {}));

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const invalid = draft.title.trim() === "" || draft.end <= draft.start;

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
      ...(draft.travelMinutes ? { travelMinutes: Number(draft.travelMinutes) } : {}),
      ...(draft.recurrence === "weekly" && draft.until ? { until: draft.until } : {}),
      ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
    };
    if (record) {
      updateEvent(record.id, payload);
      toast.success("Planner item updated");
    } else {
      addEvent({ ...payload, done: false });
      toast.success("Added to your planner");
    }
    setOpen(false);
  }


  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(toDraft(record, defaults ?? {}));
      }}
    >
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{record ? "Edit planner item" : "Add planner item"}</DialogTitle>
          <DialogDescription>
            Exams, study sessions, homework, activities and reminders — all editable at any time.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ev-title">Title</Label>
            <Input
              id="ev-title"
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Biology revision — mitosis"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Category</Label>
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
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Subject (optional)</Label>
              <Select value={draft.subjectSlug} onValueChange={(v) => set("subjectSlug", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SUBJECT}>No subject</SelectItem>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s.slug} value={s.slug}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ev-date">Date</Label>
              <Input
                id="ev-date"
                type="date"
                value={draft.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Repeat</Label>
              <Select
                value={draft.recurrence}
                onValueChange={(v) => set("recurrence", v as Recurrence)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="weekly">Every week</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ev-start">Start (24h)</Label>
              <Input
                id="ev-start"
                type="time"
                value={draft.start}
                onChange={(e) => set("start", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ev-end">End (24h)</Label>
              <Input
                id="ev-end"
                type="time"
                value={draft.end}
                onChange={(e) => set("end", e.target.value)}
              />
            </div>
            {draft.recurrence === "weekly" && (
              <div className="grid gap-2">
                <Label htmlFor="ev-until">Repeat until (optional)</Label>
                <Input
                  id="ev-until"
                  type="date"
                  value={draft.until}
                  onChange={(e) => set("until", e.target.value)}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="ev-location">Location (optional)</Label>
              <Input
                id="ev-location"
                value={draft.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Sporthalle Zentrum"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ev-travel">Travel time each way (min)</Label>
              <Input
                id="ev-travel"
                inputMode="numeric"
                value={draft.travelMinutes}
                onChange={(e) => set("travelMinutes", e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-notes">Notes (optional)</Label>
            <Textarea
              id="ev-notes"
              value={draft.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
          {draft.end <= draft.start && (
            <p className="text-[13px] text-warning">The end time must be after the start time.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={invalid} onClick={save}>
            {record ? "Save changes" : "Add to planner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
