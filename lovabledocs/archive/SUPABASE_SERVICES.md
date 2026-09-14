> **DEPRECATED — ARCHIVED.** This document is historical and may contain
> statements that no longer match the implementation. Canonical replacement:
> `docs/supabase/SUPABASE_CURRENT_STATE.md`.
> Do not use this file for backend implementation decisions.

# Supabase Services Used by the Frontend

Production project: `ucacmeadsufiedxrgqit`. All database, Storage and Edge Function changes are
applied directly in that project; the frontend only consumes them. The Python backend is untouched
by everything on this page.

## Edge Functions

### `username-login`
- **Call:** `supabase.functions.invoke("username-login", { body: { username, password } })`
- **Returns:** `{ access_token, refresh_token }` on success; a generic invalid-credentials error
  otherwise (no account enumeration, no email in the response).
- **Frontend use:** the sign-in field is a single "Email or username" input. If it contains `@` the
  app calls `supabase.auth.signInWithPassword`; otherwise it invokes this function and then
  `supabase.auth.setSession({ access_token, refresh_token })` before landing on `/home`.

### `username-availability`
- **Call:** `supabase.functions.invoke("username-availability", { body: { username } })`
- **Returns:** `{ available: boolean, valid: boolean }`.
- **Frontend use:** sign-up calls it after the local format check and before
  `supabase.auth.signUp`. `available === false` shows "That username is already taken. Please pick
  another one."; if the function itself is unavailable the app continues and the unique index in the
  database stays the final authority — it never claims a name is taken on a failed check.

### `activity-log`
- **Call:** `supabase.functions.invoke("activity-log", { body: { event_name, feature?, subject?, properties? } })`
- **Effect:** writes a row to `public.usage_events` and a matching object to the private Storage
  bucket `activity-logs` at `<user_id>/<YYYY-MM-DD>/<uuid>.log`.
- **Anonymous access:** permitted only for `auth_signin_failed` and `oauth_signin_failed`.
- **Frontend use:** `frontend/src/lib/telemetry.ts`. Calls are fire-and-forget and never block or
  break the action that triggered them.
- **Payload policy:** the module drops forbidden keys, bounds strings and property counts, and sends
  only an error classification (`error_name`, and `error_status`/`error_code` when explicitly
  present) — never a raw `Error.message`, password, token, form value, chat prompt or response,
  document content, feedback text, or Google Calendar title/description/location.
- **Instrumented operations:** page views, global `error`/`unhandledrejection`, sign-in/sign-up/OAuth
  success and failure, sign-out, planner create/update/duplicate/delete/move/series changes,
  Google Calendar connect/sync/disconnect, feedback submit, settings/profile/preference saves, and
  assistant/chat send/complete/failure (status only).

### `feedback-submit`
- **Call:** authenticated `supabase.functions.invoke("feedback-submit", { body: { message, category, context } })`
- **Effect:** row in `public.feedback` plus a text mirror in the private `feedback-messages` bucket.
- **Frontend use:** `/feedback`.

## Private Storage buckets

| Bucket | Path convention | Contents |
| --- | --- | --- |
| `activity-logs` | `<user_id>/<YYYY-MM-DD>/<uuid>.log` | sanitized activity and error events |
| `feedback-messages` | `<user_id>/<YYYY-MM-DD>/<uuid>.txt` | textual copy of submitted feedback |
| `chat-attachments` | `<user_id>/<thread_id>/<file>` | assistant chat attachments |
| `user-materials` | `<user_id>/...` | private learning materials |
| `profile-avatars` | `<user_id>/...` | profile pictures (signed URLs only) |
| `assistant-descriptors` | `<user_id>/...` | text/markdown/json descriptors of assistant **output** media, referenced by `media_retention_queue`; private, no signed URLs issued to unrelated users |

None of these buckets is public. Objects are inserted under the caller's own `auth.uid()` prefix;
audit objects (`activity-logs`, `feedback-messages`) are not client-updatable or deletable.

## Telemetry policy

The following never leave the browser through telemetry: passwords, access/refresh/provider tokens,
form contents, chat prompts or responses, uploaded document contents, Google Calendar event titles,
descriptions or locations, and feedback message text. `telemetry.ts` additionally drops any property
key that looks sensitive, caps string length, and caps the number of properties per event.

Instrumented events include authentication success/failure, OAuth start/failure, sign-out, page
views, planner create/update/delete/duplicate/move, Google Calendar connect/sync/disconnect,
feedback submit success/failure, settings saves, and global `error` / `unhandledrejection` handlers.

## Admin access model

