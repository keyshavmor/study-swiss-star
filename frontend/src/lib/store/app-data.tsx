/** Local application-state types and persistence helpers. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { addDays, daysBetween, startOfWeek, weekdayIndex } from "@/lib/date-utils";
import { createDemoState } from "@/lib/store/demo-data";
import type {
  Assessment,
  DataState,
  Material,
  PlannerEvent,
  SchoolLink,
  StudentProfile,
} from "@/lib/store/types";
import { EMPTY_PROFILE, EMPTY_STATE } from "@/lib/store/types";
import { track } from "@/lib/telemetry";

const STORAGE_KEY = "asa.data.v2";
const DEMO_KEY = "asa.demo.v1";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Central planner telemetry. Only structural facts are recorded — never the
 * title, notes, location or any other content of an appointment, and never
 * anything about Google-origin (read-only) events.
 */
function trackPlanner(
  event_name: string,
  event: PlannerEvent | undefined,
  properties?: Record<string, string | number | boolean>,
): void {
  if (event?.externalSource === "google") return;
  track({
    event_name,
    feature: "planner",
    properties: {
      ...properties,
      category: event?.category ?? null,
      recurring: event ? event.recurrence !== "none" : null,
    },
  });
}


interface DataContextValue extends DataState {
  demoMode: boolean;
  setDemoMode: (on: boolean) => void;
  hasAnyData: boolean;

  addAssessment: (input: Omit<Assessment, "id">) => Assessment;
  updateAssessment: (id: string, patch: Partial<Assessment>) => void;
  duplicateAssessment: (id: string) => void;
  removeAssessment: (id: string) => void;
  restoreAssessment: (record: Assessment) => void;
  getAssessment: (id: string) => Assessment | undefined;

  addEvent: (input: Omit<PlannerEvent, "id">) => PlannerEvent;
  updateEvent: (id: string, patch: Partial<PlannerEvent>) => void;
  updateOccurrence: (
    id: string,
    isoDate: string,
    patch: { date?: string; start?: string; end?: string; title?: string },
  ) => void;
  splitSeriesFrom: (id: string, isoDate: string, patch: Partial<PlannerEvent>) => void;
  duplicateEvent: (id: string) => void;
  removeEvent: (id: string) => void;
  removeOccurrence: (id: string, isoDate: string) => void;
  endSeriesBefore: (id: string, isoDate: string) => void;
  restoreEvent: (record: PlannerEvent) => void;
  getEvent: (id: string) => PlannerEvent | undefined;

  addMaterial: (input: Omit<Material, "id">) => Material;
  updateMaterial: (id: string, patch: Partial<Material>) => void;
  removeMaterial: (id: string) => void;
  restoreMaterial: (record: Material) => void;

  addLink: (input: Omit<SchoolLink, "id" | "order" | "opens">) => SchoolLink;
  updateLink: (id: string, patch: Partial<SchoolLink>) => void;
  duplicateLink: (id: string) => void;
  removeLink: (id: string) => void;
  restoreLink: (record: SchoolLink) => void;
  reorderLinks: (orderedIds: string[]) => void;
  registerLinkOpen: (id: string) => void;

  updateProfile: (patch: Partial<StudentProfile>) => void;

  markNotificationRead: (key: string) => void;
  markAllNotificationsRead: (keys: string[]) => void;
  dismissNotification: (key: string) => void;

