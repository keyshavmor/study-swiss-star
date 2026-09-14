/** Local application-state types and persistence helpers. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { supabase } from "@/integrations/supabase/client";
import {
  emptyAppData,
  loadAppData,
  saveAppData,
  uploadMaterialObject,
} from "@/lib/store/app-data.repository";
import { toast } from "sonner";
import { ingestMaterial } from "@/lib/material.functions";
import { appDataCacheKey, readCachedAppData } from "@/lib/store/app-data.cache";

const DEMO_KEY = "asa.demo.v1";

function uid() {
  return crypto.randomUUID();
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
  uploadMaterial: (file: File, input: Omit<Material, "id">) => Promise<Material>;

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

function readStored(userId: string): DataState {
  if (typeof window === "undefined") return EMPTY_STATE;
  return readCachedAppData(window.localStorage, userId);
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userState, setUserState] = useState<DataState>(EMPTY_STATE);
  const [demoState, setDemoState] = useState<DataState>(() => createDemoState());
  const [demoMode, setDemoModeState] = useState(false);
  const loadGeneration = useRef(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    setDemoModeState(window.localStorage.getItem(DEMO_KEY) === "on");
    const switchUser = async (nextUserId: string | null) => {
      const generation = ++loadGeneration.current;
      setHydrated(false);
      setUserId(nextUserId);
      setUserState(emptyAppData());
      if (!nextUserId) {
        setHydrated(true);
        return;
      }
      const cached = readStored(nextUserId);
      try {
        const remote = await loadAppData(nextUserId);
        if (generation !== loadGeneration.current) return;
        setUserState(remote);
        window.localStorage.setItem(appDataCacheKey(nextUserId), JSON.stringify(remote));
      } catch (error) {
        if (generation !== loadGeneration.current) return;
        setUserState(cached);
        toast.error("Your cloud data could not be loaded", {
          description: error instanceof Error ? error.message : "Using this account's local cache.",
        });
      } finally {
        if (generation === loadGeneration.current) setHydrated(true);
      }
    };

    void supabase.auth.getSession().then(({ data }) => switchUser(data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void switchUser(session?.user.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!hydrated || !userId || demoMode) return;
    window.localStorage.setItem(appDataCacheKey(userId), JSON.stringify(userState));
    const generation = loadGeneration.current;
    const timeout = window.setTimeout(() => {
      saveQueue.current = saveQueue.current
        .catch(() => undefined)
        .then(() => saveAppData(userId, userState))
        .catch((error) => {
          if (generation !== loadGeneration.current) return;
          toast.error("Changes are saved on this device but not yet in Supabase", {
            description: error instanceof Error ? error.message : "Cloud synchronization failed.",
          });
        });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [demoMode, hydrated, userId, userState]);

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
        const record: Assessment = { ...input, id: uid() };
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
              { ...found, id: uid(), title: `${found.title} (copy)` },
            ],
          };
        }),
      removeAssessment: (id) =>
        setState((s) => ({ ...s, assessments: s.assessments.filter((x) => x.id !== id) })),
      restoreAssessment: (record) =>
        setState((s) => ({ ...s, assessments: [...s.assessments, record] })),
      getAssessment: (id) => state.assessments.find((x) => x.id === id),

      addEvent: (input) => {
        const record: PlannerEvent = { ...input, id: uid() };
        setState((s) => ({ ...s, events: [...s.events, record] }));
        return record;
      },
      updateEvent: (id, patch) =>
        setState((s) => ({ ...s, events: patchList(s.events, id, patch) })),
      updateOccurrence: (id, isoDate, patch) =>
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
        })),
      /** Ends the original series the day before `isoDate` and starts a new one. */
      splitSeriesFrom: (id, isoDate, patch) =>
        setState((s) => {
          const found = s.events.find((x) => x.id === id);
          if (!found) return s;
          const tail: PlannerEvent = {
            ...found,
            ...patch,
            id: uid(),
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
        }),
      duplicateEvent: (id) =>
        setState((s) => {
          const found = s.events.find((x) => x.id === id);
          if (!found) return s;
          return {
            ...s,
            events: [...s.events, { ...found, id: uid(), title: `${found.title} (copy)` }],
          };
        }),
      removeEvent: (id) => setState((s) => ({ ...s, events: s.events.filter((x) => x.id !== id) })),
      removeOccurrence: (id, isoDate) =>
        setState((s) => ({
          ...s,
          events: s.events.map((e) =>
            e.id === id ? { ...e, exceptions: [...(e.exceptions ?? []), isoDate] } : e,
          ),
        })),
      endSeriesBefore: (id, isoDate) =>
        setState((s) => ({
          ...s,
          events: s.events.map((e) => (e.id === id ? { ...e, until: addDays(isoDate, -1) } : e)),
        })),
      restoreEvent: (record) => setState((s) => ({ ...s, events: [...s.events, record] })),
      getEvent: (id) => state.events.find((x) => x.id === id),

      addMaterial: (input) => {
        const record: Material = { ...input, id: uid() };
        setState((s) => ({ ...s, materials: [...s.materials, record] }));
        return record;
      },
      updateMaterial: (id, patch) =>
        setState((s) => ({ ...s, materials: patchList(s.materials, id, patch) })),
      removeMaterial: (id) =>
        setState((s) => ({ ...s, materials: s.materials.filter((x) => x.id !== id) })),
      restoreMaterial: (record) => setState((s) => ({ ...s, materials: [...s.materials, record] })),
      uploadMaterial: async (file, input) => {
        if (demoMode) {
          const record: Material = { ...input, id: uid(), status: "Indexed" };
          setDemoState((s) => ({ ...s, materials: [...s.materials, record] }));
          return record;
        }
        if (!userId) throw new Error("Sign in before uploading a private material.");
        const id = uid();
        const storagePath = await uploadMaterialObject(userId, id, file);
        const record: Material = {
          ...input,
          id,
          storagePath,
          ...(file.type ? { mimeType: file.type } : {}),
          byteSize: file.size,
          status: "Processing",
        };
        setUserState((s) => ({ ...s, materials: [...s.materials, record] }));
        try {
          await ingestMaterial({
            data: {
              documentId: id,
              storagePath,
              originalFilename: file.name,
              title: record.name,
              subject: record.subjectSlug,
              documentType: record.type,
              ...(record.section ? { section: record.section } : {}),
              ...(record.notes ? { notes: record.notes } : {}),
            },
          });
          const indexed = { ...record, status: "Indexed" as const };
          setUserState((s) => ({
            ...s,
            materials: s.materials.map((item) => (item.id === id ? indexed : item)),
          }));
          return indexed;
        } catch (error) {
          const needsReview = { ...record, status: "Needs review" as const };
          setUserState((s) => ({
            ...s,
            materials: s.materials.map((item) => (item.id === id ? needsReview : item)),
          }));
          toast.error("The file is private in Supabase but local indexing failed", {
            description: error instanceof Error ? error.message : undefined,
          });
          return needsReview;
        }
      },

      addLink: (input) => {
        const record: SchoolLink = {
          ...input,
          id: uid(),
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
              { ...found, id: uid(), name: `${found.name} (copy)`, order: s.links.length },
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
  }, [state, setState, demoMode, setDemoMode, userId]);

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
