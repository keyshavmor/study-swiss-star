/**
 * Lightweight authenticated-session AI availability context.
 *
 * AI-dependent UI reads this instead of assuming AI works. The durable part of
 * the state lives in sessionStorage (see `ai-session.ts`); transient states
 * (`preparing`, `unavailable`) are in-memory only.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AI_SESSION_EVENT,
  clearAiSession,
  markAiReady,
  markNonAi,
  readAiSession,
} from "@/lib/ai-session";

export type AiAvailabilityStatus =
  /** No decision yet in this browser session — the model gate is required. */
  | "gate-required"
  /** A readiness check is running right now. */
  | "preparing"
  /** Backend confirmed a model is ready. */
  | "ready"
  /** The user continues without AI for this session. */
  | "non-ai"
  /** Backend unavailable or blocked; AI cannot be enabled right now. */
  | "unavailable";

export interface AiAvailabilityValue {
  status: AiAvailabilityStatus;
  modelId: string | null;
  /** Convenience: AI features may be used. */
  aiEnabled: boolean;
  setPreparing: () => void;
  setReady: (modelId: string) => void;
  setNonAi: () => void;
  setUnavailable: () => void;
  reset: () => void;
}

const AiAvailabilityContext = createContext<AiAvailabilityValue | null>(null);

const FALLBACK: AiAvailabilityValue = {
  status: "gate-required",
  modelId: null,
  aiEnabled: false,
  setPreparing: () => {},
  setReady: () => {},
  setNonAi: () => {},
  setUnavailable: () => {},
  reset: () => {},
};

export function AiAvailabilityProvider({ children }: { children: ReactNode }) {
  const [transient, setTransient] = useState<"preparing" | "unavailable" | null>(null);
  const [session, setSession] = useState<{
    mode: "ai-ready" | "non-ai";
    modelId: string | null;
  } | null>(null);

  const sync = useCallback(() => {
    const current = readAiSession();
    setSession(current ? { mode: current.mode, modelId: current.modelId } : null);
  }, []);

  useEffect(() => {
    sync();
    const handler = () => sync();
    window.addEventListener(AI_SESSION_EVENT, handler);
    return () => window.removeEventListener(AI_SESSION_EVENT, handler);
  }, [sync]);

  const value = useMemo<AiAvailabilityValue>(() => {
    let status: AiAvailabilityStatus;
    if (session?.mode === "ai-ready") status = "ready";
    else if (session?.mode === "non-ai") status = "non-ai";
    else if (transient) status = transient;
    else status = "gate-required";

    return {
      status,
      modelId: session?.mode === "ai-ready" ? session.modelId : null,
      aiEnabled: status === "ready",
      setPreparing: () => setTransient("preparing"),
      setReady: (modelId: string) => {
        setTransient(null);
        markAiReady(modelId);
      },
      setNonAi: () => {
        setTransient(null);
        markNonAi();
      },
      setUnavailable: () => setTransient("unavailable"),
      reset: () => {
        setTransient(null);
        clearAiSession();
      },
    };
  }, [session, transient]);

  return <AiAvailabilityContext.Provider value={value}>{children}</AiAvailabilityContext.Provider>;
}

export function useAiAvailability(): AiAvailabilityValue {
  return useContext(AiAvailabilityContext) ?? FALLBACK;
}
