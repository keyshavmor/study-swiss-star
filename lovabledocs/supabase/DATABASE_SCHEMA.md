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


## Added this pass — authenticated startup flow

Signed out → `/` → `/onboarding/language` (once, CURRENT SUPABASE flag
`language_onboarding_completed`) → `/onboarding/model` (every new browser session, CURRENT
FRONTEND sessionStorage gate `alim.ai_session.v1`) → `/home`. Guard: `_authenticated/route.tsx`.
Model preparation backend (`/api/model/prepare`, `/api/model/operation`) is EXPECTED LOCAL BACKEND
CONTRACT / BACKEND TODO FOR CODEX. Resource policy: 50/50/50 admission, 30/25/30 runtime floors —
CURRENT SUPABASE `get_ai_runtime_policy()`. Model catalog: CURRENT SUPABASE `ai_model_catalog`
(10 Qwen entries), hard-coded list is fallback only. The per-user `auto_storage_cleanup`
preference is REMOVED; storage cleanup is now the platform-wide 5-minute cron job described in
`docs/supabase/STORAGE_LIFECYCLES.md`. See `docs/sequences/POST_LOGIN_STARTUP.mmd`,
`LANGUAGE_ONBOARDING.mmd`, `MODEL_SELECTION_READINESS.mmd`, `MODEL_CACHED_SHARED_DOWNLOAD.mmd`,
`RESOURCE_BLOCKED_NON_AI.mmd`, `SETTINGS_MODEL_RETRY.mmd`, `MODEL_DOWNLOAD_DEDUPLICATION.mmd`,
`AI_SESSION_STATE_MACHINE.mmd`, `STORAGE_CAPACITY_CLEANUP.mmd`.

## Compliance, system admission, safety & peer messaging (this pass)

**Startup order (CURRENT FRONTEND / CURRENT SUPABASE):** signed out → sign in/up →
`/onboarding/compliance` (gated on CURRENT SUPABASE flag
`account_compliance.compliance_onboarding_completed`, RPC
`complete_account_compliance_onboarding`) → `/onboarding/language` → SYSTEM ADMISSION gate
(`/onboarding/system-admission`, every new browser session, sessionStorage lease
`alim.admission_session.v1`, FAILS CLOSED — EXPECTED LOCAL BACKEND CONTRACT) → model readiness gate
(`alim.ai_session.v1`) → `/home`. `account_compliance.account_status = 'suspended_pending_review'`
outranks every other route and redirects to `/account/suspended`. New legal routes:
`/legal/terms`, `/legal/privacy`, `/legal/acceptable-use`, `/legal/child-safety`. See
`sequences/SIGNUP_ROLE_GUARDIAN_CONSENT.mmd`,
`sequences/STARTUP_COMPLIANCE_LANGUAGE_ADMISSION_MODEL_HOME.mmd`.

**System admission (EXPECTED LOCAL BACKEND CONTRACT, policy is CURRENT SUPABASE via
`get_system_admission_policy()`):** max 10 admitted users; login requires ≥50% free GPU/RAM/local
disk; automatic model rebalancing preserves in-flight requests and queues new allocations; health
informs model recommendation. Effective utilisation ceiling reconciles the earlier free-floor
policy (GPU≥30% free, RAM≥25% free, storage≥30% free) with the new 75%-used ceiling as an
ADDITIONAL cap: effective max used = GPU 70%, RAM 75%, storage 70%. See
`sequences/ADMISSION_MAX10_LOGIN50_RULE.mmd`, `sequences/EFFECTIVE_CAPS_75_VS_30_25_30_FLOORS.mmd`,
`sequences/MODEL_LOAD_BALANCING_LIGHTER_ASSIGNMENT.mmd`,
`sequences/INFLIGHT_PRESERVE_NEWCOMER_QUEUE_SAFE_REBALANCE.mmd`,
`sequences/SYSTEM_HEALTH_AGGREGATION.mmd`. New route: `/system-health`.

**Content safety (EXPECTED LOCAL BACKEND CONTRACT; queue/strike tables are CURRENT SUPABASE):**
verdicts `allow | block_warning | block_suspend_pending_review | safety_unavailable | scanning`.
First CONFIRMED violation blocks content and records a warning; second CONFIRMED violation sets
`suspended_pending_review` and, for students, queues a `guardian_notification_queue` item for
HUMAN review only — no automatic permanent deletion, no guardian disclosure from an unreviewed AI
classification. `apply_confirmed_safety_strike(...)` is service-role only, never callable from the
browser. Age-appropriate curriculum discussion of history/war/medicine/sexual health is explicitly
allowed; explicit/graphic/instructional/glorifying content unsuitable for minors is blocked. See
`sequences/FIRST_SAFETY_STRIKE.mmd`, `sequences/SECOND_STRIKE_SUSPENSION_GUARDIAN_REVIEW.mmd`.

