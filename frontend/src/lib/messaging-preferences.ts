/**
 * Peer-message notification preferences (CURRENT SUPABASE, via
 * `user_preferences.preferences`). Thin, additive wrapper around the shared
 * account preferences helpers — no separate storage.
 */
import { fetchPreferences, savePreferences } from "@/lib/account-data";

export interface MessagingPreferences {
  /** Show an in-app unread badge / toast for new peer messages. */
  peerMessageNotifications: boolean;
  /** Ask the browser Notification API to show OS-level popups. Off by default. */
  browserMessageNotifications: boolean;
}

export async function getMessagingPreferences(): Promise<MessagingPreferences> {
  const prefs = await fetchPreferences();
  return {
    peerMessageNotifications: prefs.peer_message_notifications,
    browserMessageNotifications: prefs.browser_message_notifications,
  };
}

export async function saveMessagingPreferences(
  patch: Partial<MessagingPreferences>,
): Promise<MessagingPreferences> {
  const next = await savePreferences({
    ...(patch.peerMessageNotifications !== undefined
      ? { peer_message_notifications: patch.peerMessageNotifications }
      : {}),
    ...(patch.browserMessageNotifications !== undefined
      ? { browser_message_notifications: patch.browserMessageNotifications }
      : {}),
  });
  return {
    peerMessageNotifications: next.peer_message_notifications,
    browserMessageNotifications: next.browser_message_notifications,
  };
}
