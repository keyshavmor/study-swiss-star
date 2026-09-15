Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# Backend-Required Capabilities

Derived strictly from what the UI implies it needs. Status labels used verbatim: CURRENT — FRONTEND / CURRENT — SUPABASE / CURRENT — EXTERNAL INTEGRATION / EXPECTED BACKEND CONTRACT / BACKEND IMPLEMENTATION UNKNOWN / BACKEND TODO FOR CODEX / DEPRECATED — REMOVED.

## 1. Subject chat answering with provenance
- **UI surface**: `frontend/src/routes/_authenticated/chat.$threadId.tsx`, `frontend/src/routes/_authenticated/chat.index.tsx`, rendered by `frontend/src/components/StudyChat.tsx`.
- **Expected contract**: `POST /api/chat` → `POST {ALIM_CONTEXT_BACKEND_URL}/api/chat` returning `answer`, `sources[]`, `exam_tip`, `used_model`, `retrieval_summary` (see FRONTEND_BACKEND_CONTRACT.md).
- **Status**: EXPECTED BACKEND CONTRACT (request/response shape fixed by frontend code); BACKEND IMPLEMENTATION UNKNOWN.

## 2. General Assistant answering + attachment parsing
- **UI surface**: `frontend/src/routes/_authenticated/assistant.index.tsx`, `assistant.$threadId.tsx`, backed by `frontend/src/lib/assistant-data.ts` (`assistant_threads`/`assistant_messages`/`assistant_attachments`).
- **Expected contract**: none defined in frontend code today — `sendAssistantMessage` only persists the user's row and uploads attachments; per FACTS.md, "assistant_messages assistant rows are never fabricated by the frontend," implying a backend must insert the assistant reply row itself (no HTTP call from the frontend targets a backend for this).
- **Status**: BACKEND TODO FOR CODEX — no request contract exists yet; attachment parsing (`parse_status: "unparsed"` written by the frontend) also has no backend contract.

## 3. Context management / budgeting
- **UI surface**: implicit in `academicYear`/`gradeLevel`/`subject_id` passed on every `/api/chat` call (`frontend/src/routes/api/chat.ts`).
- **Expected contract**: backend receives these fields per turn and is expected to manage its own context window/budget when assembling retrieval + history; the frontend does not truncate or budget history before sending `messages`.
- **Status**: EXPECTED BACKEND CONTRACT (inputs only); BACKEND IMPLEMENTATION UNKNOWN.

## 4. Document ingestion + chunking + embeddings
- **UI surface**: `documents`/`document_chunks` tables referenced defensively by `frontend/src/lib/storage-management.ts` ("column names vary per deployment"); `user-materials` Storage bucket.
- **Expected contract**: none — no frontend code uploads to an ingestion endpoint; documents rows are read/soft-deleted only (`status: "deleted"`, `object_path: null`).
- **Status**: BACKEND TODO FOR CODEX — ingestion pipeline is assumed to exist elsewhere (backend-owned) but no contract is visible from the frontend.

## 5. Hybrid retrieval + reranking
- **UI surface**: `retrieval_summary.{chunks_considered,chunks_used,collections}` rendered in `StudyChat.tsx`.
- **Expected contract**: the backend performs retrieval/reranking internally and reports only the summary counts; no retrieval parameters (top-k, rerank model, etc.) are sent by the frontend.
- **Status**: EXPECTED BACKEND CONTRACT (output shape only); BACKEND IMPLEMENTATION UNKNOWN.

## 6. Student memory
- **UI surface**: none found — no route, component, or table reference for cross-session "memory" beyond ordinary `threads`/`messages` history.
- **Expected contract**: none defined.
- **Status**: BACKEND TODO FOR CODEX if desired; currently UNKNOWN/not implied by any UI surface.

## 7. Study plans
- **UI surface**: `chat.readyDescription` copy ("Ask for an explanation, a quiz, or a study plan for your next exam") in `frontend/src/lib/i18n/messages/chat.ts`; no dedicated route/table.
- **Expected contract**: implied to be produced as ordinary chat answers through `/api/chat`, not a separate endpoint.
- **Status**: EXPECTED BACKEND CONTRACT is "answer via `/api/chat`"; no structured study-plan schema exists. BACKEND IMPLEMENTATION UNKNOWN.