**Peer messaging (CURRENT SUPABASE reads; sends are EXPECTED LOCAL BACKEND CONTRACT):** exact
username discovery only (`find_peer_by_exact_username`, no directory);
`get_or_create_direct_peer_conversation(p_username)` (returns a ROW SET of
`conversation_id, peer_user_id, peer_username, peer_preferred_name` — NOT a bare id string) and
`mark_peer_conversation_read(p_conversation_id)` (returns `void`); tables
`peer_conversations` (`id, conversation_type, created_by, direct_key, title, created_at,
updated_at` — there is NO `kind` and NO `last_message_at`; lists sort by `updated_at`),
`peer_conversation_members` (`conversation_id, user_id, member_role, joined_at, last_read_at,
muted, left_at`), `peer_messages` (`sender_user_id`, `moderation_status`, `moderation_event_id` —
there is NO `sender_id` and NO `safety_verdict`), `peer_message_attachments` (`owner_user_id`,
with NO `scan_status` column: openability follows the parent message's `moderation_status`),
`peer_message_notifications`, all RLS-scoped by membership. Direct client writes to messages and
attachments are intentionally disabled — only the local backend, after an `allow` verdict, may
persist them via `sendPeerMessage`. Attachments: private bucket `peer-message-attachments`, hard
250000-byte limit, PDF/DOC/DOCX/JPEG/PNG/WEBP allow-list, client-side compression ladder before
upload, no authenticated direct upload. New preferences: `peer_message_notifications` (default
true), `browser_message_notifications` (default false). New routes: `/messages`,
`/messages/$conversationId`. See `sequences/PEER_CHAT_CREATION_BY_USERNAME.mmd`,
`sequences/PEER_MESSAGE_MODERATION_SEND_NOTIFY.mmd`,
`sequences/ATTACHMENT_COMPRESS_SCAN_STORE.mmd`,
`sequences/OFFLINE_MESSAGE_NEXT_LOGIN_UNREAD.mmd`,
`sequences/MESSAGING_STORAGE_RLS_BOUNDARIES.mmd`.

**Endpoints (EXPECTED LOCAL BACKEND CONTRACT, centralised in
`frontend/src/lib/local-backend-endpoints.ts`):** `/api/model/*`,
`/api/system/admission/check`, `/api/system/health`, `/api/system/session/heartbeat`,
`/api/system/runtime/release`, `/api/system/model/recommendation`, `/api/safety/moderate`,
`/api/peer-messaging/send`, `/api/safety/attachment-scan`. The browser never talks to the local
backend directly: a TanStack server function forwards the caller's already-verified Supabase
bearer JWT server-to-server; `X-Student-Id` is context/cross-check only, never an authorization
boundary; no service-role key is used anywhere in this path.

**Sign-out (CURRENT FRONTEND; sweeper is BACKEND TODO FOR CODEX):** best-effort runtime release
call while the token is still valid, then Supabase `signOut()`, then clearing the AI session,
admission lease, Google token, transient messaging state and object URLs. A heartbeat/lease-TTL
sweeper that reclaims an abandoned session's model process/VRAM, session CPU/context RAM and
temporary local artifacts when the browser closes mid-flight is **not implemented** anywhere in
this repository. See `sequences/RELEASE_MY_MODEL.mmd`,
`sequences/SIGNOUT_RUNTIME_RELEASE_LEASE_TTL_FALLBACK.mmd`.

**Data rights (CURRENT SUPABASE, verified 2026-09-15):** `get_user_visible_supabase_health()`
returns ONE JSON object with the nested groups `object_storage{used_bytes, quota_bytes,
remaining_bytes, used_percent, cleanup_trigger_used_percent, cleanup_target_used_percent}`,
`database{used_bytes, quota_bytes, used_percent}`, `bandwidth{used_bytes, quota_bytes,
used_percent, status}`, `realtime{usage, quota, status}` and `edge_functions{usage, quota,
status}`; an absent group/key or a `not_exposed_by_sql` status renders as "Not exposed" and is
NEVER coerced to 0. `get_my_data_summary()` returns ONE JSON object with exactly
`peer_messages, peer_attachments, peer_attachment_bytes, assistant_messages,
assistant_attachments, assistant_attachment_bytes, study_chat_messages, documents, document_bytes,
planner_events, feedback_items`. `user_legal_consents` uses `document_type, document_version,
accepted_at, withdrawn_at, consent_source, created_at` (there is NO `document_kind`), and
`complete_account_compliance_onboarding(...)` returns JSONB. The migration
`harden_auth_peer_rpcs_and_signup_defaults` is live: the auth trigger creates the username,
default preferences and an empty `account_compliance` row, while signup role/DOB/guardian values
remain auth-metadata prefills (`account_type_prefill`, `date_of_birth_prefill`,
`guardian_email_prefill`) until validated on `/onboarding/compliance`. Also the JWT-protected
Edge Function `delete-my-data` (`range | all_content | delete_account`, Storage objects deleted
before DB rows, caller-only, no target-user-id parameter accepted). See
`sequences/DELETE_MY_DATA_RANGE.mmd`, `sequences/DELETE_MY_DATA_ALL_CONTENT_KEEP_ACCOUNT.mmd`,
`sequences/DELETE_ACCOUNT.mmd`, `sequences/GDPR_PRIVACY_DATA_MAP_RIGHTS_WORKFLOW.mmd`.

**LEGAL REVIEW REQUIRED BEFORE PRODUCTION:** see `legal/LEGAL_REVIEW_REQUIRED.md`. This pass makes
no claim of GDPR or any other regulatory certification; lawful basis, DPAs, records of processing,
breach procedures, jurisdictional guardian-consent rules and cookie/ePrivacy analysis are
organisational decisions outside what frontend code can establish.
