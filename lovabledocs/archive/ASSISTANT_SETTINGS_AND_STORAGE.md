> **DEPRECATED — ARCHIVED.** This document is historical and may contain
> statements that no longer match the implementation. Canonical replacement:
> `docs/supabase/STORAGE_ARCHITECTURE.md and docs/supabase/USER_PREFERENCES_CONTRACT.md`.
> Do not use this file for backend implementation decisions.

# General Assistant, Settings and Storage Management

This document describes the frontend features added on top of the tutoring
experience, and the live Supabase schema they use. Assistant inference and
attachment parsing are deliberately still future backend work.

## Authentication (current state)

- Supabase Auth is the single source of truth. The frontend talks directly to
  the production Supabase project; Lovable Cloud Auth is not used.
- Email + password sign-up and sign-in.
- Password reset: `supabase.auth.resetPasswordForEmail(email, { redirectTo: <origin>/auth/update-password })`,
  then `/auth/update-password` calls `supabase.auth.updateUser({ password })`.
- Username sign-in: the single "Email or username" field routes usernames to the
  `username-login` Edge Function, then `supabase.auth.setSession`. Sign-up requires a
  username (`^[a-z0-9._-]{3,30}$`, normalized to lowercase) sent as
  `options.data.username`, and is checked first through the `username-availability`
  Edge Function so a taken name is reported clearly.
- OAuth providers offered: **GitHub** (`github`), **LinkedIn** (`linkedin_oidc`),
  **Spotify** (`spotify`), each with its real brand logo. `redirectTo` is
  `${window.location.origin}/home`.
- No Apple or Microsoft/Azure authentication exists anywhere in the UI or code.
  Google appears only as a read-only Google Calendar identity link in the planner —
  never as a sign-in method.

Provider client IDs/secrets and the redirect allow-list are configured in the
Supabase project itself; the callback is
`https://<project-ref>.supabase.co/auth/v1/callback`.

## Two separate chat data models

| Area | Route | Tables | Generation |
| --- | --- | --- | --- |
| Subject tutoring chat | `/chat`, `/chat/$threadId` | `threads`, `messages` | Existing tutoring endpoint |
| General assistant | `/assistant`, `/assistant/$threadId` | `assistant_threads`, `assistant_messages`, `assistant_attachments` | **Not connected yet** |

The general assistant never writes to the tutoring tables, and the tutoring
chat never writes to the `assistant_*` tables. The assistant UI stores user
messages and attachments and renders any assistant-role rows that later appear
in `assistant_messages`, so the local Python backend can write replies without
further frontend changes. No replies are fabricated in the frontend.

## Live schema used by the frontend

- `profiles(user_id, username, full_name, preferred_name, photo, nationality, contact_phone, contact_details jsonb, …)`
  — `photo` holds an object path inside the private `profile-avatars` bucket.
- `user_preferences(user_id, preferences jsonb)` — keys used by the UI:
  `selected_qwen_model`, `exam_reminders`, `daily_study_summary`,
  `sound_effects`, `auto_storage_cleanup`, `app_language` (one of `en`/`de`/`gsw`/`ru`/`es`/`fr`/`it`,
  authoritative for the app-wide `I18nProvider`), `assistant_audio_enabled` (default `true`)
  and `assistant_audio_autoplay` (default `false`).
- `feedback(id, user_id, category, message, context jsonb, created_at)` — every column
  is `NOT NULL` — and
  `usage_events(id, user_id nullable, event_name, feature, subject, properties jsonb NOT NULL, occurred_at)`
  — the timestamp is `occurred_at`, there is no `created_at`
  — written through the `feedback-submit` and `activity-log` Edge Functions.
- `assistant_threads(id, user_id, title, created_at, updated_at)`
- `assistant_messages(id, thread_id, user_id, role, content, parts, metadata, created_at)`
- `assistant_attachments(id, user_id, thread_id, message_id, storage_bucket, object_path, file_name, mime_type, byte_size, kind, parse_status, metadata, created_at, deleted_at)`
- `documents` / `document_chunks` — study-material side, read-only for the
  storage list (rows without a storage path are ignored).
- RPC `get_storage_usage_status()` — quota/used/remaining bytes, percentages and
  the `warning_threshold_reached` / `emergency_cleanup_needed` flags.
- Edge Function `storage-emergency-cleanup` (JWT verified).

### Storage buckets

| Bucket | Visibility | Path convention | Notes |
| --- | --- | --- | --- |
| `profile-avatars` | private | `<uid>/avatar-<ts>.<ext>` | images ≤ 2 MB, shown via signed URL |
| `chat-attachments` | private | `<uid>/<threadId>/<ts>-<rand>-<name>` | 50 MiB bucket ceiling; UI + DB enforce ≤ 1 MiB for image/audio/video |
| `user-materials` | private | `<uid>/…` | unchanged study materials |

## Settings sections (`/settings`)

