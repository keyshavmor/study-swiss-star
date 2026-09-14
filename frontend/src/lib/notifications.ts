/** Frontend utility or server adapter used by the local Alim application. */
import { addDays, daysBetween, todayIso } from "@/lib/date-utils";
import { formatDate, formatWeekday } from "@/lib/i18n/format";
import { getSubject } from "@/lib/mock/subjects";
import type { Occurrence } from "@/lib/store/app-data";
import { occurrencesInRange } from "@/lib/store/app-data";
import type { PlannerEvent } from "@/lib/store/types";

export type NotificationSection = "Today" | "Upcoming" | "Earlier";

export interface EventNotification {
  /** Stable key: event id + occurrence date. */
  key: string;
  occurrence: Occurrence;
  title: string;
  summary: string;
  timestamp: string;
  section: NotificationSection;
  category: PlannerEvent["category"];
  subjectName: string | null;
}

function relativeDay(iso: string, today: string): string {
  const diff = daysBetween(today, iso);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff > 1 && diff <= 7) return `on ${formatWeekday(iso, "en", "long")}`;
  if (diff < -1 && diff >= -7) return `last ${formatWeekday(iso, "en", "long")}`;
  return `on ${formatDate(iso)}`;
}

/**
 * Builds the notification feed from planner events. Prototype only — nothing
 * is delivered, scheduled or pushed anywhere.
 */
export function buildNotifications(
  events: PlannerEvent[],
  dismissed: string[] = [],
): EventNotification[] {
  const today = todayIso();
  const occurrences = occurrencesInRange(events, addDays(today, -14), addDays(today, 30));

  return occurrences
    .map<EventNotification>((occurrence) => {
      const subject = occurrence.event.subjectSlug
        ? (getSubject(occurrence.event.subjectSlug)?.name ?? null)
        : null;
      const diff = daysBetween(today, occurrence.date);
      const section: NotificationSection = diff === 0 ? "Today" : diff > 0 ? "Upcoming" : "Earlier";

      return {
        key: `${occurrence.event.id}:${occurrence.originalDate}`,
        occurrence,
        title: `${occurrence.title} ${relativeDay(occurrence.date, today)}`,
        summary: [occurrence.start, subject ?? occurrence.event.category]
          .filter(Boolean)
          .join(" · "),
        timestamp: `${formatDate(occurrence.date)} · ${occurrence.start}`,
        section,
        category: occurrence.event.category,
        subjectName: subject,
      };
    })
    .filter((n) => !dismissed.includes(n.key))
    .sort((a, b) => {
      const rank = { Today: 0, Upcoming: 1, Earlier: 2 } as const;
      return (
        rank[a.section] - rank[b.section] ||
        (a.section === "Earlier"
          ? b.occurrence.date.localeCompare(a.occurrence.date)
          : a.occurrence.date.localeCompare(b.occurrence.date)) ||
        a.occurrence.start.localeCompare(b.occurrence.start)
      );
    });
}
