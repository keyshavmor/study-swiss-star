/** Supabase persistence boundary for the synchronous AppDataProvider API. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type {
  Assessment,
  DataState,
  Material,
  PlannerEvent,
  SchoolLink,
  StudentProfile,
} from "@/lib/store/types";
import { EMPTY_PROFILE, EMPTY_STATE } from "@/lib/store/types";

// The checked-in Database type reflects the last remotely generated schema.
// Regenerate it with the CLI immediately after the new migration is pushed.
// This deliberately untyped boundary keeps provisional migration types out of
// the generated file while preserving strong application-domain types here.
const db = supabase as unknown as SupabaseClient;

type Row = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function optionalNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

function optionalProperty<Key extends string, Value>(
  key: Key,
  value: Value | undefined,
): Partial<Record<Key, Value>> {
  return value === undefined ? {} : ({ [key]: value } as Record<Key, Value>);
}

function profileFromRow(row: Row | null): StudentProfile {
  if (!row) return { ...EMPTY_PROFILE };
  return {
    photo: text(row["photo"]),
    fullName: text(row["full_name"]),
    preferredName: text(row["preferred_name"]),
    dateOfBirth: text(row["date_of_birth"]),
    schoolName: text(row["school_name"]),
    schoolType: text(row["school_type"]),
    className: text(row["class_name"]),
    classTeacher: text(row["class_teacher"]),
    focusSubject: text(row["focus_subject"]),
    schoolEmail: text(row["school_email"]),
    studentNumber: text(row["student_number"]),
    username: text(row["username"]),
    language: text(row["language"]) || "English",
  };
}

function assertResult(error: { message: string } | null, operation: string): void {
  if (error) throw new Error(`${operation}: ${error.message}`);
}

export async function loadAppData(userId: string): Promise<DataState> {
  const [profile, assessments, events, materials, links, notifications] = await Promise.all([
    db.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    db.from("assessments").select("*").eq("user_id", userId).order("assessment_date"),
    db.from("planner_events").select("*").eq("user_id", userId).order("event_date"),
    db.from("documents").select("*").eq("user_id", userId).order("created_at"),
    db.from("school_links").select("*").eq("user_id", userId).order("sort_order"),
    db.from("notification_state").select("*").eq("user_id", userId),
  ]);

  assertResult(profile.error, "Load profile");
  assertResult(assessments.error, "Load assessments");
  assertResult(events.error, "Load planner");
  assertResult(materials.error, "Load materials");
  assertResult(links.error, "Load school links");
  assertResult(notifications.error, "Load notifications");

  const notificationRows = (notifications.data ?? []) as Row[];
  return {
    profile: profileFromRow((profile.data as Row | null) ?? null),
    assessments: ((assessments.data ?? []) as Row[]).map((row): Assessment => ({
      id: text(row["id"]),
      subjectSlug: text(row["subject_slug"]),
      title: text(row["title"]),
      type: text(row["assessment_type"]) as Assessment["type"],
      topic: text(row["topic"]),
      date: text(row["assessment_date"]),
      yearId: text(row["academic_year"]),
      points: optionalNumber(row["points"]),
      maxPoints: optionalNumber(row["max_points"]),
      teacherGrade: optionalNumber(row["teacher_grade"]),
      weight: Number(row["weight"] ?? 1),
      notes: text(row["notes"]),
      source: text(row["source"]) as Assessment["source"],
      includeInStats: row["include_in_stats"] !== false,
      ...optionalProperty("importedFrom", optionalText(row["imported_from"])),
    })),
    events: ((events.data ?? []) as Row[]).map((row): PlannerEvent => ({
      id: text(row["id"]),
      title: text(row["title"]),
      category: text(row["category"]) as PlannerEvent["category"],
      date: text(row["event_date"]),
      start: text(row["start_time"]).slice(0, 5),
      end: text(row["end_time"]).slice(0, 5),
      ...optionalProperty("subjectSlug", optionalText(row["subject_slug"])),
      ...optionalProperty("location", optionalText(row["location"])),
      ...optionalProperty(
        "travelMinutes",
        row["travel_minutes"] == null ? undefined : Number(row["travel_minutes"]),
      ),
      ...optionalProperty(
        "travelBefore",
        row["travel_before"] == null ? undefined : Number(row["travel_before"]),
      ),
      ...optionalProperty(
        "travelAfter",
        row["travel_after"] == null ? undefined : Number(row["travel_after"]),
      ),
      recurrence: text(row["recurrence"]) as PlannerEvent["recurrence"],
      weekdays: (row["weekdays"] as number[] | null) ?? [],
      ...optionalProperty("until", optionalText(row["until_date"])),
      exceptions: (row["exceptions"] as string[] | null) ?? [],
      overrides: (row["overrides"] as PlannerEvent["overrides"]) ?? {},
      ...optionalProperty("color", optionalText(row["color"])),
      ...optionalProperty("reminder", optionalText(row["reminder"])),
      ...optionalProperty("notes", optionalText(row["notes"])),
      done: row["done"] === true,
      generated: row["generated"] === true,
    })),
    materials: ((materials.data ?? []) as Row[]).map((row): Material => ({
      id: text(row["id"]),
      subjectSlug: text(row["subject_slug"]),
      name: text(row["title"]),
      type: text(row["document_type"]) as Material["type"],
      section: text(row["section"]) as Material["section"],
      ...optionalProperty("url", optionalText(row["source"])),
      ...optionalProperty("notes", optionalText(row["notes"])),
      status: text(row["status"]) as Material["status"],
      added: text(row["created_at"]).slice(0, 10),
      archived: row["archived"] === true,
      ...optionalProperty("storagePath", optionalText(row["object_path"])),
      ...optionalProperty("mimeType", optionalText(row["mime_type"])),
      ...optionalProperty(
        "byteSize",
        row["byte_size"] == null ? undefined : Number(row["byte_size"]),
      ),
    })),
    links: ((links.data ?? []) as Row[]).map((row): SchoolLink => ({
      id: text(row["id"]),
      name: text(row["name"]),
      url: text(row["url"]),
      category: text(row["category"]) as SchoolLink["category"],
      ...optionalProperty("description", optionalText(row["description"])),
      ...optionalProperty("icon", optionalText(row["icon"])),
      ...optionalProperty("subjectSlug", optionalText(row["subject_slug"])),
      accent: text(row["accent"]),
      order: Number(row["sort_order"] ?? 0),
      added: text(row["added_on"]),
      opens: Number(row["open_count"] ?? 0),
    })),
    readNotifications: notificationRows
      .filter((row) => row["read_at"] != null)
      .map((row) => text(row["notification_key"])),
    dismissedNotifications: notificationRows
      .filter((row) => row["dismissed_at"] != null)
      .map((row) => text(row["notification_key"])),
  };
}

async function syncRows(table: string, userId: string, rows: Row[], ids: string[]): Promise<void> {
  if (rows.length) {
    const { error } = await db.from(table).upsert(rows, { onConflict: "id" });
    assertResult(error, `Save ${table}`);
  }
  let deletion = db.from(table).delete().eq("user_id", userId);
  if (ids.length) deletion = deletion.not("id", "in", `(${ids.join(",")})`);
  const { error } = await deletion;
  assertResult(error, `Reconcile ${table}`);
}

export async function saveAppData(userId: string, state: DataState): Promise<void> {
  const profile = state.profile;
  const now = new Date().toISOString();
  const notificationKeys = Array.from(
    new Set([...state.readNotifications, ...state.dismissedNotifications]),
  );

  const operations: Promise<void>[] = [
    (async () => {
      const { error } = await db.from("profiles").upsert(
        {
          user_id: userId,
          photo: profile.photo,
          full_name: profile.fullName,
          preferred_name: profile.preferredName,
          date_of_birth: profile.dateOfBirth || null,
          school_name: profile.schoolName,
          school_type: profile.schoolType,
          class_name: profile.className,
          class_teacher: profile.classTeacher,
          focus_subject: profile.focusSubject,
          school_email: profile.schoolEmail,
          student_number: profile.studentNumber,
          username: profile.username,
          language: profile.language,
        },
        { onConflict: "user_id" },
      );
      assertResult(error, "Save profile");
    })(),
    syncRows(
      "assessments",
      userId,
      state.assessments.map((item) => ({
        id: item.id,
        user_id: userId,
        subject_slug: item.subjectSlug,
        title: item.title,
        assessment_type: item.type,
        topic: item.topic,
        assessment_date: item.date,
        academic_year: item.yearId,
        points: item.points,
        max_points: item.maxPoints,
        teacher_grade: item.teacherGrade,
        weight: item.weight,
        notes: item.notes,
        source: item.source,
        include_in_stats: item.includeInStats,
        imported_from: item.importedFrom ?? null,
      })),
      state.assessments.map((item) => item.id),
    ),
    syncRows(
      "planner_events",
      userId,
      state.events.map((item) => ({
        id: item.id,
        user_id: userId,
        title: item.title,
        category: item.category,
        event_date: item.date,
        start_time: item.start,
        end_time: item.end,
        subject_slug: item.subjectSlug ?? null,
        location: item.location ?? null,
        travel_minutes: item.travelMinutes ?? null,
        travel_before: item.travelBefore ?? null,
        travel_after: item.travelAfter ?? null,
        recurrence: item.recurrence,
        weekdays: item.weekdays ?? [],
        until_date: item.until ?? null,
        exceptions: item.exceptions ?? [],
        overrides: item.overrides ?? {},
        color: item.color ?? null,
        reminder: item.reminder ?? null,
        notes: item.notes ?? null,
        done: item.done ?? false,
        generated: item.generated ?? false,
      })),
      state.events.map((item) => item.id),
    ),
    syncRows(
      "documents",
      userId,
      state.materials.map((item) => ({
        id: item.id,
        user_id: userId,
        subject_slug: item.subjectSlug,
        document_type: item.type,
        title: item.name,
        source: item.url ?? null,
        storage_bucket: item.storagePath ? "user-materials" : null,
        object_path: item.storagePath ?? null,
        mime_type: item.mimeType ?? null,
        byte_size: item.byteSize ?? null,
        section: item.section,
        status: item.status,
        notes: item.notes ?? "",
        archived: item.archived ?? false,
      })),
      state.materials.map((item) => item.id),
    ),
    syncRows(
      "school_links",
      userId,
      state.links.map((item) => ({
        id: item.id,
        user_id: userId,
        name: item.name,
        url: item.url,
        category: item.category,
        description: item.description ?? null,
        icon: item.icon ?? null,
        subject_slug: item.subjectSlug ?? null,
        accent: item.accent,
        sort_order: item.order,
        added_on: item.added,
        open_count: item.opens,
      })),
      state.links.map((item) => item.id),
    ),
    (async () => {
      const { error: deleteError } = await db
        .from("notification_state")
        .delete()
        .eq("user_id", userId);
      assertResult(deleteError, "Reconcile notifications");
      if (!notificationKeys.length) return;
      const { error } = await db.from("notification_state").insert(
        notificationKeys.map((key) => ({
          user_id: userId,
          notification_key: key,
          read_at: state.readNotifications.includes(key) ? now : null,
          dismissed_at: state.dismissedNotifications.includes(key) ? now : null,
        })),
      );
      assertResult(error, "Save notifications");
    })(),
  ];
  await Promise.all(operations);
}

export async function uploadMaterialObject(
  userId: string,
  materialId: string,
  file: File,
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  const path = `${userId}/${materialId}/${safeName || "material"}`;
  const { error } = await supabase.storage
    .from("user-materials")
    .upload(path, file, file.type ? { contentType: file.type, upsert: false } : { upsert: false });
  assertResult(error, "Upload material");
  return path;
}

export function emptyAppData(): DataState {
  return { ...EMPTY_STATE, profile: { ...EMPTY_PROFILE } };
}
