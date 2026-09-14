Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# Database schema

CURRENT — SUPABASE (declared from frontend types and migration sources; not machine-verified this
pass), except `threads`/`messages` DDL which is sourced directly from
`supabase/migrations/20260801092601_0c1ae180-35e2-49b7-bef2-22956fd8768e.sql` and is therefore the
most reliable table description in this document.

See `docs/supabase/DATABASE_ERD.mmd` for the entity-relationship diagram.

---

## `public.threads`

- **Purpose:** one row per tutoring chat session (subject-scoped Study chat, distinct from the
  general Assistant).
- **Primary key:** `id uuid default gen_random_uuid()`.
- **Ownership:** `user_id uuid not null references auth.users(id) on delete cascade`.
- **Important columns:** `title text not null default 'New study session'`, `subject text`,
  `created_at`, `updated_at` (bumped by trigger on new message).
- **Foreign keys:** `user_id → auth.users.id` (cascade delete).
- **Constraints:** none beyond not-null/PK/FK.
- **Indexes:** primary key only (no secondary index on `threads` itself).
- **RLS:** `FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`
  — per-user isolation, source: migration above.
- **Frontend consumers:** `frontend/src/routes/_authenticated/chat.index.tsx`,
  `frontend/src/routes/_authenticated/chat.$threadId.tsx`, `frontend/src/routes/api/chat.ts`
  (ownership check before insert).
- **Expected backend consumers:** the local Python context backend does not touch `threads`
  directly today (BACKEND IMPLEMENTATION UNKNOWN) — `frontend/src/routes/api/chat.ts` is the only
  writer/reader in-repo.

## `public.messages`

- **Purpose:** individual turns within a `threads` session.
- **Primary key:** `id uuid default gen_random_uuid()`.
- **Ownership:** `user_id uuid not null references auth.users(id) on delete cascade`.
- **Important columns:** `thread_id uuid not null references threads(id) on delete cascade`,
  `role text check (role in ('user','assistant','system','data'))`, `content text not null`,
  `parts jsonb default '[]'`, `created_at`.
