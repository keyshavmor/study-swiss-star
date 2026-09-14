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

## Migration source history

`drizzle/migrations/` records history and is never rewritten. `0002_assistant_settings_storage_management.sql`
still contains the old `apple_reminders_sync` preference default; a later migration applied directly in
the production project removed that key from `user_preferences.preferences` defaults and from existing
rows. The frontend no longer reads or writes it. Database and Storage changes are applied externally —
do not run migrations from the Lovable editor.
