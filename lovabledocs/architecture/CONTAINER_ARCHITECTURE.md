```
Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466
```

# Container Architecture (C4 Level 2) — Alim / Gymi Genius

## Browser containers (CURRENT — FRONTEND)

- **Router** — TanStack Router file-based routes under `frontend/src/routes` (`index.tsx`, `auth.tsx`,
  `auth.update-password.tsx`, `_authenticated/route.tsx` gate, and the authenticated screens).
- **Auth UI** — `_authenticated/route.tsx` (ssr:false gate → `/auth`) + `components/AuthForm.tsx`.
- **Home** — `_authenticated/home.tsx`.
- **School** — `_authenticated/school.index.tsx`, `_authenticated/school.$subject.tsx` (subject workspace).
- **Planner** — `_authenticated/planner.tsx`.
- **Assistant** — `_authenticated/assistant.index.tsx`, `_authenticated/assistant.$threadId.tsx`,
  `_authenticated/chat.index.tsx`, `_authenticated/chat.$threadId.tsx`, using
  `components/StudyChat.tsx`, `components/assistant/AssistantChat.tsx`, `components/ThreadList.tsx`,
  `components/ai-elements/*`.
- **Statistics** — `_authenticated/stats.tsx`.
- **Help** — `_authenticated/help.tsx`.
- **Feedback** — `_authenticated/feedback.tsx`.
- **Profile/Settings** — `_authenticated/profile.tsx`, `_authenticated/settings.tsx`.
- **i18n layer** — `lib/i18n/{languages,detect,format,provider,index,messages/*}`, mounted as
  `I18nProvider` in `__root.tsx`.
- **Speech layer** — `lib/speech.ts` (Web Speech API `speechSynthesis`, browser-only, ephemeral).
- **Supabase client** — `integrations/supabase/client.ts`, used by nearly every screen and by
  `lib/account-data.ts`, `lib/assistant-data.ts`, `lib/storage-management.ts`, `lib/telemetry.ts`,
  `lib/media-retention.ts`.
- **Google Calendar client** — `lib/google-calendar.ts`.

## TanStack server runtime container (CURRENT — FRONTEND)

- **`/api/chat` server route** (`frontend/src/routes/api/chat.ts`) — the frontend's only outbound API
  client boundary toward the local backend. Verifies the Supabase bearer token, checks thread ownership,
  writes the user message, calls `lib/context-backend.server.ts` → local backend, and streams an AI-SDK UI
  message stream back to the browser.

## Supabase containers (CURRENT — SUPABASE, declared)

- **Auth** — username/password, OAuth (GitHub, LinkedIn, Spotify), Google identity linking.
- **PostgreSQL** — `feedback`, `usage_events`, `profiles`, `user_preferences`, `media_retention_queue`,
  `documents`, `document_chunks`, `assistant_threads`, `assistant_messages`, `assistant_attachments`,
  `threads`, `messages`, plus RPC `get_storage_usage_status()`.
- **Storage** — buckets `profile-avatars`, `user-materials`, `chat-attachments`, `feedback-messages`,
  `activity-logs`, `assistant-descriptors`, all private, path convention `<uid>/...`.
- **Edge Functions** — `username-login`, `username-availability`, `activity-log`, `feedback-submit`,
  `storage-emergency-cleanup`.
- **RLS** — row-level security enforced per-table (see `docs/supabase/RLS_AUTHORIZATION_MATRIX.md`).
- **Retention infrastructure** — `media_retention_queue` table backing `lib/media-retention.ts` and the
  `storage-emergency-cleanup` Edge Function (30-minute delete-after convention).

## Local backend containers (BACKEND IMPLEMENTATION UNKNOWN / EXPECTED)

The following are named after the visible `backend/app` tree for orientation only; the frontend contract
does not describe their internals, so each is labelled EXPECTED BACKEND CONTRACT (the boundary the frontend
depends on) or BACKEND IMPLEMENTATION UNKNOWN (everything behind that boundary):

- **Chat endpoint** — `POST /api/chat` on `127.0.0.1:8001` — EXPECTED BACKEND CONTRACT.
- **Context manager** — BACKEND IMPLEMENTATION UNKNOWN.
- **Retrieval / RAG** — BACKEND IMPLEMENTATION UNKNOWN.
- **Document processing** — BACKEND IMPLEMENTATION UNKNOWN.
- **Student memory** — BACKEND IMPLEMENTATION UNKNOWN.
- **AI orchestration** — BACKEND IMPLEMENTATION UNKNOWN.
- **Local model interface** — calls the local model runtime on `:8000` — BACKEND IMPLEMENTATION UNKNOWN.
- **Media processing** — BACKEND IMPLEMENTATION UNKNOWN.
- **Web retrieval** — requested via `allow_web:true` in the chat request — BACKEND IMPLEMENTATION UNKNOWN.

## Diagram

See `CONTAINER_ARCHITECTURE.mmd`.


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
