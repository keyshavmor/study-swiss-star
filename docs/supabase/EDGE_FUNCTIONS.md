Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# Edge Functions

All five functions below are **deployed externally to this repository** — there is no
`supabase/functions/` implementation in this codebase. Contracts are declared from frontend call
sites plus `docs/archive/SUPABASE_SERVICES.md` (CURRENT — EXTERNAL INTEGRATION for behaviour; BACKEND
IMPLEMENTATION UNKNOWN for internals).

## `username-login`

- **Caller:** `frontend/src/components/AuthForm.tsx:94`.
- **Auth assumption:** unauthenticated caller (this *is* the sign-in path); the function itself must
  authenticate the username/password pair.
- **Input:** `{ username: string, password: string }` (username pre-normalised/validated
  client-side).
- **Output:** `{ access_token, refresh_token }` on success; a generic error otherwise.
- **Side effects:** none on Supabase tables from the frontend's perspective; presumed to verify
  credentials against `auth.users`/`profiles` internally.
- **Tables/buckets touched:** none directly observable from the frontend; internals unknown.
- **Failure semantics:** any error or missing tokens → frontend throws a generic
  "auth.usernamePasswordError" — no account enumeration, no email disclosed.

## `username-availability`

- **Caller:** `frontend/src/components/AuthForm.tsx:121`.
- **Auth assumption:** unauthenticated (called before sign-up completes).
- **Input:** `{ username: string }`.
- **Output:** `{ available: boolean, valid: boolean }`.
- **Side effects:** read-only (checks uniqueness, presumably against `profiles.username`).
- **Tables/buckets touched:** `profiles` (read-only, presumed).
- **Failure semantics — CRITICAL:** if `availability.error` is truthy or `data` is missing, the
  frontend must **not** report the username as taken; it proceeds to `supabase.auth.signUp` and
  treats the database unique constraint as final authority (`AuthForm.tsx:125-136`). Only an
  explicit `available === false` response triggers the "taken" message.

## `activity-log`

- **Caller:** `frontend/src/lib/telemetry.ts:76` (`logActivity`), invoked from dozens of instrumented
  call sites app-wide.
- **Auth assumption:** normally authenticated; anonymous calls are permitted **only** for
  `auth_signin_failed` and `oauth_signin_failed` event names (`docs/archive/SUPABASE_SERVICES.md`).
- **Input:** `{ event_name: string, feature?: string, subject?: string, properties?: Record<string,
  Primitive> }`, sanitised client-side (forbidden-key stripping, `MAX_STRING = 200`,
  `MAX_PROPERTIES = 12`, `route` auto-injected).
- **Output:** not consumed by the frontend (fire-and-forget; errors are swallowed after a single
  console warning, `telemetry.ts:66-75`).
- **Side effects:** writes a row to `public.usage_events` and a text object to the private
  `activity-logs` bucket at `<user_id>/<YYYY-MM-DD>/<uuid>.log`.
- **Tables/buckets touched:** `public.usage_events`, `activity-logs` bucket.
- **Failure semantics:** never surfaces to the user and never blocks the action that triggered it —
  `track()` is a void-returning wrapper that does not await.

## `feedback-submit`

- **Caller:** `frontend/src/lib/storage-management.ts` is unrelated; the actual caller is
  `frontend/src/routes/_authenticated/feedback.tsx:64`.
- **Auth assumption:** authenticated (route is under `_authenticated/`).
- **Input:** `{ message: string, category: string, context?: Json }`.
- **Output:** success/failure surfaced as a toast in the feedback form; exact payload shape not
  otherwise consumed.
- **Side effects:** inserts a row into `public.feedback` and a text mirror into the private
  `feedback-messages` bucket at `<user_id>/<YYYY-MM-DD>/<uuid>.txt`.
- **Tables/buckets touched:** `public.feedback`, `feedback-messages` bucket.
- **Failure semantics:** surfaced to the user as an error toast; no direct client-side fallback
  write to `public.feedback` exists (the function is the only writer).

## `storage-emergency-cleanup`

- **Caller:** `frontend/src/lib/storage-management.ts:199` (`invokeEmergencyCleanup`).
- **Auth assumption:** authenticated (acts on the caller's own storage usage).
- **Input:** none (no body).
- **Output:** none consumed by the frontend beyond success/error.
- **Side effects:** "the backend function decides what to remove" (inline comment,
  `storage-management.ts:197`) — presumed to delete some of the caller's own Storage objects and/or
  associated metadata rows to bring usage back under quota.
- **Tables/buckets touched:** unspecified from the frontend's perspective; presumed to span
  `user-materials`/`chat-attachments` and related metadata tables (`documents`,
  `assistant_attachments`). Exact scope is BACKEND IMPLEMENTATION UNKNOWN.
- **Failure semantics:** any error is rethrown as `Error(error.message)` to the caller
  (`storage-management.ts:200`), typically surfaced as a UI error via `lib/ui-error.ts`.


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