## 8. Quiz / mock exams
- **UI surface**: same `chat.readyDescription` copy referencing "a quiz"; no dedicated quiz route, table, or grading UI found.
- **Expected contract**: none structured — presumably delivered as chat text via `/api/chat`.
- **Status**: BACKEND TODO FOR CODEX for any structured quiz/exam contract (scoring, question schema); today it is at best free-text chat output.

## 9. Grading
- **UI surface**: `frontend/src/routes/_authenticated/stats.tsx`, `frontend/src/lib/grade-math.ts` (grade computation), `mock/grades.ts`. These compute/display grades the student enters — no AI-generated grading pipeline found.
- **Expected contract**: none for AI grading; `grade-math.ts` is pure frontend arithmetic on user-entered data.
- **Status**: CURRENT — FRONTEND for manual grade tracking; BACKEND TODO FOR CODEX if AI-assisted grading is intended (no evidence it is).

## 10. Web retrieval
- **UI surface**: `allow_web: true` sent on every context-backend request (`frontend/src/lib/context-backend.server.ts`).
- **Expected contract**: backend may perform web retrieval when `allow_web` is true; no distinct web-source shape beyond the generic `sources[]` entries (which already carry an optional `url`).
- **Status**: EXPECTED BACKEND CONTRACT (flag only); BACKEND IMPLEMENTATION UNKNOWN.

## 11. Response-language policy enforcement
- **UI surface**: `assistant_reply_language_policy: "message_then_app" | "app_only"` in `frontend/src/lib/account-data.ts` `UserPreferences`; `effectiveResponseLanguage` in `frontend/src/lib/i18n/detect.ts`.
- **Expected contract**: none sent to the backend — the preference and the detected hint are consumed entirely client-side (to pick a `speechSynthesis` voice locale). The `/api/chat` request carries only a coarse `language` derived from subject, not from this preference.
- **Status**: BACKEND TODO FOR CODEX — see FRONTEND_BACKEND_CONTRACT.md "Contract extensions" section; today response-language policy is NOT enforced backend-side by any documented field.

## 12. Audio / TTS generation
- **UI surface**: `chat.audio.listen`/`chat.audio.stop`, `assistant.audio.unsupported` copy; `frontend/src/lib/speech.ts` speak/stop functions used from `StudyChat.tsx`/`AssistantChat.tsx`.
- **Expected contract**: none — 100% browser `window.speechSynthesis`, ephemeral, never sent to or requested from any backend.
- **Status**: CURRENT — FRONTEND (browser-only); BACKEND TODO FOR CODEX if server-side TTS audio is ever desired (not implied by current UI, which has a graceful "unsupported" fallback instead).

## 13. Media descriptor generation
- **UI surface**: `frontend/src/lib/media-retention.ts` documents the policy (descriptor before deletion) and exposes `enqueueAssistantMedia`/`listRetentionQueue`, but explicitly states it "never generates descriptors client-side."
- **Expected contract**: a backend process must produce a descriptor object (bucket `assistant-descriptors`) and update the `media_retention_queue` row's `descriptor_path`/`status` before the 30-minute deletion.
- **Status**: BACKEND TODO FOR CODEX (explicitly called out in source comments as "FUTURE BACKEND / CODEX").

## 14. Retention cleanup worker
- **UI surface**: `media_retention_queue.delete_after` (default `now()+30min`), `RETENTION_MINUTES = 30` in `frontend/src/lib/media-retention.ts`; `minutesUntilDeletion`/`isOriginalExpired` are read-only helpers for display.
- **Expected contract**: a worker must delete the original media object after `delete_after` and set `deleted_at`/`status`/`error_code` accordingly.
- **Status**: BACKEND TODO FOR CODEX (explicitly not implemented per source comments).

## 15. Telemetry / error integration
- **UI surface**: `frontend/src/lib/telemetry.ts` (`track`, `trackFailure`, `installGlobalErrorTelemetry`) used across auth, feedback, storage, chat, planner code.
- **Expected contract**: `activity-log` Edge Function accepts the sanitised event payload (see EVENT_AND_TELEMETRY_CONTRACT.md) and persists to `usage_events` + `activity-logs` bucket.
- **Status**: CURRENT — SUPABASE (Edge Function invoked from frontend; implementation inside the function itself is CURRENT — SUPABASE (declared; not machine-verified this pass)).


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
