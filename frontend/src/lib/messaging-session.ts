/**
 * Transient messaging state that must not survive sign-out (CURRENT FRONTEND).
 *
 * Unread state itself lives in Supabase (`peer_message_notifications`); this
 * module only holds per-session UI state and revocable object URLs created for
 * local attachment previews.
 */

export const MESSAGING_SESSION_STORAGE_KEY = "alim.messaging_session.v1";

const objectUrls = new Set<string>();

/** Tracks a preview URL so sign-out can revoke it. */
export function trackObjectUrl(url: string): string {
  objectUrls.add(url);
  return url;
}

export function revokeObjectUrl(url: string): void {
  objectUrls.delete(url);
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* ignore */
  }
}

export function revokeAllObjectUrls(): void {
  for (const url of [...objectUrls]) revokeObjectUrl(url);
}

/** Clears transient notification/preview state. Unread rows stay in Supabase. */
export function clearMessagingSessionState(): void {
  revokeAllObjectUrls();
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(MESSAGING_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
