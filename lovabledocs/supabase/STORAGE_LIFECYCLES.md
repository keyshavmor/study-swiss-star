Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# Storage lifecycles: assistant output media retention

See `docs/supabase/STORAGE_LIFECYCLES.mmd` for the state diagram.

**Scope:** this 30-minute policy covers **assistant OUTPUT media only** — images, audio, video or
other files the assistant generates or fetches as part of a reply. **Ordinary user study uploads
(`user-materials`, `chat-attachments`, `assistant_attachments`) are NOT covered** and are retained
under their own rules (`STORAGE_ARCHITECTURE.md`).

**Safety rule (must never be violated): no descriptor ⇒ the binary must not be deleted.** A row may
only reach a deletable state once `descriptor_path` is populated.

## CURRENT SUPABASE infrastructure (declared; not machine-verified this pass)

- Table `public.media_retention_queue` with `delete_after default now() + 30 minutes`,
  `descriptor_bucket`/`descriptor_path`, `status`, `deleted_at`, `error_code`
  (`frontend/src/integrations/supabase/types.ts:144-194`).
- Private bucket `assistant-descriptors` as the descriptor target.
- RLS presumed `user_id = auth.uid()` on the queue table (not independently confirmed).

## CURRENT FRONTEND contract (`frontend/src/lib/media-retention.ts`)

- `enqueueAssistantMedia()` inserts a row **only when the caller already has a descriptor object
  path** (or explicitly leaves it `pending`); it **never generates descriptors client-side**.
- `listRetentionQueue()` reads the signed-in user's own rows.
- `minutesUntilDeletion()` / `isOriginalExpired()` are pure helpers for UI countdowns; they never
  delete anything themselves.
- The frontend never calls Storage `remove()` on `object_path` for queue rows — deletion is
  exclusively a backend responsibility.

## BACKEND TODO FOR CODEX (not implemented anywhere in this repo)

1. **Descriptor generation** — produce a text/markdown/json descriptor summarizing the assistant
   output media.
2. **Descriptor upload** — write that descriptor into the private `assistant-descriptors` bucket
   under the owner's `<uid>/...` prefix.
3. **Queue enqueue at generation time** — insert/update the `media_retention_queue` row with
   `descriptor_path` set and `status = "descriptor_ready"`, `delete_after = created_at + 30m`.
4. **Cleanup worker** — a scheduled job that, for rows past `delete_after` **and** with a
   non-null `descriptor_path`, deletes the original object at `storage_bucket`/`object_path` and
   stamps `deleted_at`/`error_code` on failure.
5. **Descriptor-based retrieval** — later AI turns must read the descriptor instead of assuming the
   original media still exists once `deleted_at` is set.

None of steps 1–5 exist in the local Python backend or anywhere else in this repository today
(BACKEND IMPLEMENTATION UNKNOWN / BACKEND TODO FOR CODEX).

## Lifecycle narrative

1. **Upload / generation** — the assistant produces or fetches a piece of output media; the binary
   is stored in its bucket (e.g. `chat-attachments`) under `<uid>/...`.
2. **Metadata row** — an `assistant_attachments` row (or equivalent) records the object's
   bucket/path/mime/size.
3. **Descriptor (assistant output media only)** — BACKEND TODO FOR CODEX: a descriptor is generated
   and uploaded to `assistant-descriptors`.
4. **Retention queue** — BACKEND TODO FOR CODEX: a `media_retention_queue` row is enqueued (or the
   frontend's `enqueueAssistantMedia` records one) with `descriptor_path` set and
   `delete_after = created_at + 30 minutes`.
5. **30-minute threshold** — the cleanup worker (BACKEND TODO FOR CODEX) waits until `now() >=
   delete_after`.
6. **Binary removed** — the worker deletes the original Storage object, **only if a descriptor
   already exists**, and stamps `deleted_at`.
7. **Descriptor remains** — the row's `descriptor_path` object in `assistant-descriptors` persists
   as the permanent retrieval surface.
8. **Descriptor-based retrieval** — BACKEND TODO FOR CODEX: subsequent AI turns read the descriptor
   instead of expecting the original binary.

**Ordinary user study uploads are NOT covered by this 30-minute policy** — they persist under the
per-bucket rules in `STORAGE_ARCHITECTURE.md` until the user deletes them or emergency cleanup
intervenes.


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
`get_or_create_direct_peer_conversation`, `mark_peer_conversation_read`; tables
`peer_conversations`, `peer_conversation_members`, `peer_messages`, `peer_message_attachments`,
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

**Data rights (CURRENT SUPABASE):** `get_user_visible_supabase_health()` (unsupported quotas
reported as `not_exposed_by_sql`, never invented), `get_my_data_summary()`, and the JWT-protected
Edge Function `delete-my-data` (`range | all_content | delete_account`, Storage objects deleted
before DB rows, caller-only, no target-user-id parameter accepted). See
`sequences/DELETE_MY_DATA_RANGE.mmd`, `sequences/DELETE_MY_DATA_ALL_CONTENT_KEEP_ACCOUNT.mmd`,
`sequences/DELETE_ACCOUNT.mmd`, `sequences/GDPR_PRIVACY_DATA_MAP_RIGHTS_WORKFLOW.mmd`.

**LEGAL REVIEW REQUIRED BEFORE PRODUCTION:** see `legal/LEGAL_REVIEW_REQUIRED.md`. This pass makes
no claim of GDPR or any other regulatory certification; lawful basis, DPAs, records of processing,
breach procedures, jurisdictional guardian-consent rules and cookie/ePrivacy analysis are
organisational decisions outside what frontend code can establish.
