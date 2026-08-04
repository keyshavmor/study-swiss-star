import { createFileRoute } from "@tanstack/react-router";
import { Apple, Bell, CalendarDays, Check, MapPin, Plus, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { AppShell, PageHeading } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import type { EventCategory } from "@/lib/mock/planner";
import {
  EVENT_CATEGORIES,
  EXTRACURRICULARS,
  PLANNER_CONFLICTS,
  PLANNER_EVENTS,
  WEEKDAYS,
  WEEK_AVAILABILITY,
} from "@/lib/mock/planner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({
    meta: [
      { title: "Planner — Alim's Study Assistant" },
      {
        name: "description",
        content:
          "Weekly planner for exams, study sessions, homework, activities and reminders with Apple Reminders sync.",
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

const CATEGORY_COLOR: Record<EventCategory, string> = {
  "School exam": "#D64545",
  "Study session": "#6558D9",
  "Extracurricular activity": "#4A8FD6",
  Homework: "#D69A4A",
  "Personal reminder": "#9A7AD9",
  Break: "#58A87C",
  Travel: "#666B76",
};

function PlannerPage() {
  const [active, setActive] = useState<EventCategory[]>([...EVENT_CATEGORIES]);
  const [remindersOn, setRemindersOn] = useState(true);

  const toggle = (category: EventCategory) =>
    setActive((current) =>
      current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category],
    );

  const events = PLANNER_EVENTS.filter((e) => active.includes(e.category));

  return (
    <AppShell wide>
      <PageHeading
        title="Planner"
        description="Week of 18–24 September · exams, study sessions and activities in one calm view."
        action={<AddActivityDialog />}
      />

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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {WEEKDAYS.map((day) => {
            const dayEvents = events.filter((e) => e.day === day);
            return (
              <div key={day} className="app-card flex flex-col gap-3 p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2">
                  <h2 className="truncate text-[16px] font-semibold tracking-tight">{day}</h2>
                  <span className="text-[13px] text-muted-foreground">
                    {dayEvents[0]?.date ?? ""}
                  </span>
                </div>

                {dayEvents.length === 0 ? (
                  <p className="rounded-[14px] bg-surface-2 px-3 py-4 text-center text-[13.5px] text-muted-foreground">
                    Nothing planned
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {dayEvents.map((event) => (
                      <li
                        key={event.id}
                        className="rounded-[16px] border border-border bg-surface p-3 transition-colors duration-200 hover:border-border-strong"
                      >
                        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2.5">
                          <span
                            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
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
                              {event.subject ? ` · ${event.subject}` : ""}
                            </p>
                          </div>
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
              Mirror exams and study sessions into your Reminders list. Prototype only — nothing is
              synced.
            </p>
            <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[16px] bg-surface-2 p-3.5">
              <span className="text-[14.5px] font-medium">Sync planner events</span>
              <Switch checked={remindersOn} onCheckedChange={setRemindersOn} />
            </div>
            <Badge variant="secondary" className="mt-3">
              {remindersOn ? "Connected · last sync 12:04" : "Not connected"}
            </Badge>
          </div>

          <div className="app-card p-5">
            <h2 className="text-[17px] font-semibold tracking-tight">Weekly availability</h2>
            <p className="mt-1 text-[13.5px] text-muted-foreground">
              How the week is spent, including travel to activities.
            </p>
            <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full">
              {WEEK_AVAILABILITY.map((slice) => (
                <span
                  key={slice.label}
                  style={{ backgroundColor: slice.color, width: `${(slice.hours / 68) * 100}%` }}
                />
              ))}
            </div>
            <dl className="mt-3 space-y-2 text-[14.5px]">
              {WEEK_AVAILABILITY.map((slice) => (
                <div
                  key={slice.label}
                  className="flex items-baseline justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0"
                >
                  <dt className="inline-flex items-center gap-2 text-muted-foreground">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: slice.color }}
                    />
                    {slice.label}
                  </dt>
                  <dd className="tabular font-medium">{slice.hours} h</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="app-card p-5">
            <h2 className="text-[17px] font-semibold tracking-tight">Extracurricular activities</h2>
            <ul className="mt-3 space-y-2.5">
              {EXTRACURRICULARS.map((activity) => (
                <li key={activity.id} className="rounded-[16px] bg-surface-2 p-3.5">
                  <p className="text-[14.5px] font-medium">{activity.name}</p>
                  <p className="tabular text-[12.5px] text-muted-foreground">
                    {activity.days.join(", ")} · {activity.start}–{activity.end}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {activity.location} · {activity.travelMinutes} min travel each way
                  </p>
                </li>
              ))}
            </ul>
            <AddActivityDialog variant="secondary" className="mt-4 w-full" />
          </div>

          {PLANNER_CONFLICTS.length > 0 && (
            <div className="app-card p-5">
              <div className="flex items-center gap-2.5">
                <TriangleAlert className="h-5 w-5 text-chart-4" />
                <h2 className="text-[17px] font-semibold tracking-tight">Conflicts</h2>
              </div>
              <ul className="mt-3 space-y-3">
                {PLANNER_CONFLICTS.map((conflict) => (
                  <li key={conflict.id} className="rounded-[16px] bg-surface-2 p-3.5">
                    <p className="text-[14.5px] font-medium">{conflict.title}</p>
                    <p className="mt-1 text-[13px] text-muted-foreground">{conflict.detail}</p>
                    <p className="mt-1 text-[13px] text-muted-foreground">{conflict.suggestion}</p>
                    <Button size="sm" variant="secondary" className="mt-3">
                      Reschedule study session
                    </Button>
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
              <Row label="Exams" value={String(events.filter((e) => e.category === "School exam").length)} />
              <Row
                label="Study sessions"
                value={String(events.filter((e) => e.category === "Study session").length)}
              />
              <Row
                label="Activities"
                value={String(
                  events.filter((e) => e.category === "Extracurricular activity").length,
                )}
              />
              <Row label="Planned study time" value="6 h 20 min" />
            </dl>
            <Button variant="secondary" className="mt-4 w-full">
              <CalendarDays className="h-4 w-4" />
              Generate study plan
            </Button>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function AddActivityDialog({
  variant = "default",
  className,
}: {
  variant?: "default" | "secondary";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={className}>
          <Plus className="h-4 w-4" />
          Add Activity
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add activity</DialogTitle>
          <DialogDescription>
            Activities and their travel time are subtracted from available study time.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="activity-name">Activity name</Label>
            <Input id="activity-name" placeholder="Handball training" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="activity-start">Start</Label>
              <Input id="activity-start" type="time" defaultValue="18:30" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="activity-end">End</Label>
              <Input id="activity-end" type="time" defaultValue="20:00" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="activity-travel">Travel time (min)</Label>
              <Input id="activity-travel" type="number" defaultValue={25} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="activity-location">Location</Label>
              <Input id="activity-location" placeholder="Sporthalle Zentrum" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setOpen(false)}>Save activity</Button>
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