Cross-user reads of `public.feedback` and `public.usage_events` are granted only to accounts whose
immutable Supabase `app_metadata.role` equals `admin`. `user_metadata` is never trusted and a
username alone grants nothing.

Provisioning an admin (done outside the app, never in frontend code):

1. Create an auth user with a strong, unique password — optionally with username `admin`.
2. Set `app_metadata.role = "admin"` on that user through the Supabase Admin API.
3. Never store an admin password in the repository, documentation or environment files. A literal
   `admin` / `admin` credential is not acceptable.

## Google Calendar (read-only)

The planner links a Google identity to the existing Supabase user with
`supabase.auth.linkIdentity({ provider: "google", options: { scopes: "https://www.googleapis.com/auth/calendar.readonly", redirectTo: "<origin>/planner?google=connected" } })`.

The Google `provider_token` is kept only in `sessionStorage` (never in the database, `localStorage`
or telemetry) and cleared on sign-out or disconnect. Events are fetched from the Google Calendar v3
API for the visible planner range and merged into the Timetable, Day, Month and List views as
read-only occurrences with a Google badge. They are never written into editable planner state and
are never created, changed or deleted in Google.

If the Google provider or manual identity linking is not enabled, or the provider token is missing
or expired, the card shows a precise status explaining that Google Calendar OAuth must be configured
or reconnected. It never claims a successful sync and never shows fabricated events.

### External configuration still required

- Enable the `github`, `linkedin_oidc` and `spotify` providers with their client IDs and secrets.
- Enable the `google` provider, allow manual identity linking, and grant the
  `https://www.googleapis.com/auth/calendar.readonly` scope.
- Allow the app origin (and `/home`, `/planner`) in the redirect allowlist.

## `public.media_retention_queue` — FUTURE BACKEND / CODEX

Columns: `id uuid`, `user_id uuid`, `attachment_id uuid nullable`, `media_kind text`,
`storage_bucket text`, `object_path text`, `descriptor_bucket text`, `descriptor_path text`,
`source_url text nullable`, `source_path text nullable`, `status text`, `created_at timestamptz`,
`delete_after timestamptz default now() + 30 minutes`, `deleted_at timestamptz nullable`,
`error_code text nullable`.

This policy covers **assistant OUTPUT media only** — images, audio, video or other files the
assistant generates or fetches as part of a reply. It never applies to ordinary user study uploads
(`user-materials`, `chat-attachments`, `assistant_attachments`), which are retained under their
existing rules and are not queued here.

The frontend ships a typed helper, `frontend/src/lib/media-retention.ts`
(`enqueueAssistantMedia`, `listRetentionQueue`, `minutesUntilDeletion`, `isOriginalExpired`), that
can insert/list rows once a descriptor already exists in Supabase. Everything else is
`FUTURE BACKEND / CODEX (not implemented)`:

- Generating a text/markdown/json descriptor for a piece of assistant output media.
- Uploading that descriptor to the private `assistant-descriptors` bucket.
- Enqueueing a `media_retention_queue` row at generation time.
- The 30-minute cleanup worker that deletes the original object from `storage_bucket`/`object_path`
  after `delete_after` and stamps `deleted_at`/`error_code`.
- Descriptor-based retrieval — having later AI turns read the descriptor instead of the (possibly
  deleted) original media.

The local Python FastAPI backend does not create descriptors, enqueue rows, run the cleanup, or
retrieve by descriptor today.

## `user_preferences.preferences` — language and audio keys

Beyond the model/notification switches described in `ASSISTANT_SETTINGS_AND_STORAGE.md`, the JSONB
`preferences` column also holds:

- `app_language` — one of `en | de | ru | es | fr`, default `en`. Authoritative source for the
  frontend `I18nProvider` once a user is signed in.
- `assistant_audio_enabled` — boolean, default `true`. Gates the Listen/Stop control on assistant
  messages (frontend-only Web Speech API playback today).
- `assistant_audio_autoplay` — boolean, default `false`. When true, autoplays only newly completed
  assistant answers.

Reading/writing these keys is implemented in the frontend today; the local Python backend does not
yet read `app_language` when generating a response — see `FRONTEND_ARCHITECTURE.md` and
`SUBJECT_MODEL_AND_LANGUAGE_RULES.md` for the `FUTURE BACKEND / CODEX` language-honouring contract.

## Migration source history

`drizzle/migrations/` records history and is never rewritten. `0002_assistant_settings_storage_management.sql`
still contains the old `apple_reminders_sync` preference default; a later migration applied directly in
the production project removed that key from `user_preferences.preferences` defaults and from existing
rows. The frontend no longer reads or writes it. Database and Storage changes are applied externally —
do not run migrations from the Lovable editor.
