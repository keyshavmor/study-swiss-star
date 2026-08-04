import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CURRENT_YEAR_ID, SCHOOL_YEARS } from "@/lib/mock/academic";
import type { SchoolYear } from "@/lib/mock/academic";

const KEY = "asa.year.v1";

interface AcademicYearValue {
  yearId: string;
  year: SchoolYear;
  /** "Academic Year 2026–27 · Grade 11" */
  yearLabel: string;
  years: SchoolYear[];
  setYearId: (id: string) => void;
  /** Move one year back/forward in the list; no-op at the edges. */
  step: (delta: number) => void;
  isCurrent: boolean;
}

const AcademicYearContext = createContext<AcademicYearValue | null>(null);

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const [yearId, setYearIdState] = useState(CURRENT_YEAR_ID);

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY);
    if (stored && SCHOOL_YEARS.some((y) => y.id === stored)) setYearIdState(stored);
  }, []);

  const value = useMemo<AcademicYearValue>(() => {
    const year = SCHOOL_YEARS.find((y) => y.id === yearId) ?? SCHOOL_YEARS[SCHOOL_YEARS.length - 1]!;
    const setYearId = (id: string) => {
      setYearIdState(id);
      if (typeof window !== "undefined") window.localStorage.setItem(KEY, id);
    };
    const index = SCHOOL_YEARS.findIndex((y) => y.id === year.id);
    return {
      yearId: year.id,
      year,
      yearLabel: `${year.label} · ${year.gradeLevel}`,
      years: SCHOOL_YEARS,
      setYearId,
      step: (delta) => {
        const next = SCHOOL_YEARS[index + delta];
        if (next) setYearId(next.id);
      },
      isCurrent: year.id === CURRENT_YEAR_ID,
    };
  }, [yearId]);

  return (
    <AcademicYearContext.Provider value={value}>{children}</AcademicYearContext.Provider>
  );
}

export function useAcademicYear(): AcademicYearValue {
  const ctx = useContext(AcademicYearContext);
  if (!ctx) throw new Error("useAcademicYear must be used inside AcademicYearProvider");
  return ctx;
}