  clearAll: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

function readStored(): DataState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem("asa.data.v1");
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<DataState>;
    return {
      assessments: parsed.assessments ?? [],
      events: parsed.events ?? [],
      materials: parsed.materials ?? [],
      links: parsed.links ?? [],
      profile: { ...EMPTY_PROFILE, ...(parsed.profile ?? {}) },
      readNotifications: parsed.readNotifications ?? [],
      dismissedNotifications: parsed.dismissedNotifications ?? [],
    };
  } catch {
    return EMPTY_STATE;
  }
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [userState, setUserState] = useState<DataState>(EMPTY_STATE);
  const [demoState, setDemoState] = useState<DataState>(() => createDemoState());
  const [demoMode, setDemoModeState] = useState(false);

  useEffect(() => {
    setUserState(readStored());
    setDemoModeState(window.localStorage.getItem(DEMO_KEY) === "on");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(userState));
  }, [hydrated, userState]);

  const setDemoMode = useCallback((on: boolean) => {
    setDemoModeState(on);
    if (typeof window !== "undefined") window.localStorage.setItem(DEMO_KEY, on ? "on" : "off");
    if (on) setDemoState(createDemoState());
  }, []);

  const state = demoMode ? demoState : userState;
  const setState = demoMode ? setDemoState : setUserState;

  const value = useMemo<DataContextValue>(() => {
    const patchList = <T extends { id: string }>(list: T[], id: string, patch: Partial<T>) =>
      list.map((item) => (item.id === id ? { ...item, ...patch } : item));

    return {
      ...state,
      demoMode,
      setDemoMode,
      hasAnyData:
        state.assessments.length > 0 ||
        state.events.length > 0 ||
        state.materials.length > 0 ||
        state.links.length > 0,

      addAssessment: (input) => {
        const record: Assessment = { ...input, id: uid("a") };
        setState((s) => ({ ...s, assessments: [...s.assessments, record] }));
        return record;
      },
      updateAssessment: (id, patch) =>
        setState((s) => ({ ...s, assessments: patchList(s.assessments, id, patch) })),
      duplicateAssessment: (id) =>
        setState((s) => {
          const found = s.assessments.find((x) => x.id === id);
          if (!found) return s;
          return {
            ...s,
            assessments: [
              ...s.assessments,
              { ...found, id: uid("a"), title: `${found.title} (copy)` },
            ],
          };
        }),
      removeAssessment: (id) =>
        setState((s) => ({ ...s, assessments: s.assessments.filter((x) => x.id !== id) })),
      restoreAssessment: (record) =>
        setState((s) => ({ ...s, assessments: [...s.assessments, record] })),
      getAssessment: (id) => state.assessments.find((x) => x.id === id),

      addEvent: (input) => {
        const record: PlannerEvent = { ...input, id: uid("e") };
        setState((s) => ({ ...s, events: [...s.events, record] }));
        trackPlanner("planner_event_created", record);
        return record;
      },
      updateEvent: (id, patch) => {
        trackPlanner(
          "planner_event_updated",
          state.events.find((x) => x.id === id),
          { patched_fields: Object.keys(patch).join(",") },
        );
        setState((s) => ({ ...s, events: patchList(s.events, id, patch) }));
      },
      updateOccurrence: (id, isoDate, patch) => {
        trackPlanner(
          "planner_occurrence_updated",
          state.events.find((x) => x.id === id),
          { patched_fields: Object.keys(patch).join(",") },
        );
        setState((s) => ({
          ...s,
          events: s.events.map((e) =>
            e.id === id
              ? {
                  ...e,
                  overrides: {
                    ...(e.overrides ?? {}),
                    [isoDate]: { ...(e.overrides?.[isoDate] ?? {}), ...patch },
                  },
                }
              : e,
          ),
        }));
      },
      /** Ends the original series the day before `isoDate` and starts a new one. */
      splitSeriesFrom: (id, isoDate, patch) => {
        trackPlanner(
          "planner_series_split",
          state.events.find((x) => x.id === id),
          { patched_fields: Object.keys(patch).join(",") },
        );
        setState((s) => {
          const found = s.events.find((x) => x.id === id);
          if (!found) return s;
          const tail: PlannerEvent = {
            ...found,
            ...patch,
            id: uid("e"),
            date: patch.date ?? isoDate,
            exceptions: [],
            overrides: {},
          };
          const head: PlannerEvent = { ...found, until: addDays(isoDate, -1) };
          const keepHead = head.date <= head.until!;
          return {
            ...s,
            events: [...s.events.filter((x) => x.id !== id), ...(keepHead ? [head] : []), tail],
          };
        });
      },
      duplicateEvent: (id) => {
        trackPlanner(
          "planner_event_duplicated",
          state.events.find((x) => x.id === id),
        );
        setState((s) => {
          const found = s.events.find((x) => x.id === id);
          if (!found) return s;
          return {
            ...s,
            events: [...s.events, { ...found, id: uid("e"), title: `${found.title} (copy)` }],
          };
        });
      },
      removeEvent: (id) => {
        trackPlanner(
          "planner_event_deleted",
          state.events.find((x) => x.id === id),
        );
        setState((s) => ({ ...s, events: s.events.filter((x) => x.id !== id) }));
      },
      removeOccurrence: (id, isoDate) => {
        trackPlanner(
          "planner_occurrence_deleted",
          state.events.find((x) => x.id === id),
        );
        setState((s) => ({
          ...s,
          events: s.events.map((e) =>
            e.id === id ? { ...e, exceptions: [...(e.exceptions ?? []), isoDate] } : e,
          ),
        }));
      },
      endSeriesBefore: (id, isoDate) => {
        trackPlanner(
          "planner_series_ended",
          state.events.find((x) => x.id === id),
        );
        setState((s) => ({
          ...s,
          events: s.events.map((e) => (e.id === id ? { ...e, until: addDays(isoDate, -1) } : e)),
        }));
      },
      restoreEvent: (record) => {
        trackPlanner("planner_event_restored", record);
        setState((s) => ({ ...s, events: [...s.events, record] }));
      },
      getEvent: (id) => state.events.find((x) => x.id === id),

      addMaterial: (input) => {
        const record: Material = { ...input, id: uid("m") };
        setState((s) => ({ ...s, materials: [...s.materials, record] }));
        return record;
      },
      updateMaterial: (id, patch) =>
        setState((s) => ({ ...s, materials: patchList(s.materials, id, patch) })),
      removeMaterial: (id) =>
        setState((s) => ({ ...s, materials: s.materials.filter((x) => x.id !== id) })),
      restoreMaterial: (record) => setState((s) => ({ ...s, materials: [...s.materials, record] })),

      addLink: (input) => {
        const record: SchoolLink = {
          ...input,
          id: uid("l"),
          order: state.links.length,
          opens: 0,
        };
        setState((s) => ({ ...s, links: [...s.links, record] }));
        return record;
      },
      updateLink: (id, patch) => setState((s) => ({ ...s, links: patchList(s.links, id, patch) })),
      duplicateLink: (id) =>
        setState((s) => {
          const found = s.links.find((x) => x.id === id);
          if (!found) return s;
          return {
            ...s,
            links: [
              ...s.links,
              { ...found, id: uid("l"), name: `${found.name} (copy)`, order: s.links.length },
            ],
          };
        }),
      removeLink: (id) => setState((s) => ({ ...s, links: s.links.filter((x) => x.id !== id) })),
      restoreLink: (record) => setState((s) => ({ ...s, links: [...s.links, record] })),
      reorderLinks: (orderedIds) =>
        setState((s) => ({
          ...s,
          links: s.links.map((l) => {
            const next = orderedIds.indexOf(l.id);
            return next === -1 ? l : { ...l, order: next };
          }),
        })),
      registerLinkOpen: (id) =>
        setState((s) => ({
          ...s,
          links: s.links.map((l) => (l.id === id ? { ...l, opens: l.opens + 1 } : l)),
        })),

      updateProfile: (patch) => setState((s) => ({ ...s, profile: { ...s.profile, ...patch } })),

      markNotificationRead: (key) =>
        setState((s) =>
          s.readNotifications.includes(key)
            ? s
            : { ...s, readNotifications: [...s.readNotifications, key] },
        ),
      markAllNotificationsRead: (keys) =>
        setState((s) => ({
          ...s,
          readNotifications: Array.from(new Set([...s.readNotifications, ...keys])),
        })),
      dismissNotification: (key) =>
        setState((s) => ({
          ...s,
          dismissedNotifications: Array.from(new Set([...s.dismissedNotifications, key])),
        })),

      clearAll: () => setState(() => ({ ...EMPTY_STATE, profile: { ...EMPTY_PROFILE } })),
    };
  }, [state, setState, demoMode, setDemoMode]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useAppData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useAppData must be used inside AppDataProvider");
  return ctx;
}

