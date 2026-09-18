/**
 * CENTRAL registry of every EXPECTED LOCAL BACKEND endpoint path.
 *
 * Nothing in the browser talks to the local Python backend directly: the
 * browser calls a TanStack server function, the server function forwards the
 * caller's already-verified Supabase bearer JWT server-to-server.
 *
 * BACKEND TODO FOR CODEX: none of the system/safety/messaging endpoints below
 * exist yet. Until they do, every call maps to an explicit "unavailable" state
 * — the frontend never fabricates admission, readiness or a safety verdict.
 */

/** Model preparation/readiness (see `model-backend.server.ts`). */
export const MODEL_ENDPOINTS = {
  status: "/api/model/status",
  prepare: "/api/model/prepare",
  operation: "/api/model/operation",
} as const;

/** System admission, health, session lease and load balancing. */
export const SYSTEM_ENDPOINTS = {
  admissionCheck: "/api/system/admission/check",
  health: "/api/system/health",
  sessionHeartbeat: "/api/system/session/heartbeat",
  runtimeRelease: "/api/system/runtime/release",
  modelRecommendation: "/api/system/model/recommendation",
} as const;

/** Content safety and peer-message delivery. */
export const SAFETY_ENDPOINTS = {
  moderate: "/api/safety/moderate",
  peerMessageSend: "/api/peer-messaging/send",
  attachmentScanStatus: "/api/safety/attachment-scan",
} as const;

/** Base URL of the local backend. Server-side only. */
export function localBackendBaseUrl(): string {
  const raw = process.env["ALIM_CONTEXT_BACKEND_URL"]?.trim() || "http://127.0.0.1:8001";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("ALIM_CONTEXT_BACKEND_URL must be an absolute loopback URL");
  }
  const host = url.hostname.toLowerCase();
  const loopback = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  if (
    url.protocol !== "http:" ||
    !loopback ||
    url.username ||
    url.password ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.search ||
    url.hash
  ) {
    throw new Error("ALIM_CONTEXT_BACKEND_URL must use loopback HTTP with no path or credentials");
  }
  return url.origin;
}

/** Default server-to-server timeout for local-backend calls. */
export function localBackendTimeoutMs(
  variable = "ALIM_MODEL_BACKEND_TIMEOUT_MS",
  fallback = 15_000,
): number {
  const value = Number(process.env[variable] ?? fallback);
  if (!Number.isFinite(value) || value < 100 || value > 300_000) {
    throw new Error(`${variable} must be between 100 and 300000 milliseconds`);
  }
  return value;
}
