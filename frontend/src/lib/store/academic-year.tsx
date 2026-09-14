/** Local application-state types and persistence helpers. */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CURRENT_YEAR_ID, SCHOOL_YEARS } from "@/lib/mock/academic";
import type { SchoolYear } from "@/lib/mock/academic";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const KEY_PREFIX = "asa.year.v2";
const db = supabase as unknown as SupabaseClient;

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
  const [userId, setUserId] = useState<string | null>(null);
  const loadGeneration = useRef(0);

  useEffect(() => {
    const load = async (nextUserId: string | null) => {
      const generation = ++loadGeneration.current;
      setUserId(nextUserId);
      setYearIdState(CURRENT_YEAR_ID);
      if (!nextUserId) return;
      const key = `${KEY_PREFIX}.${nextUserId}`;
      const stored = window.localStorage.getItem(key);
      if (stored && SCHOOL_YEARS.some((year) => year.id === stored)) setYearIdState(stored);
      const { data, error } = await db
        .from("user_preferences")
        .select("academic_year")
        .eq("user_id", nextUserId)
        .maybeSingle();
      if (generation !== loadGeneration.current) return;
      if (error) {
        toast.error("The academic year could not be loaded from Supabase", {
          description: "Using this account's local preference.",
        });
        return;
      }
      const remote = data?.academic_year as string | undefined;
      if (remote && SCHOOL_YEARS.some((year) => year.id === remote)) {
        setYearIdState(remote);
        window.localStorage.setItem(key, remote);
      }
    };
    void supabase.auth.getSession().then(({ data }) => load(data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void load(session?.user.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AcademicYearValue>(() => {
    const year =
      SCHOOL_YEARS.find((y) => y.id === yearId) ?? SCHOOL_YEARS[SCHOOL_YEARS.length - 1]!;
    const setYearId = (id: string) => {
      setYearIdState(id);
      if (typeof window !== "undefined" && userId) {
        window.localStorage.setItem(`${KEY_PREFIX}.${userId}`, id);
        void db
          .from("user_preferences")
          .upsert({ user_id: userId, academic_year: id }, { onConflict: "user_id" })
          .then(({ error }) => {
            if (error) {
              toast.error("The academic year is saved locally but not yet in Supabase", {
                description: error.message,
              });
            }
          });
      }
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
  }, [userId, yearId]);

  return <AcademicYearContext.Provider value={value}>{children}</AcademicYearContext.Provider>;
}

export function useAcademicYear(): AcademicYearValue {
  const ctx = useContext(AcademicYearContext);
  if (!ctx) throw new Error("useAcademicYear must be used inside AcademicYearProvider");
  return ctx;
}
