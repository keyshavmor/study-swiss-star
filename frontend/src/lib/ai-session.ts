/**
 * Per-browser-session AI availability state.
 *
 * Why sessionStorage: the language preference is durable and belongs in
 * Supabase, but AI readiness depends on local backend resources that can change
 * between sessions. Every NEW authenticated browser session must pass the model
 * readiness gate again, so this state is deliberately session-scoped and is
 * never written to localStorage or Supabase. Sign-out clears it.
 */

export const AI_SESSION_STORAGE_KEY = "alim.ai_session.v1";

export type AiSessionMode = "ai-ready" | "non-ai";

export interface AiSessionState {
  mode: AiSessionMode;
  /** Model confirmed ready by the backend; null in non-AI mode. */
  modelId: string | null;
  /** ISO timestamp of the decision, for diagnostics only. */
  decidedAt: string;
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readAiSession(): AiSessionState | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(AI_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const mode = parsed["mode"];
    if (mode !== "ai-ready" && mode !== "non-ai") return null;
    const modelId = typeof parsed["modelId"] === "string" ? parsed["modelId"] : null;
    if (mode === "ai-ready" && !modelId) return null;
    return {
      mode,
      modelId: mode === "ai-ready" ? modelId : null,
      decidedAt: typeof parsed["decidedAt"] === "string" ? parsed["decidedAt"] : "",
    };
  } catch {
    return null;
  }
}

function write(state: AiSessionState): AiSessionState {
  const store = storage();
  try {
    store?.setItem(AI_SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private-mode storage failures must not break the gate */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AI_SESSION_EVENT));
  }
  return state;
}

export const AI_SESSION_EVENT = "alim:ai-session-changed";

/** Only call after the backend explicitly confirmed the model is ready. */
export function markAiReady(modelId: string): AiSessionState {
  return write({ mode: "ai-ready", modelId, decidedAt: new Date().toISOString() });
}

/** The user chose (or was forced) to continue without AI for this session. */
export function markNonAi(): AiSessionState {
  return write({ mode: "non-ai", modelId: null, decidedAt: new Date().toISOString() });
}

export function clearAiSession(): void {
  const store = storage();
  try {
    store?.removeItem(AI_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AI_SESSION_EVENT));
  }
}

/** True when this browser session still has to pass the model readiness gate. */
export function modelGateRequired(): boolean {
  return readAiSession() === null;
}