- **Foreign keys:** `thread_id → threads.id` (cascade); composite relationship
  `(thread_id, user_id) → threads(id, user_id)` per
  `frontend/src/integrations/supabase/types.ts:339-347` (enforces a message's owner matches its
  thread's owner).
- **Constraints:** `role` CHECK constraint.
- **Indexes:** `messages_thread_id_created_at_idx` on `(thread_id, created_at)` for ordered
  thread-message loading (migration `20260801092601_...sql`).
- **RLS:** `FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`.
- **Trigger:** `messages_update_thread_updated_at` (AFTER INSERT) calls
  `public.update_thread_updated_at()` (SECURITY DEFINER, `search_path = public`, EXECUTE revoked
  from `anon`/`authenticated`/`PUBLIC` per the two follow-up migrations) to bump
  `threads.updated_at`.
- **Frontend consumers:** `frontend/src/routes/api/chat.ts` (inserts user + assistant messages),
  chat thread routes above.
- **Expected backend consumers:** none directly; the local Python backend receives message content
  via the `/api/chat` request body, not by reading this table itself (EXPECTED BACKEND CONTRACT).

## `public.assistant_threads`

- **Purpose:** one row per general-Assistant conversation (separate feature from Study `threads`).
- **Primary key:** `id`.
- **Ownership:** `user_id`.
- **Important columns:** `title`, `created_at`, `updated_at`.
- **Foreign keys:** none declared in frontend types (`Relationships: []`); ownership enforced by
  `user_id` convention only.
- **RLS (PREVIEW-ONLY):** single `ALL` policy `user_id = auth.uid()` TO authenticated, observed on
  the preview project; production expected to match but not confirmed.
- **Frontend consumers:** `frontend/src/routes/_authenticated/assistant.index.tsx`,
  `frontend/src/routes/_authenticated/assistant.$threadId.tsx`.
- **Expected backend consumers:** general-Assistant generation is BACKEND IMPLEMENTATION UNKNOWN —
  assistant rows are never fabricated client-side.

## `public.assistant_messages`

- **Purpose:** turns within an `assistant_threads` conversation.
- **Primary key:** `id`.
- **Ownership:** `user_id`.
- **Important columns:** `thread_id`, `role`, `content`, `parts jsonb`, `metadata jsonb`,
  `created_at`.
- **Foreign keys:** none declared (`Relationships: []`); `thread_id` is an informal reference to
  `assistant_threads.id`.
- **RLS (PREVIEW-ONLY):** `user_id = auth.uid()` ALL policy.
- **Frontend consumers:** Assistant routes above.
- **Expected backend consumers:** BACKEND IMPLEMENTATION UNKNOWN (assistant reply generation).

## `public.assistant_attachments`

- **Purpose:** metadata for files attached to (or produced within) an Assistant thread/message.
- **Primary key:** `id`.
- **Ownership:** `user_id`.
- **Important columns:** `thread_id`, `message_id`, `storage_bucket`, `object_path`, `file_name`,
  `mime_type`, `byte_size`, `kind`, `parse_status`, `metadata jsonb`, `created_at`,
  `deleted_at` (soft delete).
- **Foreign keys:** none declared in frontend types; `storage_bucket`/`object_path` point at a
  Storage object under the owner's `<uid>/...` prefix.
- **Frontend consumers:** `frontend/src/lib/storage-management.ts:83-107` (`listStorageItems`),
  `frontend/src/lib/storage-management.ts:149-195` (`deleteStorageItems`, soft-deletes via
  `deleted_at`).
- **Expected backend consumers:** attachment parsing (`parse_status`) is BACKEND IMPLEMENTATION
  UNKNOWN — the frontend never fabricates parsed content.

## `public.documents` and `public.document_chunks` — LOOSE-COLUMN CAVEAT

- **Purpose:** study/tutoring materials (`documents`) and their retrieval chunks
  (`document_chunks`), used by the context-retrieval backend for RAG-style answers.
- **Primary key:** `documents.id`, `document_chunks.id`.
- **Ownership:** `documents.user_id`; `document_chunks.user_id` (nullable) and
  `document_chunks.document_id → documents.id` (informal, not declared as a DB FK in frontend
  types).
- **Important columns:** beyond `id`/`user_id`/`created_at` (`documents`) and
  `id`/`document_id`/`user_id` (`document_chunks`), **all other columns are untyped
  (`[key: string]: Json | undefined`)** — column names vary per deployment. `documents.created_at`
  is nullable.
- **Why loose:** `frontend/src/integrations/supabase/types.ts:196-229` deliberately types these two
  tables as index signatures because the underlying schema differs across environments; consumers
  must read defensively.
- **Frontend consumers:** `frontend/src/lib/storage-management.ts:109-138` reads `documents` with
  `select("*")` and probes for `object_path`/`storage_path`/`storage_object_path`,
  `file_name`/`title`/`name`, `mime_type`/`content_type`, `byte_size`/`file_size`/`size_bytes`/`size`,
  `created_at`/`uploaded_at`, and soft-delete signals (`status`, `deleted_at`) — never assumes a
  fixed column set.
- **Expected backend consumers:** the local Python context backend is the presumed writer of
  `documents`/`document_chunks` content and embeddings (EXPECTED BACKEND CONTRACT); exact column
  names are BACKEND IMPLEMENTATION UNKNOWN from the frontend's perspective.

## `public.profiles`

- **Purpose:** one editable profile row per user (name, contact, avatar pointer).
- **Primary key:** `user_id` (functions as the row key; no separate `id` column in production,
  per `frontend/src/integrations/supabase/types.ts:78-116` and
  `frontend/src/lib/account-data.ts:92-96`). **Differs from the preview project**, which keys this
  table by `id` — PREVIEW-ONLY, do not assume for production.
- **Ownership:** `user_id` (implicitly `references auth.users(id)`).
- **Important columns:** `username`, `full_name`, `preferred_name`, `photo` (Storage object path in
  `profile-avatars`, not a URL), `nationality`, `contact_phone`, `contact_details jsonb`,
  `date_of_birth` (nullable), `created_at`, `updated_at`. All of the string columns are **NOT NULL**
  in production — the frontend writes `""` instead of `null` when a field is cleared
  (`frontend/src/lib/account-data.ts:130-139`).
- **Constraints:** `username` is expected to be unique (enforced by a DB unique constraint that is
  the final authority for the username-availability pre-check — see `AUTHENTICATION.md`); not
  independently confirmed against production DDL this pass.
- **RLS (PREVIEW-ONLY):** `ALL` policy `id = auth.uid()` on the preview project — note the preview
  project keys this table by `id`, so the equivalent production policy is expected to read
  `user_id = auth.uid()`.
- **Frontend consumers:** `frontend/src/lib/account-data.ts` (`fetchAccountProfile`,
  `updateAccountProfile`, `uploadAvatar`, `removeAvatar`),
  `frontend/src/routes/_authenticated/profile.tsx`.
- **Expected backend consumers:** none identified; profile management is frontend-only.

## `public.user_preferences`

- **Purpose:** per-user JSONB preference bag plus the selected academic year.
- **Primary key:** `user_id` (no separate `id` column).
- **Ownership:** `user_id`.
- **Important columns:** `academic_year text nullable`, `preferences jsonb`, `created_at`,
  `updated_at`.
- **RLS (PREVIEW-ONLY):** `ALL` policy `user_id = auth.uid()`.
- **Frontend consumers:** `frontend/src/lib/account-data.ts:186-235` (`fetchPreferences`,
  `savePreferences`, upserts on `user_id`). Full key contract:
  `docs/supabase/USER_PREFERENCES_CONTRACT.md`.
- **Expected backend consumers:** none read this table today (BACKEND TODO FOR CODEX — see
  `USER_PREFERENCES_CONTRACT.md`).

## `public.feedback`

- **Purpose:** in-app feedback submissions.
- **Primary key:** `id`.
- **Ownership:** `user_id` (all columns NOT NULL).
- **Important columns:** `category`, `message`, `context jsonb`, `created_at`.
- **Frontend consumers:** `frontend/src/routes/_authenticated/feedback.tsx` via the
  `feedback-submit` Edge Function (never a direct table write from the client — see
  `EDGE_FUNCTIONS.md`).
- **Admin access:** cross-user `SELECT` is granted only to accounts with immutable
  `app_metadata.role = "admin"` (`docs/archive/SUPABASE_SERVICES.md`).

## `public.usage_events`

- **Purpose:** telemetry sink written by the `activity-log` Edge Function.
- **Primary key:** `id`.
- **Ownership:** `user_id` (nullable — anonymous events are permitted only for
  `auth_signin_failed`/`oauth_signin_failed`).
- **Important columns:** `event_name`, `feature nullable`, `subject nullable`, `properties jsonb`,
  `occurred_at` (note: **no `created_at`** column on this table).
- **Frontend consumers:** written indirectly via `frontend/src/lib/telemetry.ts` →
  `activity-log` function; never read directly except by admins.
- **Admin access:** same `app_metadata.role = "admin"` rule as `feedback`.

## `public.media_retention_queue`

- **Purpose:** tracks assistant OUTPUT media (never ordinary user study uploads) that must be
  deleted 30 minutes after creation once a text descriptor exists. See
  `docs/supabase/STORAGE_LIFECYCLES.md` for the full lifecycle.
- **Primary key:** `id`.
- **Ownership:** `user_id`.
- **Important columns:** `attachment_id nullable`, `media_kind`, `storage_bucket`, `object_path`,
  `descriptor_bucket`, `descriptor_path nullable`, `source_url nullable`, `source_path nullable`,
  `status`, `created_at`, `delete_after default now() + 30 minutes`, `deleted_at nullable`,
  `error_code nullable`.
- **Frontend consumers:** `frontend/src/lib/media-retention.ts` (`enqueueAssistantMedia`,
  `listRetentionQueue`, `minutesUntilDeletion`, `isOriginalExpired`) — enqueues rows only once a
  descriptor path already exists; never generates descriptors itself.
- **Expected backend consumers:** BACKEND TODO FOR CODEX — descriptor generation, descriptor
  upload, the 30-minute cleanup worker, and descriptor-based retrieval are all unimplemented.

## RPC: `get_storage_usage_status()`

- **Signature:** `get_storage_usage_status(): StorageUsageStatus[]` (no arguments; SECURITY DEFINER
  presumed so it can aggregate the caller's own Storage usage — not independently confirmed).
- **Returns per row:** `quota_bytes`, `used_bytes`, `remaining_bytes`, `used_percent`,
  `remaining_percent`, `warning_threshold_reached`, `emergency_cleanup_needed` — a 1 GiB per-user
  quota (`frontend/src/integrations/supabase/types.ts:11-19`).
- **Frontend consumers:** `frontend/src/lib/storage-management.ts:58-63` (`fetchStorageUsage`),
  surfaced in `frontend/src/routes/_authenticated/settings.tsx` and/or profile storage UI.
- **Related:** `storage-emergency-cleanup` Edge Function, invoked at
  `frontend/src/lib/storage-management.ts:199` when `emergency_cleanup_needed` is true (see
  `EDGE_FUNCTIONS.md`).
