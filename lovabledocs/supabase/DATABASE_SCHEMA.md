Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
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


## Authenticated startup flow — CURRENT (2026-09-17)

Signed out → `/` (sign in / sign up; authentication NEVER waits on the local AI
backend) → `/onboarding/compliance` (durable, once, CURRENT SUPABASE
`account_compliance`) → **`/onboarding/language` — MANDATORY once per browser
session**: select a language (persists `user_preferences.preferences.app_language`
as the durable default) or explicitly skip → **`/onboarding/model` — MANDATORY
once per browser session**: system capability probe, recommendation, model
selection and prepare/poll; the app can be entered only after an explicit backend
`ready` confirmation (AI-ready) or an explicit "Continue without AI" (non-AI) →
`/home`.

- Session gates: `alim.language_session.v1` and `alim.ai_session.v1`
  (`sessionStorage`). They survive a refresh and are cleared on sign-out.
- `language_onboarding_completed` is LEGACY compatibility metadata only — it is
  NOT a gate. `selected_qwen_model` is a durable PREFERENCE and never means the
  model is ready. Runtime/model/GPU readiness is never stored in Supabase.
- Route order is enforced: opening `/onboarding/model` by hand with no language
  decision redirects to `/onboarding/language`, and product routes stay blocked
  until both decisions exist (`startupRedirectFor`, `_authenticated/route.tsx`).
- There is NO mandatory system-admission screen between language and model;
  capability, admission and recommendation data are shown on the model screen.
  `/onboarding/system-admission` remains an optional diagnostics surface.
- Model preparation (`/api/system/capability`, `/api/model/prepare`,
  `/api/model/operation`, `/api/system/release`) is REQUIRED FUTURE BACKEND
  (BACKEND TODO FOR CODEX). Unreachable / 404 / timeout / unparsable ⇒
  `backend_unavailable`, shown truthfully; no values are fabricated.
- Resource policy: 50/50/50 admission, 30/25/30 runtime floors — CURRENT SUPABASE
  `get_ai_runtime_policy()`. Model catalogue: CURRENT SUPABASE `ai_model_catalog`,
  hard-coded list is fallback only.
- AI-dependent actions (chat, quiz/exam generation, grading) are centrally guarded
  (`AiFeatureGate` / `useAiBlocked`): without an AI-ready session no request is
  issued and one localized red notice offers retry model setup, Settings, or
  continuing with non-AI features. Non-AI features stay fully usable.
- The per-user `auto_storage_cleanup` preference is REMOVED; cleanup is the
  platform-wide 5-minute cron in `docs/supabase/STORAGE_LIFECYCLES.md`.

Canonical: `docs/sequences/POST_LOGIN_STARTUP.mmd`,
`docs/sequences/LANGUAGE_ONBOARDING.mmd`,
`docs/backend-handoff/POST_LOGIN_LANGUAGE_MODEL_GATE_HANDOFF.md`.

## Compliance, safety & peer messaging

**Startup order (CURRENT FRONTEND / CURRENT SUPABASE, 2026-09-17):** signed out →
sign in/up → `/onboarding/compliance` (CURRENT SUPABASE flag
`account_compliance.compliance_onboarding_completed`, RPC
`complete_account_compliance_onboarding`) → `/onboarding/language` (MANDATORY
per-session decision) → `/onboarding/model` (MANDATORY per-session decision:
backend-confirmed `ready`, or explicit continue-without-AI) → `/home`. The system
admission gate is NOT part of this order any more; its data is shown on the model
screen and `/onboarding/system-admission` is optional. `account_compliance.account_status
= 'suspended_pending_review'` outranks every other route and redirects to
`/account/suspended`. Legal routes: `/legal/terms`, `/legal/privacy`,
`/legal/acceptable-use`, `/legal/child-safety`. See
`sequences/SIGNUP_ROLE_GUARDIAN_CONSENT.mmd`, `sequences/POST_LOGIN_STARTUP.mmd`.

## Per-user combined 50 MB quota (live: `add_per_user_combined_50mb_quota`)

- Limit 52 428 800 bytes (50 MiB, shown as 50 MB) across database rows AND
  Storage objects owned by one user.
- Warning threshold 47 185 920 bytes (90 %).
- `get_my_quota_status()` → JSON (`database_bytes`, `storage_bytes`,
  `total_bytes`, `limit_bytes`, `warning_threshold_bytes`, `remaining_bytes`,
  `usage_fraction`, `warning`, `at_limit`).
- `can_allocate_my_quota(p_additional_bytes bigint)` → boolean preflight.
- A trigger hard-guards inserts/updates on user-owned public tables;
  user-writable Storage policies run the same preflight. Both raise
  `user_data_quota_exceeded`.
- Ownerless system assets are not user data and are never counted or deleted.

Assessment tables present in the live schema: `quizzes`, `quiz_attempts`,
`mock_exams`, `mock_exam_attempts`, `grading_results`, `assessments`,
`study_plans` — RLS enabled, user-owned. Future assessment persistence extends
these; it must not create parallel tables.

Frontend contract: `docs/contracts/USER_QUOTA_CONTRACT.md`.
