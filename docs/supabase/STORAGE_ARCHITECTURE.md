Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# Storage architecture

CURRENT — SUPABASE (declared from frontend types and migration sources; not machine-verified this
pass). All buckets are **private**; none issue public URLs. See
`docs/supabase/STORAGE_ARCHITECTURE.mmd` for the bucket/consumer diagram and
`docs/supabase/STORAGE_LIFECYCLES.md` for the assistant-media retention lifecycle.

## `profile-avatars`

- **Purpose:** user profile pictures.
- **Private:** yes.
- **Path convention:** `<uid>/avatar-<timestamp>.<ext>` (`frontend/src/lib/account-data.ts:163`).
- **Owner:** the profile owner (`auth.uid()`).
- **Uploader:** the owner only, via `uploadAvatar()` (`frontend/src/lib/account-data.ts:156-176`).
- **Downloader:** the owner only, via a 1-hour signed URL (`avatarSignedUrl`,
  `frontend/src/lib/account-data.ts:146-154`) — never a public URL.
- **Deletion authority:** the owner, on avatar replace (old object removed) or explicit removal
  (`removeAvatar`, `frontend/src/lib/account-data.ts:178-184`).
- **Size limit:** 2 MiB (`AVATAR_MAX_BYTES = 2 * 1024 * 1024`, enforced client-side before upload).
- **MIME types:** any `image/*` (checked client-side: `file.type.startsWith("image/")`).
- **Retention policy:** kept indefinitely; superseded avatars are deleted immediately on replace.
- **Frontend feature:** `frontend/src/routes/_authenticated/profile.tsx`.
- **Backend responsibility:** none identified — fully frontend-managed.

## `user-materials`

- **Purpose:** private learning materials uploaded by the student for study/tutoring (feeds
  `documents`/`document_chunks`).
- **Private:** yes.
- **Path convention:** `<uid>/...` (`docs/archive/SUPABASE_SERVICES.md`).
- **Owner:** the uploading student.
- **Uploader:** the owner, through the study-materials upload flow (exact UI route not enumerated
  here; ingestion into `documents` is EXPECTED BACKEND CONTRACT for the local Python backend).
- **Downloader:** the owner only.
- **Deletion authority:** the owner, via `frontend/src/lib/storage-management.ts:149-195`
  (`deleteStorageItems`), which removes the Storage object before nulling the `documents` row's
  `object_path`/`storage_bucket` and marking it `status = "deleted"`.
- **Size limit:** none declared in frontend code for this bucket.
- **MIME types:** not restricted by the frontend beyond `kindFromMime()` classification for display.
- **Retention policy:** kept until the user deletes it or storage quota enforcement intervenes (see
  quota/emergency cleanup below). **Not** covered by the 30-minute assistant-media retention policy.
- **Frontend feature:** School/materials areas under `_authenticated/school.*`, storage management
  UI.
- **Backend responsibility:** ingestion into `documents`/`document_chunks` (EXPECTED BACKEND
  CONTRACT, BACKEND IMPLEMENTATION UNKNOWN for exact mechanics).

## `chat-attachments`

- **Purpose:** files attached to assistant/study chat messages.
- **Private:** yes.
- **Path convention:** `<uid>/<thread_id>/<file>` (`docs/archive/SUPABASE_SERVICES.md`;
  `CHAT_ATTACHMENT_BUCKET = "chat-attachments"` in `frontend/src/lib/storage-management.ts:11`).
- **Owner:** the sending user.
- **Uploader:** the owner, from the chat composer.
- **Downloader:** the owner only (thread ownership additionally enforced by `threads`/`messages`
  RLS and by `frontend/src/routes/api/chat.ts` ownership checks).
- **Deletion authority:** the owner, via `deleteStorageItems`.
- **Size limit:** `MEDIA_MAX_BYTES = 1 * 1024 * 1024` (1 MiB) —
  `frontend/src/lib/storage-management.ts:12`. This is the "assistant media 1 MiB" limit referenced
  across the app for attachment-class media.
- **MIME types:** classified via `kindFromMime()` (`image/*`, `audio/*`, `video/*`,
  pdf/word/officedocument/`text/*` as "document"), not hard-enforced beyond the byte limit.
- **Retention policy:** ordinary user-initiated chat attachments are retained under normal rules and
  are **not** subject to the 30-minute assistant-output-media policy (`STORAGE_LIFECYCLES.md`).
- **Frontend feature:** `_authenticated/chat.*`, `_authenticated/assistant.*`.
- **Backend responsibility:** attachment parsing (`assistant_attachments.parse_status`) — BACKEND
  IMPLEMENTATION UNKNOWN.

## `feedback-messages`