1. **Account** — avatar upload/remove, username, full name, nationality,
   contact phone, address and guardian contact (`contact_details`), email change
   through `supabase.auth.updateUser({ email })` (verification required), and
   password change through `supabase.auth.updateUser({ password })`. Passwords
   are never stored in the database.
2. **Local model** — 10 Qwen choices, largest first: `Qwen/Qwen3.8-27B`,
   `Qwen/Qwen3.5-27B`, `Qwen/Qwen3-14B`, `Qwen/Qwen3.5-9B`, `Qwen/Qwen3-8B`,
   `Qwen/Qwen3.5-4B`, `Qwen/Qwen3-4B`, `Qwen/Qwen3.5-2B`, `Qwen/Qwen3-1.7B`,
   `Qwen/Qwen3-0.6B`. Selection only — model execution stays in the Python
   backend.
3. **Preferences** — the four existing switches plus automatic-cleanup, all
   persisted in `user_preferences.preferences`.
4. **Storage** — usage bar from `get_storage_usage_status()`, prominent warning
   at ≤ 10% remaining, filters by type and date range, multi-select deletion
   with confirmation. Deletion always calls Storage `.remove()` first and then
   reconciles metadata (`assistant_attachments.deleted_at`, documents lose their
   storage pointer and are marked deleted). `storage.objects` is never written
   directly, and a path whose first segment is not the user's own id is refused.
   At ≤ 1% remaining the UI invokes `storage-emergency-cleanup` once per session
   and refreshes usage; that cleanup is platform-wide, removes the oldest
   eligible study/chat files (~5% of stored bytes) and excludes profile avatars
   and account-critical data.

## Frontend modules

| File | Responsibility |
| --- | --- |
| `src/components/AuthForm.tsx` | email/password, reset, GitHub/LinkedIn/Spotify |
| `src/routes/auth.update-password.tsx` | post-recovery password update |
| `src/lib/account-data.ts` | profile + preferences + avatar storage |
| `src/lib/storage-management.ts` | usage RPC, item listing, deletion, cleanup |
| `src/lib/assistant-data.ts` | assistant threads/messages/attachments |
| `src/components/assistant/AssistantChat.tsx` | assistant workspace UI |
| `src/components/app/SettingsSections.tsx` | account/model/preferences/storage |

## Audio (Listen / Stop) — implemented, frontend-only

Completed assistant messages get a Listen/Stop control backed by the browser Web Speech API
(`frontend/src/lib/speech.ts`, `speak`/`stopSpeaking`/`speechSupported`). Nothing is uploaded or
persisted: playback is entirely ephemeral and client-side. `assistant_audio_enabled` gates whether
the control appears at all; `assistant_audio_autoplay` (default off) autoplays only newly
completed answers, never historical ones on load. When the API is unavailable the control shows a
graceful "not supported" state rather than failing silently. The local Python backend is not
involved and does not produce audio today.

## Help — implemented, frontend-only

`/help` no longer has a "Contact support" call to action. It instead links seven static A4 PDF
user guides, one per supported language, served as static assets from
`frontend/public/help-guides/alim-user-guide-{en,de,gsw,ru,es,fr,it}.pdf`.

## Media retention (assistant output media) — FUTURE BACKEND / CODEX

Production Supabase has `public.media_retention_queue` (`id, user_id, attachment_id nullable,
media_kind, storage_bucket, object_path, descriptor_bucket, descriptor_path, source_url nullable,
source_path nullable, status, created_at, delete_after default now()+30 minutes, deleted_at
nullable, error_code nullable`) and a private `assistant-descriptors` bucket. The policy applies
only to assistant **output** media, never ordinary user study uploads: a text descriptor is
retained first (plus `source_url`/`source_path` when the media was fetched rather than generated),
the original becomes eligible for deletion 30 minutes after creation, and later AI retrieval uses
the descriptor. The frontend offers a typed helper, `frontend/src/lib/media-retention.ts`
(`enqueueAssistantMedia`, `listRetentionQueue`, `minutesUntilDeletion`, `isOriginalExpired`), for
enqueueing rows once a descriptor already exists. Descriptor **generation**, descriptor **upload**,
**enqueueing on generation**, the 30-minute **cleanup** worker, and descriptor-based **retrieval**
are all `FUTURE BACKEND / CODEX` responsibilities — none of them are implemented today.

## Remaining backend work

- An assistant inference endpoint that reads `assistant_messages` and writes
  assistant-role rows.
- Parsing of `assistant_attachments` (`parse_status` stays `unparsed` today).
- Honouring `user_preferences.preferences.selected_qwen_model` in the model
  runtime.
- Response-language precedence (`ui_language`/`message_language` → `response_language`) — see
  `API_EXPECTATIONS.md`.
- Media retention: descriptor generation/upload, enqueueing, the 30-minute cleanup worker, and
  descriptor-based retrieval — see `SUPABASE_SERVICES.md` and `BACKEND_INTEGRATION_TODO.md`.
