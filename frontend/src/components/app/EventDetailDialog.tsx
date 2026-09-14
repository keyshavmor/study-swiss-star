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
import { durationLabel, fromIso, weekdayName } from "@/lib/date-utils";
import { getSubject } from "@/lib/mock/subjects";
import type { Occurrence } from "@/lib/store/app-data";
import { useAppData } from "@/lib/store/app-data";
import { useI18n } from "@/lib/i18n/provider";
import {
  CATEGORY_COLOR,
  EVENT_CATEGORY_LABEL_KEY,
  RECURRENCE_LABEL_KEY,
  REMINDER_LABEL_KEY,
} from "@/lib/store/types";
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
  const { t, formatDate } = useI18n();
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
      ? t("events.status.completed")
      : occurrence.date < today
        ? t("events.status.past")
        : occurrence.date === today
          ? t("events.status.today")
          : t("events.status.upcoming");

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
              {t(EVENT_CATEGORY_LABEL_KEY[event.category])}
              {subject ? ` · ${subject.name}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-[14px] bg-surface-2 p-4">
            <p className="text-[15.5px] font-medium">
              {formatDate(fromIso(occurrence.date), {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="tabular mt-1 text-[14px] text-muted-foreground">
              {occurrence.start}–{occurrence.end} ·{" "}
              {durationLabel(occurrence.start, occurrence.end)}
            </p>
          </div>

          <dl className="mt-1 divide-y divide-border">
            <Row icon={<CalendarDays className="h-4 w-4" />} label={t("events.detail.weekday")}>
              {weekdayName(occurrence.date)}
            </Row>
            <Row icon={<Clock className="h-4 w-4" />} label={t("events.detail.time")}>
              <span className="tabular">
                {occurrence.start}–{occurrence.end}
              </span>
            </Row>
            <Row icon={<MapPin className="h-4 w-4" />} label={t("events.detail.location")}>
              {event.location || t("events.detail.notSet")}
            </Row>
            <Row icon={<Repeat className="h-4 w-4" />} label={t("events.detail.recurrence")}>
              {t(RECURRENCE_LABEL_KEY[event.recurrence])}
              {event.recurrence === "weekly" || event.recurrence === "biweekly"
                ? t("events.detail.recurrenceOn", { weekday: weekdayName(occurrence.originalDate) })
                : ""}
            </Row>
            <Row icon={<Bell className="h-4 w-4" />} label={t("events.detail.reminder")}>
              {event.reminder && event.reminder !== "None"
                ? t(
                    REMINDER_LABEL_KEY[event.reminder as keyof typeof REMINDER_LABEL_KEY] ??
                      "events.detail.noReminder",
                  )
                : t("events.detail.noReminder")}
            </Row>
            <Row icon={<Clock className="h-4 w-4" />} label={t("events.detail.travelTime")}>
              {travel > 0
                ? t("events.detail.travelTotal", { minutes: travel })
                : t("events.detail.none")}
            </Row>
            <Row icon={<StickyNote className="h-4 w-4" />} label={t("events.detail.notes")}>
              {event.notes || t("events.detail.noNotes")}
            </Row>
            <Row
              icon={<CalendarDays className="h-4 w-4" />}
              label={t("events.detail.relatedSubject")}
            >
              {subject ? subject.name : t("events.detail.none")}
            </Row>
            <Row icon={<Check className="h-4 w-4" />} label={t("events.detail.status")}>
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
                      toast.success(t("events.toast.markedRead"));
                    }}
                  >
                    <Check className="h-4 w-4" />
                    {isRead ? t("events.read") : t("events.markAsRead")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      dismissNotification(notificationKey);
                      onOpenChange(false);
                      toast.success(t("events.toast.dismissed"));
                    }}
                  >
                    <X className="h-4 w-4" />
                    {t("events.dismiss")}
                  </Button>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
                {t("events.editEvent")}
              </Button>
              {showPlannerAction && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (notificationKey) markNotificationRead(notificationKey);
                    onOpenChange(false);
                    void navigate({
                      to: "/planner",
                      search: { date: occurrence.date, event: event.id, google: undefined },
                    });
                  }}
                >
                  {t("events.openInPlanner")}
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