- **Purpose:** textual mirror of submitted feedback, for audit outside the `feedback` table.
- **Private:** yes.
- **Path convention:** `<user_id>/<YYYY-MM-DD>/<uuid>.txt` (`docs/archive/SUPABASE_SERVICES.md`).
- **Owner:** the submitting user (object path only; write is server-side).
- **Uploader:** the `feedback-submit` Edge Function only — never a direct client upload.
- **Downloader:** not exposed to end users; presumed admin/audit tooling outside the frontend.
- **Deletion authority:** not client-deletable or client-updatable (audit object).
- **Size limit:** none declared (bounded implicitly by the feedback form's own limits).
- **MIME types:** `.txt` mirror of the feedback message text.
- **Retention policy:** permanent audit trail (no deletion path documented).
- **Frontend feature:** `frontend/src/routes/_authenticated/feedback.tsx`.
- **Backend responsibility:** `feedback-submit` function writes both the `feedback` row and this
  object (CURRENT — EXTERNAL INTEGRATION).

## `activity-logs`

- **Purpose:** sanitized mirror of telemetry events, for audit outside `usage_events`.
- **Private:** yes.
- **Path convention:** `<user_id>/<YYYY-MM-DD>/<uuid>.log`.
- **Owner:** the acting user (or anonymous, for the two exempted pre-auth failure events).
- **Uploader:** the `activity-log` Edge Function only.
- **Downloader:** not exposed to end users; audit-only.
- **Deletion authority:** not client-deletable or client-updatable.
- **Size limit:** bounded by `telemetry.ts`'s own payload caps (`MAX_STRING = 200` chars,
  `MAX_PROPERTIES = 12`), not a Storage-level limit.
- **MIME types:** `.log` text.
- **Retention policy:** permanent audit trail.
- **Frontend feature:** every instrumented action across the app, via
  `frontend/src/lib/telemetry.ts`.
- **Backend responsibility:** `activity-log` function (CURRENT — EXTERNAL INTEGRATION).

## `assistant-descriptors`

- **Purpose:** text/markdown/json descriptors that stand in for assistant **output** media once the
  original binary is removed by the 30-minute retention policy. See `STORAGE_LIFECYCLES.md`.
- **Private:** yes; no signed URLs issued to unrelated users.
- **Path convention:** `<uid>/...` (`DESCRIPTOR_BUCKET = "assistant-descriptors"`,
  `frontend/src/lib/media-retention.ts:21`).
- **Owner:** the user who received the assistant-generated/fetched media.
- **Uploader:** BACKEND TODO FOR CODEX — no frontend code writes to this bucket; the frontend only
  records `descriptor_bucket`/`descriptor_path` in `media_retention_queue` after a descriptor is
  assumed to exist.
- **Downloader:** BACKEND TODO FOR CODEX (descriptor-based retrieval by later AI turns) — not
  implemented in the frontend today.
- **Deletion authority:** none declared; descriptors are expected to be permanent retrieval
  surfaces once the original media is gone.
- **Size limit:** "assistant media 1 MiB" applies to the *original* attachment-class media
  (`MEDIA_MAX_BYTES`); no separate limit is declared for descriptor text itself.
- **MIME types:** text/markdown/json (by design intent; not enforced in this repo since no writer
  exists yet).
- **Retention policy:** permanent (descriptors are the long-term retrieval surface after the
  30-minute-old binary is deleted).
- **Frontend feature:** none yet — `frontend/src/lib/media-retention.ts` only manages
  `media_retention_queue` rows.
- **Backend responsibility:** entirely BACKEND TODO FOR CODEX (see `STORAGE_LIFECYCLES.md`).

## Storage quota RPC and emergency cleanup

- **`get_storage_usage_status()`** — 1 GiB (1024\*1024\*1024 bytes) per-user quota RPC returning
  `quota_bytes/used_bytes/remaining_bytes/used_percent/remaining_percent/
  warning_threshold_reached/emergency_cleanup_needed`. Called from
  `frontend/src/lib/storage-management.ts:58-63` (`fetchStorageUsage`).
- **`storage-emergency-cleanup` Edge Function** — invoked from
  `frontend/src/lib/storage-management.ts:199` (`invokeEmergencyCleanup`) when usage crosses the
  emergency threshold. The frontend does not decide what gets removed; "the backend function
  decides what to remove" (inline comment, same file). Implementation is deployed externally — see
  `EDGE_FUNCTIONS.md`.
- **REMOVED — no per-user opt-out:** the `auto_storage_cleanup` preference key has been removed
  from `user_preferences.preferences` (CURRENT SUPABASE). There is no per-user toggle for storage
  cleanup any more; the global capacity cleanup described below is platform-wide and always on.

## Global storage capacity cleanup — CURRENT SUPABASE

See `docs/supabase/STORAGE_LIFECYCLES.md` ("Global storage capacity cleanup") and
`docs/sequences/STORAGE_CAPACITY_CLEANUP.mmd` for the full mechanism: a 5-minute cron-scheduled,
custom-authenticated Edge Function checks global Storage usage and, at or above 90% used, deletes
the globally oldest eligible objects in `user-materials` and `chat-attachments` (plus their
`documents` / `assistant_attachments` metadata rows, cascading `document_chunks`) down to roughly
80% used. It is platform-wide, not per-user, and not user-disableable. Auth, `profiles`,
`user_preferences` and `profile-avatars` are never cleanup targets.
