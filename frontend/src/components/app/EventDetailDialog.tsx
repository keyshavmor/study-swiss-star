/** Alim application component for study, planning, profile, or navigation workflows. */
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CalendarDays,
  Check,
  Clock,
  MapPin,
  Pencil,
  Repeat,
  StickyNote,
  X,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { EventDialog } from "@/components/app/EventDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { durationLabel, formatLongDate, weekdayName } from "@/lib/date-utils";
import { getSubject } from "@/lib/mock/subjects";
import type { Occurrence } from "@/lib/store/app-data";
import { useAppData } from "@/lib/store/app-data";
import { CATEGORY_COLOR, RECURRENCE_LABEL } from "@/lib/store/types";
import { toast } from "sonner";

/**
 * Complete details for a single planner occurrence. Opened from a notification,
 * from the timetable, or from the planner list.
 */
export function EventDetailDialog({
  occurrence,
  open,
  onOpenChange,
  notificationKey,
  showPlannerAction = true,
}: {
  occurrence: Occurrence;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notificationKey?: string;
  showPlannerAction?: boolean;
}) {
  const navigate = useNavigate();
  const { markNotificationRead, dismissNotification, readNotifications } = useAppData();
  const [editing, setEditing] = useState(false);

  const { event } = occurrence;
  const subject = event.subjectSlug ? getSubject(event.subjectSlug) : undefined;
  const colour = event.color ?? CATEGORY_COLOR[event.category];
  const isRead = notificationKey ? readNotifications.includes(notificationKey) : false;
  const travel =
    (event.travelBefore ?? event.travelMinutes ?? 0) +
    (event.travelAfter ?? event.travelMinutes ?? 0);

  const today = new Date().toISOString().slice(0, 10);
  const status =
    event.done === true
      ? "Completed"
      : occurrence.date < today
        ? "Past"
        : occurrence.date === today
          ? "Today"
          : "Upcoming";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[520px]">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colour }} />
              <DialogTitle className="min-w-0 truncate">{occurrence.title}</DialogTitle>
            </div>
            <DialogDescription>
              {event.category}
              {subject ? ` · ${subject.name}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-[14px] bg-surface-2 p-4">
            <p className="text-[15.5px] font-medium">{formatLongDate(occurrence.date)}</p>
            <p className="tabular mt-1 text-[14px] text-muted-foreground">
              {occurrence.start}–{occurrence.end} ·{" "}
              {durationLabel(occurrence.start, occurrence.end)}
            </p>
          </div>

          <dl className="mt-1 divide-y divide-border">
            <Row icon={<CalendarDays className="h-4 w-4" />} label="Weekday">
              {weekdayName(occurrence.date)}
            </Row>
            <Row icon={<Clock className="h-4 w-4" />} label="Time">
              <span className="tabular">
                {occurrence.start}–{occurrence.end}
              </span>
            </Row>
            <Row icon={<MapPin className="h-4 w-4" />} label="Location">
              {event.location || "Not set"}
            </Row>
            <Row icon={<Repeat className="h-4 w-4" />} label="Recurrence">
              {RECURRENCE_LABEL[event.recurrence]}
              {event.recurrence === "weekly" || event.recurrence === "biweekly"
                ? ` on ${weekdayName(occurrence.originalDate)}`
                : ""}
            </Row>
            <Row icon={<Bell className="h-4 w-4" />} label="Reminder">
              {event.reminder && event.reminder !== "None" ? event.reminder : "No reminder"}
            </Row>
            <Row icon={<Clock className="h-4 w-4" />} label="Travel time">
              {travel > 0 ? `${travel} min total` : "None"}
            </Row>
            <Row icon={<StickyNote className="h-4 w-4" />} label="Notes">
              {event.notes || "No notes"}
            </Row>
            <Row icon={<CalendarDays className="h-4 w-4" />} label="Related subject">
              {subject ? subject.name : "None"}
            </Row>
            <Row icon={<Check className="h-4 w-4" />} label="Status">
              <Badge variant="secondary">{status}</Badge>
            </Row>
          </dl>

          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {notificationKey && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isRead}
                    onClick={() => {
                      markNotificationRead(notificationKey);
                      toast.success("Marked as read");
                    }}
                  >
                    <Check className="h-4 w-4" />
                    {isRead ? "Read" : "Mark as Read"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      dismissNotification(notificationKey);
                      onOpenChange(false);
                      toast.success("Notification dismissed");
                    }}
                  >
                    <X className="h-4 w-4" />
                    Dismiss
                  </Button>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
                Edit Event
              </Button>
              {showPlannerAction && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (notificationKey) markNotificationRead(notificationKey);
                    onOpenChange(false);
                    void navigate({
                      to: "/planner",
                      search: { date: occurrence.date, event: event.id },
                    });
                  }}
                >
                  Open in Planner
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editing && (
        <EventDialog
          key={event.id}
          record={event}
          occurrenceDate={occurrence.originalDate}
          open
          onOpenChange={(next) => {
            if (!next) setEditing(false);
          }}
        />
      )}
    </>
  );
}

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 py-2.5">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <dt className="text-[14px] text-muted-foreground">{label}</dt>
      <dd className="text-right text-[14px] font-medium">{children}</dd>
    </div>
  );
}
