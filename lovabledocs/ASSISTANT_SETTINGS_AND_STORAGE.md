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
- OAuth providers offered: **GitHub** (`github`), **LinkedIn** (`linkedin_oidc`),
  **Spotify** (`spotify`). `redirectTo` is always `window.location.origin`.
- No Google, Apple or Microsoft/Azure authentication exists anywhere in the UI
  or code. (The unrelated *Apple Reminders* planner preference is not auth.)

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

- `profiles(id, username, full_name, preferred_name, photo, nationality, contact_phone, contact_details jsonb, …)`
  — `photo` holds an object path inside the private `profile-avatars` bucket.
- `user_preferences(user_id, preferences jsonb)` — keys used by the UI:
  `selected_qwen_model`, `exam_reminders`, `daily_study_summary`,
  `apple_reminders_sync`, `sound_effects`, `auto_storage_cleanup`.
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

## Remaining backend work

- An assistant inference endpoint that reads `assistant_messages` and writes
  assistant-role rows.
- Parsing of `assistant_attachments` (`parse_status` stays `unparsed` today).
- Honouring `user_preferences.preferences.selected_qwen_model` in the model
  runtime.
