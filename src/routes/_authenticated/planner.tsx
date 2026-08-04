import { createFileRoute } from "@tanstack/react-router";
import {
  Apple,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MoreHorizontal,
  Plus,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { DemoModeBanner } from "@/components/app/DemoMode";
import { EventDialog } from "@/components/app/EventDialog";
import { EmptyState } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { getSubject } from "@/lib/mock/subjects";
import { occurrencesInRange, useAppData } from "@/lib/store/app-data";
import type { EventCategory, PlannerEvent } from "@/lib/store/types";
import { CATEGORY_COLOR, EVENT_CATEGORIES } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({
    meta: [
      { title: "Planner — Alim's Study Assistant" },
      {
        name: "description",
        content:
          "Weekly planner for exams, study sessions, homework, activities and reminders. Everything you add stays editable.",
      },
      { property: "og:title", content: "Planner — Alim's Study Assistant" },
      {
        property: "og:description",
        content: "Weekly planner for exams, study sessions, homework and activities.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlannerPage,
});

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function isoAdd(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

function prettyDay(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(
    new Date(`${iso}T00:00:00`),
  );
}

function minutesBetween(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh! * 60 + em!) - (sh! * 60 + sm!);
}

function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function PlannerPage() {
  const { events, updateEvent, removeEvent, removeOccurrence, duplicateEvent, restoreEvent } =
    useAppData();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [active, setActive] = useState<EventCategory[]>([...EVENT_CATEGORIES]);
  const [remindersOn, setRemindersOn] = useState(false);
  const [editing, setEditing] = useState<PlannerEvent | null>(null);

  const weekEnd = isoAdd(weekStart, 6);
  const occurrences = useMemo(
    () =>
      occurrencesInRange(events, weekStart, weekEnd).filter((o) =>
        active.includes(o.event.category),
      ),
    [events, weekStart, weekEnd, active],
  );

  const toggle = (category: EventCategory) =>
    setActive((current) =>
      current.includes(category) ? current.filter((c) => c !== category) : [...current, category],
    );

  const studyMinutes = occurrences
    .filter((o) => o.event.category === "Study session")
    .reduce((sum, o) => sum + minutesBetween(o.event.start, o.event.end), 0);
  const activityMinutes = occurrences
    .filter((o) => o.event.category === "Extracurricular activity")
    .reduce(
      (sum, o) =>
        sum + minutesBetween(o.event.start, o.event.end) + 2 * (o.event.travelMinutes ?? 0),
      0,
    );
  const examCount = occurrences.filter((o) => o.event.category === "School exam").length;

  const activities = events.filter((e) => e.category === "Extracurricular activity");

  const conflicts = useMemo(() => {
    const out: { id: string; title: string; detail: string }[] = [];
    const byDay = new Map<string, typeof occurrences>();
    for (const o of occurrences) {
      byDay.set(o.date, [...(byDay.get(o.date) ?? []), o]);
    }
    for (const [date, list] of byDay) {
      const sorted = [...list].sort((a, b) => a.event.start.localeCompare(b.event.start));
      for (let i = 0; i < sorted.length - 1; i += 1) {
        const a = sorted[i]!;
        const b = sorted[i + 1]!;
        if (b.event.start < a.event.end) {
          out.push({
            id: `${a.event.id}-${b.event.id}-${date}`,
            title: `${a.event.title} overlaps ${b.event.title}`,
            detail: `${prettyDay(date)} · ${a.event.start}–${a.event.end} and ${b.event.start}–${b.event.end}`,
          });
        }
      }
    }
    return out;
  }, [occurrences]);

  const weekLabel = `${prettyDay(weekStart)} – ${prettyDay(weekEnd)}`;

  return (
    <AppShell wide>
      <PageHeading
        title="Planner"
        description={`Week of ${weekLabel} · everything here is yours and stays editable.`}
        action={
          <EventDialog
            defaults={{ date: weekStart }}
            trigger={
              <Button>
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            }
          />
        }
      />

      <DemoModeBanner className="mb-5" />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="icon"
          aria-label="Previous week"
          onClick={() => setWeekStart((w) => isoAdd(w, -7))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="secondary" onClick={() => setWeekStart(startOfWeek(new Date()))}>
          This week
        </Button>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Next week"
          onClick={() => setWeekStart((w) => isoAdd(w, 7))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="tabular ml-1 text-[14px] text-muted-foreground">{weekLabel}</span>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {EVENT_CATEGORIES.map((category) => {
          const on = active.includes(category);
          return (
            <button
              key={category}
              type="button"
              onClick={() => toggle(category)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13.5px] font-medium transition-colors duration-200",
                on
                  ? "border-border-strong bg-surface text-foreground"
                  : "border-border bg-transparent text-muted-foreground hover:bg-hover",
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: CATEGORY_COLOR[category] }}
              />
              {category}
              {on && <Check className="h-3.5 w-3.5" />}
            </button>
          );
        })}
      </div>

      {events.length === 0 ? (
        <EmptyState
          heading="Your planner is empty"
          description="Add your exams, study sessions, homework and activities. Nothing is pre-filled — turn on Demo Mode if you want to see an example week."
          action={
            <EventDialog
              defaults={{ date: weekStart }}
              trigger={
                <Button>
                  <Plus className="h-4 w-4" />
                  Add your first item
                </Button>
              }
            />
          }
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {WEEKDAYS.map((day, index) => {
              const iso = isoAdd(weekStart, index);
              const dayEvents = occurrences.filter((o) => o.date === iso);
              return (
                <div key={day} className="app-card flex flex-col gap-3 p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2">
                    <h2 className="truncate text-[16px] font-semibold tracking-tight">{day}</h2>
                    <span className="text-[13px] text-muted-foreground">{prettyDay(iso)}</span>
                  </div>

                  {dayEvents.length === 0 ? (
                    <p className="rounded-[14px] bg-surface-2 px-3 py-4 text-center text-[13.5px] text-muted-foreground">
                      Nothing planned
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {dayEvents.map(({ event, date }) => (
                        <li
                          key={`${event.id}-${date}`}
                          className="rounded-[16px] border border-border bg-surface p-3 transition-colors duration-200 hover:border-border-strong"
                        >
                          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2.5">
                            <span
                              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: CATEGORY_COLOR[event.category] }}
                            />
                            <div className="min-w-0">
                              <p
                                className={cn(
                                  "text-[14.5px] font-medium",
                                  event.done && "text-muted-foreground line-through",
                                )}
                              >
                                {event.title}
                              </p>
                              <p className="tabular text-[12.5px] text-muted-foreground">
                                {event.start}–{event.end}
                                {event.subjectSlug
                                  ? ` · ${getSubject(event.subjectSlug)?.name ?? ""}`
                                  : ""}
                              </p>
                              {event.location && (
                                <p className="mt-0.5 inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {event.location}
                                  {event.travelMinutes
                                    ? ` · ${event.travelMinutes} min travel each way`
                                    : ""}
                                </p>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Actions for ${event.title}`}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onSelect={() => updateEvent(event.id, { done: !event.done })}
                                >
                                  {event.done ? "Mark as not done" : "Mark as done"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => setTimeout(() => setEditing(event), 0)}
                                >
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => duplicateEvent(event.id)}>
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {event.recurrence === "weekly" && (
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      removeOccurrence(event.id, date);
                                      toast.success("Occurrence removed");
                                    }}
                                  >
                                    Delete this occurrence
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onSelect={() => {
                                    const snapshot = { ...event };
                                    removeEvent(event.id);
                                    toast.success("Planner item deleted", {
                                      action: {
                                        label: "Undo",
                                        onClick: () => restoreEvent(snapshot),
                                      },
                                    });
                                  }}
                                >
                                  {event.recurrence === "weekly" ? "Delete series" : "Delete"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>

          <aside className="flex h-fit flex-col gap-5 xl:sticky xl:top-24">
            <div className="app-card p-5">
              <div className="flex items-center gap-2.5">
                <Apple className="h-5 w-5" />
                <h2 className="text-[17px] font-semibold tracking-tight">Apple Reminders</h2>
              </div>
              <p className="mt-2 text-[14px] text-muted-foreground">
                Mirror exams and study sessions into your Reminders list. Prototype only — nothing
                is synced.
              </p>
              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[16px] bg-surface-2 p-3.5">
                <span className="text-[14.5px] font-medium">Sync planner events</span>
                <Switch checked={remindersOn} onCheckedChange={setRemindersOn} />
              </div>
              <Badge variant="secondary" className="mt-3">
                {remindersOn ? "Connected (simulated)" : "Not connected"}
              </Badge>
            </div>

            <div className="app-card p-5">
              <h2 className="text-[17px] font-semibold tracking-tight">Extracurricular activities</h2>
              {activities.length === 0 ? (
                <p className="mt-2 rounded-[14px] bg-surface-2 px-3 py-4 text-[13.5px] text-muted-foreground">
                  Add training, lessons or clubs so study time can be planned around them.
                </p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {activities.map((activity) => (
                    <li key={activity.id} className="rounded-[16px] bg-surface-2 p-3.5">
                      <p className="text-[14.5px] font-medium">{activity.title}</p>
                      <p className="tabular text-[12.5px] text-muted-foreground">
                        {activity.recurrence === "weekly" ? "Weekly · " : ""}
                        {activity.start}–{activity.end}
                      </p>
                      {activity.location && (
                        <p className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {activity.location}
                          {activity.travelMinutes
                            ? ` · ${activity.travelMinutes} min travel each way`
                            : ""}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <EventDialog
                defaults={{
                  date: weekStart,
                  category: "Extracurricular activity",
                  recurrence: "weekly",
                  start: "18:30",
                  end: "20:00",
                }}
                trigger={
                  <Button variant="secondary" className="mt-4 w-full">
                    <Plus className="h-4 w-4" />
                    Add Activity
                  </Button>
                }
              />
            </div>

            {conflicts.length > 0 && (
              <div className="app-card p-5">
                <div className="flex items-center gap-2.5">
                  <TriangleAlert className="h-5 w-5 text-warning" />
                  <h2 className="text-[17px] font-semibold tracking-tight">Conflicts</h2>
                </div>
                <ul className="mt-3 space-y-3">
                  {conflicts.map((conflict) => (
                    <li key={conflict.id} className="rounded-[16px] bg-surface-2 p-3.5">
                      <p className="text-[14.5px] font-medium">{conflict.title}</p>
                      <p className="mt-1 text-[13px] text-muted-foreground">{conflict.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="app-card p-5">
              <div className="flex items-center gap-2.5">
                <Bell className="h-5 w-5" />
                <h2 className="text-[17px] font-semibold tracking-tight">This week</h2>
              </div>
              <dl className="mt-3 space-y-2 text-[14.5px]">
                <Row label="Exams" value={String(examCount)} />
                <Row
                  label="Study sessions"
                  value={String(
                    occurrences.filter((o) => o.event.category === "Study session").length,
                  )}
                />
                <Row label="Planned study time" value={formatHours(studyMinutes)} />
                <Row label="Activities incl. travel" value={formatHours(activityMinutes)} />
              </dl>
              <EventDialog
                defaults={{ date: weekStart, category: "Study session" }}
                trigger={
                  <Button variant="secondary" className="mt-4 w-full">
                    <CalendarDays className="h-4 w-4" />
                    Plan a study session
                  </Button>
                }
              />
            </div>
          </aside>
        </div>
      )}

      {editing && (
        <EventDialog
          key={editing.id}
          record={editing}
          open
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
        />
      )}
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular font-medium">{value}</dd>
    </div>
  );
}
