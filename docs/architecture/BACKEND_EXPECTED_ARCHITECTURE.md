```
Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466
```

# Backend Expected Architecture — local Python backend

**Important**: the GitHub `backend/` tree exists in this repo, but per project rules it is **NOT
authoritative** for documenting backend behaviour — it may be stale or aspirational. This document derives
the expected shape of the local backend **only** from the frontend contract in
`frontend/src/lib/context-backend.server.ts` and `frontend/src/routes/api/chat.ts`. The `backend/app` tree
is listed below purely for engineering orientation.

## Visible (non-authoritative) backend tree

```
backend/app/
├── main.py
├── model_spec.py
├── platform.py
├── context/
│   ├── artifacts/manager.py
│   ├── memory/{conversation,episodic,student}.py
│   ├── retrieval/{base,common,dense,hybrid,reranker,sparse}.py
│   ├── tokenization/counter.py
│   ├── budget.py, compiler.py, config.py, intent.py, manager.py, models.py, store.py, text.py, web.py
└── services/
    ├── documents.py
    ├── llm.py
    └── model_runtime.py
```
Every box below is labelled EXPECTED BACKEND CONTRACT (visible at the frontend boundary) or BACKEND
IMPLEMENTATION UNKNOWN (everything else) — the tree above must not be read as confirmation of what any of
these files actually do.

## Contract-derived components

- **Chat endpoint** — `POST /api/chat` on `http://127.0.0.1:8001` (default,
  `ALIM_CONTEXT_BACKEND_URL`). Request headers: `Content-Type: application/json`,
  `X-Student-Id: <supabase user id>` (context only — **not** an authorization boundary). Request body:
  `{ thread_id, user_message_id, question, subject_id, language ("de"|"en"|"fr"), academic_year,
  grade_level, include_sources: true, allow_web: true, stream: false }`. Timeout
  `ALIM_CONTEXT_BACKEND_TIMEOUT_MS` (default 90000ms) via `AbortController`. — EXPECTED BACKEND CONTRACT.
- **Response contract** — `ContextChatResponse { thread_id, message_id, answer, sources[{source_id,
  material_id, material_name, section, page, chapter?, snippet, score, url}], exam_tip, used_model,
  retrieval_summary{chunks_considered, chunks_used, collections}, language, created_at }`, or an error
  envelope `{ error: { code, message } }` with codes `context_backend_error`, `invalid_response`,
  `context_backend_unavailable`. — EXPECTED BACKEND CONTRACT.
- **Context manager** — implied by the request needing subject/thread/academic-year context and by
  `retrieval_summary` in the response — BACKEND IMPLEMENTATION UNKNOWN.
- **Retrieval / RAG** — implied by `include_sources`, `sources[]`, `retrieval_summary.collections` —
  BACKEND IMPLEMENTATION UNKNOWN.
- **Document processing** — implied by `sources[].material_id/material_name/section/page/chapter` —
  BACKEND IMPLEMENTATION UNKNOWN.
- **Student memory** — no explicit field in the contract; only `thread_id`/`academic_year`/`grade_level`
  are passed — BACKEND IMPLEMENTATION UNKNOWN.
- **AI orchestration** — implied by `used_model` in the response — BACKEND IMPLEMENTATION UNKNOWN.
- **Local model interface** — implied by `used_model` and the separate local model runtime on `:8000` —
  BACKEND IMPLEMENTATION UNKNOWN.
- **Media processing** — no field in the contract references attachments; the frontend attachment flow
  (`assistant_attachments`) is not shown to reach this endpoint — BACKEND IMPLEMENTATION UNKNOWN.
- **Web retrieval** — implied only by the `allow_web: true` request flag — BACKEND IMPLEMENTATION UNKNOWN.

## Explicitly NOT implemented / UNKNOWN (per FACTS.md)

Response-language enforcement, audio/TTS generation, media descriptor generation, 30-minute retention
cleanup, quiz/exam/grading/study-plan endpoints, general Assistant generation and attachment parsing
(the frontend never fabricates `assistant_messages` assistant rows itself, implying a backend/Edge Function
must, but none is currently invoked from `frontend/src`).

## Diagram

See `BACKEND_EXPECTED_ARCHITECTURE.mmd`.


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
