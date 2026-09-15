/**
 * Per-browser-session admission state (CURRENT FRONTEND).
 *
 * Admission is granted by the future local backend for one browser session and
 * is therefore sessionStorage-scoped, never persisted to Supabase. A real
 * sign-out clears it. Absent state means the admission gate must run again.
 */

export const ADMISSION_SESSION_STORAGE_KEY = "alim.admission_session.v1";
export const ADMISSION_SESSION_EVENT = "alim:admission-session-changed";

export interface AdmissionSessionState {
  leaseId: string;
  expiresAt: string | null;
  heartbeatIntervalSeconds: number | null;
  admittedAt: string;
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readAdmissionSession(): AdmissionSessionState | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(ADMISSION_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const leaseId = parsed["leaseId"];
    if (typeof leaseId !== "string" || !leaseId) return null;
    const expiresAt = typeof parsed["expiresAt"] === "string" ? parsed["expiresAt"] : null;
    if (expiresAt && Date.parse(expiresAt) <= Date.now()) return null;
    return {
      leaseId,
      expiresAt,
      heartbeatIntervalSeconds:
        typeof parsed["heartbeatIntervalSeconds"] === "number"
          ? parsed["heartbeatIntervalSeconds"]
          : null,
      admittedAt: typeof parsed["admittedAt"] === "string" ? parsed["admittedAt"] : "",
    };
  } catch {
    return null;
  }
}

/** Only call after the backend explicitly returned `admitted` with a lease. */
export function markAdmitted(lease: {
  lease_id: string;
  expires_at: string | null;
  heartbeat_interval_seconds: number | null;
}): AdmissionSessionState {
  const state: AdmissionSessionState = {
    leaseId: lease.lease_id,
    expiresAt: lease.expires_at,
    heartbeatIntervalSeconds: lease.heartbeat_interval_seconds,
    admittedAt: new Date().toISOString(),
  };
  try {
    storage()?.setItem(ADMISSION_SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private-mode storage failures must not break the gate */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ADMISSION_SESSION_EVENT));
  }
  return state;
}

export function clearAdmissionSession(): void {
  try {
    storage()?.removeItem(ADMISSION_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ADMISSION_SESSION_EVENT));
  }
}

/** True when this browser session still has to pass the admission gate. */
export function admissionGateRequired(): boolean {
  return readAdmissionSession() === null;
}