export interface Occurrence {
  event: PlannerEvent;
  /** The date this occurrence is shown on (after any per-occurrence move). */
  date: string;
  /** The original anchor date of this occurrence — the key for overrides. */
  originalDate: string;
  start: string;
  end: string;
  title: string;
}

/** Does a series land on `iso`, ignoring exceptions/overrides? */
function matchesRecurrence(event: PlannerEvent, iso: string): boolean {
  if (iso < event.date) return false;
  if (event.until && iso > event.until) return false;

  switch (event.recurrence) {
    case "none":
      return iso === event.date;
    case "daily":
      return true;
    case "weekly":
    case "biweekly": {
      const days = event.weekdays?.length ? event.weekdays : [weekdayIndex(event.date)];
      if (!days.includes(weekdayIndex(iso))) return false;
      if (event.recurrence === "weekly") return true;
      // Anchor bi-weekly on the Monday of the first week so it never drifts.
      const weeks = Math.round(daysBetween(startOfWeek(event.date), startOfWeek(iso)) / 7);
      return weeks % 2 === 0;
    }
    case "monthly":
      return iso.slice(8) === event.date.slice(8);
    default:
      return false;
  }
}

/**
 * Expands recurrence into concrete occurrences inside an inclusive date range.
 *
 * Recurrence is evaluated per calendar day against the weekday/day-of-month of
 * the anchor date, so an event never drifts across weeks, months or DST.
 */
export function occurrencesInRange(
  events: PlannerEvent[],
  fromIso: string,
  toIso: string,
): Occurrence[] {
  const out: Occurrence[] = [];
  const moved: Occurrence[] = [];

  for (const event of events) {
    const exceptions = event.exceptions ?? [];
    const overrides = event.overrides ?? {};

    for (let iso = fromIso; iso <= toIso; iso = addDays(iso, 1)) {
      if (!matchesRecurrence(event, iso)) continue;
      if (exceptions.includes(iso)) continue;
      const override = overrides[iso];
      out.push({
        event,
        originalDate: iso,
        date: override?.date ?? iso,
        start: override?.start ?? event.start,
        end: override?.end ?? event.end,
        title: override?.title ?? event.title,
      });
    }

    // Occurrences anchored just outside the range but moved into it.
    for (const [anchor, override] of Object.entries(overrides)) {
      if (!override.date) continue;
      if (anchor >= fromIso && anchor <= toIso) continue;
      if (override.date < fromIso || override.date > toIso) continue;
      if (!matchesRecurrence(event, anchor) || exceptions.includes(anchor)) continue;
      moved.push({
        event,
        originalDate: anchor,
        date: override.date,
        start: override.start ?? event.start,
        end: override.end ?? event.end,
        title: override.title ?? event.title,
      });
    }
  }

  return [...out, ...moved]
    .filter((o) => o.date >= fromIso && o.date <= toIso)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
}
