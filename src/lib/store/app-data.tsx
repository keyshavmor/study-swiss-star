import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createDemoState } from "@/lib/store/demo-data";
import type { Assessment, DataState, Material, PlannerEvent } from "@/lib/store/types";
import { EMPTY_STATE } from "@/lib/store/types";

const STORAGE_KEY = "asa.data.v1";
const DEMO_KEY = "asa.demo.v1";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
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

  clearAll: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

function readStored(): DataState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<DataState>;
    return {
      assessments: parsed.assessments ?? [],
      events: parsed.events ?? [],
      materials: parsed.materials ?? [],
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
        state.assessments.length > 0 || state.events.length > 0 || state.materials.length > 0,

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
        return record;
      },
      updateEvent: (id, patch) => setState((s) => ({ ...s, events: patchList(s.events, id, patch) })),
      duplicateEvent: (id) =>
        setState((s) => {
          const found = s.events.find((x) => x.id === id);
          if (!found) return s;
          return { ...s, events: [...s.events, { ...found, id: uid("e"), title: `${found.title} (copy)` }] };
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
          events: s.events.map((e) => {
            if (e.id !== id) return e;
            const day = new Date(`${isoDate}T00:00:00`);
            day.setDate(day.getDate() - 1);
            return { ...e, until: day.toISOString().slice(0, 10) };
          }),
        })),
      restoreEvent: (record) => setState((s) => ({ ...s, events: [...s.events, record] })),
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
      restoreMaterial: (record) =>
        setState((s) => ({ ...s, materials: [...s.materials, record] })),

      clearAll: () => setState(() => ({ assessments: [], events: [], materials: [] })),
    };
  }, [state, setState, demoMode, setDemoMode]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useAppData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useAppData must be used inside AppDataProvider");
  return ctx;
}

/** Expands weekly recurrence into concrete occurrences inside a date range. */
export function occurrencesInRange(
  events: PlannerEvent[],
  fromIso: string,
  toIso: string,
): { event: PlannerEvent; date: string }[] {
  const out: { event: PlannerEvent; date: string }[] = [];
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);

  for (const event of events) {
    const start = new Date(`${event.date}T00:00:00`);
    if (event.recurrence === "none") {
      if (start >= from && start <= to) out.push({ event, date: event.date });
      continue;
    }
    const until = event.until ? new Date(`${event.until}T00:00:00`) : null;
    const cursor = new Date(start);
    while (cursor < from) cursor.setDate(cursor.getDate() + 7);
    while (cursor <= to) {
      if (until && cursor > until) break;
      const iso = cursor.toISOString().slice(0, 10);
      if (!(event.exceptions ?? []).includes(iso)) out.push({ event, date: iso });
      cursor.setDate(cursor.getDate() + 7);
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.event.start.localeCompare(b.event.start));
}
