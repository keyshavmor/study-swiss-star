/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  MoreHorizontal,
  Plus,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { AcademicYearSelector } from "@/components/app/AcademicYearSelector";
import { PageNav } from "@/components/app/Breadcrumbs";
import { DemoModeBanner } from "@/components/app/DemoMode";
import { EventDetailDialog } from "@/components/app/EventDetailDialog";
import { EventDialog } from "@/components/app/EventDialog";
import { GoogleCalendarCard } from "@/components/app/GoogleCalendarCard";
import { GoogleCalendarLogo } from "@/components/app/BrandLogos";
import { EmptyState } from "@/components/app/States";
import { Timetable } from "@/components/app/Timetable";
import type { MoveRequest } from "@/components/app/Timetable";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  addDays,
  addMonths,
  durationLabel,
  endOfMonth,
  formatDayMonth,
  formatMonthTitle,
  minutesOf,
  startOfMonth,
  startOfWeek,
  todayIso,
  weekdayIndex,
  WEEKDAY_SHORT,
} from "@/lib/date-utils";
import { getSubject } from "@/lib/mock/subjects";
import type { Occurrence } from "@/lib/store/app-data";
import { occurrencesInRange, useAppData } from "@/lib/store/app-data";
import type { EventCategory, PlannerEvent } from "@/lib/store/types";
import { CATEGORY_COLOR, EVENT_CATEGORIES } from "@/lib/store/types";
import { isGoogleOccurrence } from "@/lib/google-calendar";
import { track } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { toast } from "sonner";


type PlannerView = "Timetable" | "Day" | "Month" | "List";
type Scope = "only" | "future" | "series";

