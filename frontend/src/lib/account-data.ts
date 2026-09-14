/**
 * Browser-side access to the signed-in user's Supabase profile and preferences.
 * Every call runs with the user's own session, so row-level security keeps the
 * data isolated per user. No secret keys are used here.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesUpdate } from "@/integrations/supabase/types";

export const AVATAR_BUCKET = "profile-avatars";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export interface AccountProfile {
  id: string;
  username: string;
  fullName: string;
  preferredName: string;
  photoPath: string;
  nationality: string;
  contactPhone: string;
  contactDetails: Record<string, string>;
}

/** The 10 selectable local Qwen models, largest first. */
export const QWEN_MODELS = [
  "Qwen/Qwen3.8-27B",
  "Qwen/Qwen3.5-27B",
  "Qwen/Qwen3-14B",
  "Qwen/Qwen3.5-9B",
  "Qwen/Qwen3-8B",
  "Qwen/Qwen3.5-4B",
  "Qwen/Qwen3-4B",
  "Qwen/Qwen3.5-2B",
  "Qwen/Qwen3-1.7B",
  "Qwen/Qwen3-0.6B",
] as const;

export type QwenModel = (typeof QWEN_MODELS)[number];

export interface UserPreferences {
  selected_qwen_model: string;
  exam_reminders: boolean;
  daily_study_summary: boolean;
  sound_effects: boolean;
  auto_storage_cleanup: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  selected_qwen_model: QWEN_MODELS[0],
  exam_reminders: true,
  daily_study_summary: true,
  sound_effects: false,
  auto_storage_cleanup: true,
};

function asRecord(value: Json | null | undefined): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function fetchAccountProfile(): Promise<AccountProfile | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const contactDetails = asRecord(data.contact_details ?? null);
  const normalisedContact: Record<string, string> = {};
  for (const [key, value] of Object.entries(contactDetails)) {
    normalisedContact[key] = asString(value);
  }

  return {
    id: userId,
    username: asString(data.username),
    fullName: asString(data.full_name),
    preferredName: asString(data.preferred_name),
    photoPath: asString(data.photo),
    nationality: asString(data.nationality),
    contactPhone: asString(data.contact_phone),
    contactDetails: normalisedContact,
  };
}

export async function updateAccountProfile(patch: {
  username?: string;
  fullName?: string;
  preferredName?: string;
  nationality?: string;
  contactPhone?: string;
  contactDetails?: Record<string, string>;
  photoPath?: string | null;
}): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("You are signed out.");

  const update: TablesUpdate<"profiles"> = {};
  // The production columns are NOT NULL, so cleared values are written as "".
  if (patch.username !== undefined) update["username"] = patch.username ?? "";
  if (patch.fullName !== undefined) update["full_name"] = patch.fullName ?? "";
  if (patch.preferredName !== undefined) update["preferred_name"] = patch.preferredName ?? "";
  if (patch.nationality !== undefined) update["nationality"] = patch.nationality ?? "";
  if (patch.contactPhone !== undefined) update["contact_phone"] = patch.contactPhone ?? "";
  if (patch.contactDetails !== undefined)
    update["contact_details"] = patch.contactDetails as unknown as Json;
  if (patch.photoPath !== undefined) update["photo"] = patch.photoPath ?? "";

  const { error } = await supabase.from("profiles").update(update).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

/** Signed URL for a private avatar object, or an empty string when unset. */
export async function avatarSignedUrl(photoPath: string): Promise<string> {
  if (!photoPath) return "";
  if (photoPath.startsWith("http") || photoPath.startsWith("data:")) return photoPath;
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(photoPath, 60 * 60);
  if (error) return "";
  return data?.signedUrl ?? "";
}

export async function uploadAvatar(file: File): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("You are signed out.");
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > AVATAR_MAX_BYTES) throw new Error("Profile pictures must be 2 MB or smaller.");

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const objectPath = `${userId}/avatar-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(objectPath, file, { contentType: file.type, upsert: true });
  if (error) throw new Error(error.message);

  const previous = await fetchAccountProfile();
  await updateAccountProfile({ photoPath: objectPath });
  if (previous?.photoPath && previous.photoPath !== objectPath) {
    await supabase.storage.from(AVATAR_BUCKET).remove([previous.photoPath]);
  }
  return objectPath;
}

export async function removeAvatar(): Promise<void> {
  const profile = await fetchAccountProfile();
  if (profile?.photoPath) {
    await supabase.storage.from(AVATAR_BUCKET).remove([profile.photoPath]);
  }
  await updateAccountProfile({ photoPath: null });
}

export async function fetchPreferences(): Promise<UserPreferences> {
  const userId = await getCurrentUserId();
  if (!userId) return DEFAULT_PREFERENCES;

  const { data, error } = await supabase
    .from("user_preferences")
    .select("preferences")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const stored = asRecord(data?.preferences ?? null);
  const bool = (key: keyof UserPreferences) =>
    typeof stored[key] === "boolean" ? (stored[key] as boolean) : DEFAULT_PREFERENCES[key];

  const model = asString(stored["selected_qwen_model"]);
  return {
    selected_qwen_model: (QWEN_MODELS as readonly string[]).includes(model)
      ? model
      : DEFAULT_PREFERENCES.selected_qwen_model,
    exam_reminders: bool("exam_reminders") as boolean,
    daily_study_summary: bool("daily_study_summary") as boolean,

    sound_effects: bool("sound_effects") as boolean,
    auto_storage_cleanup: bool("auto_storage_cleanup") as boolean,
  };
}

export async function savePreferences(next: Partial<UserPreferences>): Promise<UserPreferences> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("You are signed out.");

  const current = await fetchPreferences();
  const merged: UserPreferences = { ...current, ...next };

  const { error } = await supabase
    .from("user_preferences")
    .update({ preferences: merged as unknown as Json })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return merged;
}
