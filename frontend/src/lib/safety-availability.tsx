/**
 * Session-scoped safety-check availability context (CURRENT FRONTEND).
 *
 * Tracks the last safety decision seen anywhere in the messaging UI so peers
 * of the composer (e.g. a banner near the top of the thread) can react
 * immediately, and so we fail closed consistently once the backend reports
 * `safety_unavailable`. This is intentionally local to the messages routes —
 * it is not wired into `__root.tsx`.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { SafetyDecision } from "@/lib/safety.types";

export type SafetyAvailabilityStatus = "unknown" | "available" | "unavailable";

export interface SafetyAvailabilityValue {
  status: SafetyAvailabilityStatus;
  lastDecision: SafetyDecision | null;
  reportDecision: (decision: SafetyDecision) => void;
  reset: () => void;
}

const SafetyAvailabilityContext = createContext<SafetyAvailabilityValue | null>(null);

const FALLBACK: SafetyAvailabilityValue = {
  status: "unknown",
  lastDecision: null,
  reportDecision: () => {},
  reset: () => {},
};

export function SafetyAvailabilityProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SafetyAvailabilityStatus>("unknown");
  const [lastDecision, setLastDecision] = useState<SafetyDecision | null>(null);

  const reportDecision = useCallback((decision: SafetyDecision) => {
    setLastDecision(decision);
    setStatus(decision.verdict === "safety_unavailable" ? "unavailable" : "available");
  }, []);

  const reset = useCallback(() => {
    setStatus("unknown");
    setLastDecision(null);
  }, []);

  const value = useMemo<SafetyAvailabilityValue>(
    () => ({ status, lastDecision, reportDecision, reset }),
    [status, lastDecision, reportDecision, reset],
  );

  return (
    <SafetyAvailabilityContext.Provider value={value}>{children}</SafetyAvailabilityContext.Provider>
  );
}

export function useSafetyAvailability(): SafetyAvailabilityValue {
  return useContext(SafetyAvailabilityContext) ?? FALLBACK;
}