export const Route = createFileRoute("/_authenticated/planner")({
  validateSearch: (search: Record<string, unknown>) => ({
    date: typeof search["date"] === "string" ? search["date"] : undefined,
    event: typeof search["event"] === "string" ? search["event"] : undefined,
    google: typeof search["google"] === "string" ? search["google"] : undefined,
  }),

  head: () => ({
    meta: [
      { title: "Planner — Alim's Study Assistant" },
      {
        name: "description",
        content:
          "A 24-hour weekly timetable for classes, exams, study sessions, homework and activities. Drag to reschedule, everything stays editable.",
      },
      { property: "og:title", content: "Planner — Alim's Study Assistant" },
      {
        property: "og:description",
        content: "24-hour timetable for classes, exams, study sessions and activities.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlannerPage,
});

function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function PlannerPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const {
    events,
    updateEvent,
    updateOccurrence,
    splitSeriesFrom,
    removeEvent,
    removeOccurrence,
    endSeriesBefore,
    duplicateEvent,
    restoreEvent,
  } = useAppData();

  const [view, setView] = useState<PlannerView>("Timetable");
  const [anchor, setAnchor] = useState<string>(() => search.date ?? todayIso());
  const [active, setActive] = useState<EventCategory[]>([...EVENT_CATEGORIES]);
  const [fullDay, setFullDay] = useState(false);
  const [googleOccurrences, setGoogleOccurrences] = useState<Occurrence[]>([]);
  const [googleDetail, setGoogleDetail] = useState<Occurrence | null>(null);

  const [selected, setSelected] = useState<Occurrence | null>(null);
  const [editing, setEditing] = useState<{ event: PlannerEvent; date: string } | null>(null);
  const [pendingMove, setPendingMove] = useState<MoveRequest | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Occurrence | null>(null);

  useEffect(() => {
    if (search.date) setAnchor(search.date);
  }, [search.date]);

  const weekStart = startOfWeek(anchor);
  const range = useMemo(() => {
    if (view === "Day") return { from: anchor, to: anchor };
    if (view === "Month") return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
    if (view === "List") return { from: anchor, to: addDays(anchor, 30) };
    return { from: weekStart, to: addDays(weekStart, 6) };
  }, [view, anchor, weekStart]);

  const occurrences = useMemo(
    () =>
      occurrencesInRange(events, range.from, range.to).filter((o) =>
        active.includes(o.event.category),
      ),
    [events, range.from, range.to, active],
  );

  /**
   * Google Calendar items are merged for rendering only — they never enter the
   * editable planner state.
   */
  const visibleOccurrences = useMemo(
    () =>
      [...occurrences, ...googleOccurrences.filter((o) => o.date >= range.from && o.date <= range.to)].sort(
        (a, b) => (a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date)),
      ),
    [occurrences, googleOccurrences, range.from, range.to],
  );


  const weekOccurrences = useMemo(
    () =>
      occurrencesInRange(events, weekStart, addDays(weekStart, 6)).filter((o) =>
        active.includes(o.event.category),
      ),
    [events, weekStart, active],
  );

  const conflicts = useMemo(() => {
    const out: { id: string; title: string; detail: string }[] = [];
    const byDay = new Map<string, Occurrence[]>();
    for (const o of weekOccurrences) byDay.set(o.date, [...(byDay.get(o.date) ?? []), o]);
    for (const [date, list] of byDay) {
      const sorted = [...list].sort((a, b) => a.start.localeCompare(b.start));
      for (let i = 0; i < sorted.length - 1; i += 1) {
        const a = sorted[i]!;
        const b = sorted[i + 1]!;
        if (b.start < a.end) {
          out.push({
            id: `${a.event.id}-${b.event.id}-${date}`,
            title: `${a.title} overlaps ${b.title}`,
            detail: `${formatDayMonth(date)} · ${a.start}–${a.end} and ${b.start}–${b.end}`,
          });
        }
      }
    }
    return out;
  }, [weekOccurrences]);

  const studyMinutes = weekOccurrences
    .filter((o) => o.event.category === "Study session")
    .reduce((sum, o) => sum + minutesOf(o.end) - minutesOf(o.start), 0);
  const classMinutes = weekOccurrences
    .filter((o) => o.event.category === "School class")
    .reduce((sum, o) => sum + minutesOf(o.end) - minutesOf(o.start), 0);
  const activityMinutes = weekOccurrences
    .filter((o) => o.event.category === "Extracurricular activity")
    .reduce(
      (sum, o) =>
        sum +
        minutesOf(o.end) -
        minutesOf(o.start) +
        (o.event.travelBefore ?? o.event.travelMinutes ?? 0) +
        (o.event.travelAfter ?? o.event.travelMinutes ?? 0),
      0,
    );
  const examCount = weekOccurrences.filter((o) => o.event.category === "School exam").length;
  const activities = events.filter((e) => e.category === "Extracurricular activity");

  function shift(delta: number) {
    setAnchor((current: string) => {
      if (view === "Day") return addDays(current, delta);
      if (view === "Month") return addMonths(current, delta);
      return addDays(current, delta * 7);
    });
    void navigate({ to: "/planner", search: { date: undefined, event: undefined, google: undefined } });
  }

  function applyMove(request: MoveRequest, scope: Scope) {
    const { occurrence, date, start, end } = request;
    if (isGoogleOccurrence(occurrence)) return;
    if (occurrence.event.recurrence === "none" || scope === "series") {
      updateEvent(occurrence.event.id, { date, start, end });
    } else if (scope === "future") {
      splitSeriesFrom(occurrence.event.id, occurrence.originalDate, {
        date,
        start,
        end,
        weekdays: [weekdayIndex(date)],
      });
    } else {
      updateOccurrence(occurrence.event.id, occurrence.originalDate, { date, start, end });
    }
    track({
      event_name: "planner_event_moved",
      feature: "planner",
      properties: { scope, category: occurrence.event.category },
    });
    toast.success(`Moved to ${formatDayMonth(date)} at ${start}`);
  }

  function handleMove(request: MoveRequest) {
    if (isGoogleOccurrence(request.occurrence)) return;
    if (request.occurrence.event.recurrence === "none") {
      applyMove(request, "series");
    } else {
      setPendingMove(request);
    }
  }

  function handleSelect(occurrence: Occurrence) {
    if (isGoogleOccurrence(occurrence)) setGoogleDetail(occurrence);
    else setSelected(occurrence);
  }


  const rangeLabel =
    view === "Month"
      ? formatMonthTitle(anchor)
      : view === "Day"
        ? formatDayMonth(anchor)
        : `${formatDayMonth(range.from)} – ${formatDayMonth(range.to)}`;

  return (
    <AppShell wide>
      <PageNav
        back={{ to: "/home", label: "Home" }}
        crumbs={[{ label: "Home", to: "/home" }, { label: "Planner" }]}
      />
      <PageHeading
        title="Planner"
        description="Your 24-hour timetable. Add classes, exams, study sessions and activities — drag any block to reschedule it."
        action={
          <EventDialog
            defaults={{ date: view === "Day" ? anchor : weekStart }}
            trigger={
              <Button>
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            }
          />
        }
      />

      <div className="mb-5">
        <AcademicYearSelector />
      </div>

      <DemoModeBanner className="mb-5" />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border border-border p-0.5">
          {(["Timetable", "Day", "Month", "List"] as PlannerView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[13.5px] font-medium transition-colors duration-200",
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-hover",
              )}
            >
              {v}
            </button>
          ))}
        </div>

        <Button variant="secondary" size="icon" aria-label="Previous" onClick={() => shift(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="secondary" onClick={() => setAnchor(todayIso())}>
          Today
        </Button>
        <Button variant="secondary" size="icon" aria-label="Next" onClick={() => shift(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="tabular ml-1 text-[14px] text-muted-foreground">{rangeLabel}</span>

        {(view === "Timetable" || view === "Day") && (
          <label className="ml-auto flex items-center gap-2 text-[13.5px] text-muted-foreground">
            Full 24 hours
            <Switch checked={fullDay} onCheckedChange={setFullDay} />
          </label>
        )}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {EVENT_CATEGORIES.map((category) => {
          const on = active.includes(category);
          return (
            <button
              key={category}
              type="button"
              onClick={() =>
                setActive((current) =>
                  current.includes(category)
                    ? current.filter((c) => c !== category)
                    : [...current, category],
                )
              }
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200",
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
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0">
          {events.length === 0 && visibleOccurrences.length === 0 ? (
            <EmptyState
              heading="Your planner is empty"
              description="Add your classes, exams, study sessions, homework and activities. Nothing is pre-filled — turn on Demo Mode if you want to see an example week, or connect Google Calendar to see your appointments."
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
            <>
              {(view === "Timetable" || view === "Day") && (
                <Timetable
                  weekStart={view === "Day" ? anchor : weekStart}
                  days={view === "Day" ? 1 : 7}
                  occurrences={visibleOccurrences}
                  fromHour={fullDay ? 0 : 6}
                  toHour={fullDay ? 24 : 22}
                  onSelect={handleSelect}
                  onMove={handleMove}
                  highlightEventId={search.event}
                />
              )}

              {view === "Month" && (
                <MonthGrid
                  anchor={anchor}
                  occurrences={visibleOccurrences}
                  onSelect={handleSelect}
                  onPickDay={(iso) => {
                    setAnchor(iso);
                    setView("Day");
                  }}
                />
              )}

              {view === "List" && (
                <ul className="space-y-2.5">
                  {visibleOccurrences.length === 0 && (
                    <li className="app-card p-6 text-center text-[14px] text-muted-foreground">
                      Nothing planned in the next 30 days.
                    </li>
                  )}
                  {visibleOccurrences.map((o) => {
                    const subject = o.event.subjectSlug
                      ? getSubject(o.event.subjectSlug)
                      : undefined;
                    const fromGoogle = isGoogleOccurrence(o);
                    return (
                      <li
                        key={`${o.event.id}-${o.originalDate}`}
                        className="app-card grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 p-4"
                      >
                        <span
                          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: o.event.color ?? CATEGORY_COLOR[o.event.category],
                          }}
                        />
                        <button
                          type="button"
                          className="min-w-0 text-left"
                          onClick={() => handleSelect(o)}
                        >
                          <span
                            className={cn(
                              "flex items-center gap-2 text-[15px] font-medium",
                              o.event.done && "text-muted-foreground line-through",
                            )}
                          >
                            <span className="truncate">{o.title}</span>
                            {fromGoogle && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                <GoogleCalendarLogo className="h-3 w-3" />
                                Google
                              </span>
                            )}
                          </span>
                          <span className="tabular block text-[13px] text-muted-foreground">
                            {formatDayMonth(o.date)} · {o.start}–{o.end} ·{" "}
                            {durationLabel(o.start, o.end)}
                            {subject ? ` · ${subject.name}` : ""}
                            {fromGoogle ? " · read-only" : ""}
                          </span>
                          {o.event.location && (
                            <span className="mt-0.5 inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              {o.event.location}
                            </span>
                          )}
                        </button>
                        {fromGoogle ? (
                          <span className="sr-only">Read-only Google Calendar appointment</span>
                        ) : (
                          <OccurrenceMenu
                            occurrence={o}
                            onEdit={() => setEditing({ event: o.event, date: o.originalDate })}
                            onToggleDone={() => {
                              updateEvent(o.event.id, { done: !o.event.done });
                              track({
                                event_name: "planner_event_updated",
                                feature: "planner",
                                properties: { action: "toggle_done" },
                              });
                            }}
                            onDuplicate={() => {
                              duplicateEvent(o.event.id);
                              track({ event_name: "planner_event_duplicated", feature: "planner" });
                            }}
                            onDelete={() => setPendingDelete(o)}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </section>


          <aside className="flex h-fit flex-col gap-5 xl:sticky xl:top-24">
            <div className="app-card p-5">
              <div className="flex items-center gap-2.5">
                <Bell className="h-5 w-5" />
                <h2 className="text-[17px] font-semibold tracking-tight">This week</h2>
              </div>
              <dl className="mt-3 space-y-2 text-[14.5px]">
                <Row label="Classes" value={formatHours(classMinutes)} />
                <Row label="Exams" value={String(examCount)} />
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
              <h2 className="text-[17px] font-semibold tracking-tight">
                Extracurricular activities
              </h2>
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
                        {activity.recurrence !== "none"
                          ? `${(activity.weekdays ?? [weekdayIndex(activity.date)])
                              .map((d) => WEEKDAY_SHORT[d])
                              .join(", ")} · `
                          : ""}
                        {activity.start}–{activity.end}
                      </p>
                      {activity.location && (
                        <p className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {activity.location}
                        </p>
                      )}
                      {(activity.travelBefore || activity.travelAfter) && (
                        <p className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {(activity.travelBefore ?? 0) + (activity.travelAfter ?? 0)} min travel
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

          <GoogleCalendarCard range={range} onOccurrences={setGoogleOccurrences} />
        </aside>
      </div>

      <Dialog
        open={googleDetail !== null}
        onOpenChange={(next) => {
          if (!next) setGoogleDetail(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GoogleCalendarLogo className="h-4 w-4" />
              {googleDetail?.title}
            </DialogTitle>
            <DialogDescription>
              {googleDetail
                ? `${formatDayMonth(googleDetail.date)} · ${googleDetail.start}–${googleDetail.end}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {googleDetail?.event.location && (
            <p className="inline-flex items-center gap-1.5 text-[13.5px] text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {googleDetail.event.location}
            </p>
          )}
          <p className="text-[13.5px] text-muted-foreground">
            From your Google Calendar. It is shown here read-only — change it in Google Calendar.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setGoogleDetail(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {selected && (
        <EventDetailDialog
          key={`${selected.event.id}-${selected.originalDate}`}
          occurrence={selected}
          showPlannerAction={false}
          open
          onOpenChange={(next) => {
            if (!next) setSelected(null);
          }}
        />
      )}

      {editing && (
        <EventDialog
          key={editing.event.id}
          record={editing.event}
          occurrenceDate={editing.date}
          open
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
        />
      )}

      <ScopeDialog
        open={pendingMove !== null}
        title="Move recurring event"
        description="This event repeats. Choose which occurrences should move."
        onCancel={() => setPendingMove(null)}
        onChoose={(scope) => {
          if (pendingMove) applyMove(pendingMove, scope);
          setPendingMove(null);
        }}
      />

      <ScopeDialog
        open={pendingDelete !== null}
        title="Delete recurring event"
        description="This event repeats. Choose what to delete."
        destructive
        labels={{
          only: "This event only",
          future: "This and future events",
          series: "Delete entire series",
        }}
        onCancel={() => setPendingDelete(null)}
        onChoose={(scope) => {
          const target = pendingDelete;
          setPendingDelete(null);
          if (!target) return;
          if (target.event.recurrence === "none" || scope === "series") {
            const snapshot = { ...target.event };
            removeEvent(target.event.id);
            toast.success("Deleted", {
              action: { label: "Undo", onClick: () => restoreEvent(snapshot) },
            });
          } else if (scope === "future") {
            endSeriesBefore(target.event.id, target.originalDate);
            toast.success("This and future events removed");
          } else {
            removeOccurrence(target.event.id, target.originalDate);
            toast.success("Occurrence removed");
          }
        }}
      />
    </AppShell>
  );
}

function OccurrenceMenu({
  occurrence,
  onEdit,
  onToggleDone,
  onDuplicate,
  onDelete,
}: {
  occurrence: Occurrence;
  onEdit: () => void;
  onToggleDone: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${occurrence.title}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onToggleDone}>
          {occurrence.event.done ? "Mark as not done" : "Mark as done"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTimeout(onEdit, 0)}>Edit</DropdownMenuItem>
        <DropdownMenuItem onSelect={onDuplicate}>Duplicate</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onSelect={() => setTimeout(onDelete, 0)}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MonthGrid({
  anchor,
  occurrences,
  onSelect,
  onPickDay,
}: {
  anchor: string;
  occurrences: Occurrence[];
  onSelect: (occurrence: Occurrence) => void;
  onPickDay: (iso: string) => void;
}) {
  const first = startOfMonth(anchor);
  const gridStart = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const month = anchor.slice(0, 7);
  const today = todayIso();

  return (
    <div className="app-card overflow-hidden p-0">
      <div className="grid grid-cols-7 border-b border-border bg-surface-2">
        {WEEKDAY_SHORT.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-[12px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((iso) => {
          const dayEvents = occurrences.filter((o) => o.date === iso);
          return (
            <div
              key={iso}
              className={cn(
                "min-h-[104px] border-b border-l border-border p-1.5 first:border-l-0",
                iso.slice(0, 7) !== month && "bg-surface-2/60",
              )}
            >
              <button
                type="button"
                onClick={() => onPickDay(iso)}
                className={cn(
                  "tabular mb-1 grid h-6 w-6 place-items-center rounded-full text-[12.5px] font-semibold transition-colors hover:bg-hover",
                  iso === today && "bg-primary text-primary-foreground",
                  iso.slice(0, 7) !== month && "text-muted-foreground",
                )}
              >
                {Number(iso.slice(8))}
              </button>
              <ul className="space-y-1">
                {dayEvents.slice(0, 3).map((o) => (
                  <li key={`${o.event.id}-${o.originalDate}`}>
                    <button
                      type="button"
                      onClick={() => onSelect(o)}
                      className="flex w-full items-center gap-1.5 rounded-[8px] px-1 py-0.5 text-left transition-colors hover:bg-hover"
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: o.event.color ?? CATEGORY_COLOR[o.event.category],
                        }}
                      />
                      <span className="tabular truncate text-[11.5px]">
                        {o.start} {o.title}
                      </span>
                    </button>
                  </li>
                ))}
                {dayEvents.length > 3 && (
                  <li className="px-1 text-[11px] text-muted-foreground">
                    +{dayEvents.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScopeDialog({
  open,
  title,
  description,
  destructive,
  labels = {
    only: "This event only",
    future: "This and future events",
    series: "Entire series",
  },
  onCancel,
  onChoose,
}: {
  open: boolean;
  title: string;
  description: string;
  destructive?: boolean;
  labels?: Record<Scope, string>;
  onCancel: () => void;
  onChoose: (scope: Scope) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {(["only", "future", "series"] as Scope[]).map((scope) => (
            <Button
              key={scope}
              variant={destructive && scope === "series" ? "destructive" : "secondary"}
              className="w-full justify-start"
              onClick={() => onChoose(scope)}
            >
              {labels[scope]}
            </Button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
