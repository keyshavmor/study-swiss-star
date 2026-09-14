/** Disposable, per-user browser cache helpers; Supabase remains canonical. */
import type { DataState } from "./types.ts";
import { EMPTY_PROFILE, EMPTY_STATE } from "./types.ts";

const STORAGE_PREFIX = "asa.data.v3";

export interface CacheStorage {
  getItem(key: string): string | null;
}

export function appDataCacheKey(userId: string): string {
  return `${STORAGE_PREFIX}.${userId}`;
}

export function readCachedAppData(storage: CacheStorage, userId: string): DataState {
  try {
    const raw = storage.getItem(appDataCacheKey(userId));
    if (!raw) return { ...EMPTY_STATE, profile: { ...EMPTY_PROFILE } };
    const parsed = JSON.parse(raw) as Partial<DataState>;
    return {
      assessments: parsed.assessments ?? [],
      events: parsed.events ?? [],
      materials: parsed.materials ?? [],
      links: parsed.links ?? [],
      profile: { ...EMPTY_PROFILE, ...(parsed.profile ?? {}) },
      readNotifications: parsed.readNotifications ?? [],
      dismissedNotifications: parsed.dismissedNotifications ?? [],
    };
  } catch {
    return { ...EMPTY_STATE, profile: { ...EMPTY_PROFILE } };
  }
}
