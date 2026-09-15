```
Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466
```

# Codex Implementation Order

Dependency-ordered plan for the local Python backend, adapted to the real contract described in
`CODEX_HANDOFF.md`. Every step lists: **Prerequisite**, **Deliverable**, **Contract reference**,
**Verify**. Do not start a step whose prerequisite is unmet. Status labels used below are exactly
the ones in the shared facts: `CURRENT — FRONTEND`, `CURRENT — SUPABASE`,
`CURRENT — EXTERNAL INTEGRATION`, `EXPECTED BACKEND CONTRACT`, `BACKEND IMPLEMENTATION UNKNOWN`,
`BACKEND TODO FOR CODEX`, `DEPRECATED — REMOVED`.

## 1. Identity/session assumptions
- **Prerequisite:** none.
- **Deliverable:** Confirm and document how the backend will validate the caller is who
  `X-Student-Id` claims. Today (`EXPECTED BACKEND CONTRACT`), the frontend already verifies the
  Supabase JWT itself in `/api/chat` before ever calling the backend, and forwards only
  `X-Student-Id` — the raw JWT is **not** forwarded downstream in current code
  (`frontend/src/routes/api/chat.ts`, `lib/context-backend.server.ts`). Decide (see
  `OPEN_BACKEND_QUESTIONS.md`) whether the backend trusts the frontend's network boundary as-is or
  requires the JWT to be forwarded too.
- **Contract reference:** CODEX_HANDOFF.md → Invariants → "Auth is a verified Supabase JWT" / "
  X-Student-Id is not an authorization boundary".
- **Verify:** Attempt a direct call to the backend's `/api/chat` bypassing the frontend, with an
  arbitrary `X-Student-Id` and no JWT; confirm the chosen policy is enforced consistently.

## 2. Common API transport + error envelope
- **Prerequisite:** Step 1.
- **Deliverable:** Backend implements the `{ error: { code, message } }` envelope on all non-2xx
  responses, using at least the codes the frontend already understands:
  `context_backend_error`, `invalid_response`, `context_backend_unavailable`. Backend returns
  well-formed JSON always (frontend does `response.json().catch(() => null)` and treats a parse
  failure as `invalid_response`/`context_backend_unavailable`).
- **Contract reference:** `lib/context-backend.server.ts` (`requestContextAnswer` error handling).
- **Verify:** `BACKEND_TEST_SCENARIOS.md` negative tests (malformed body, 5xx, non-JSON body).

## 3. User/context identity
- **Prerequisite:** Step 1–2.
- **Deliverable:** Backend accepts `X-Student-Id` and associates it with per-request retrieval
  scope (e.g. which documents/collections are visible) — without treating it as authorization.
  Any authorization-relevant decision (e.g. "can this user see this thread's materials") must be
  re-derived from data the backend itself can trust, not merely echoed from the header.
- **Contract reference:** CODEX_HANDOFF.md invariants; `docs/supabase/SUPABASE_CURRENT_STATE.md`
  RLS policies for `documents`/`document_chunks` (`CURRENT — SUPABASE`).
- **Verify:** Two different `X-Student-Id` values must never see each other's documents/threads in
  retrieval results.

## 4. Language contract
- **Prerequisite:** Step 3.
- **Deliverable:** Decide and implement where response-language intent travels (see
  `OPEN_BACKEND_QUESTIONS.md`) and make the backend honour `assistant_reply_language_policy`
  (`message_then_app` vs `app_only`, `lib/account-data.ts`) by producing `answer` text in the
  correct language, and set `ContextChatResponse.language` accurately. Today this is
  `BACKEND TODO FOR CODEX` — the frontend already computes `effectiveResponseLanguage()`
  client-side (`lib/i18n/detect.ts`) but does not send it to the backend.
- **Contract reference:** `lib/i18n/detect.ts` (`effectiveResponseLanguage`), `lib/account-data.ts`
  (`assistant_reply_language_policy`), request field `language` in
  `lib/context-backend.server.ts` (currently derived only from subject, not from message content).
- **Verify:** `BACKEND_ACCEPTANCE_CRITERIA.md` "UI Hochdeutsch + Italian message" scenario.

## 5. Chat transport (incl. streaming/cancellation)
- **Prerequisite:** Step 2.
- **Deliverable:** Backend's `/api/chat` returns the exact `ContextChatResponse` shape
  synchronously (current contract sends `stream: false` and expects one JSON body — there is no
  server-sent-event or chunked contract today). If Codex introduces true backend streaming, it must
  still terminate in a single `ContextChatResponse`-shaped object consumable by
  `requestContextAnswer`, or the frontend route must be updated in lockstep (out of scope for
  backend-only work — flag in `OPEN_BACKEND_QUESTIONS.md` instead of changing frontend contract
  unilaterally). Cancellation: backend must respect the client aborting the connection (Node
  `AbortController` on the frontend side, default 90s timeout) and clean up any in-flight
  generation without leaving orphaned resources.
- **Contract reference:** CODEX_HANDOFF.md → `/api/chat` contract section.
- **Verify:** `BACKEND_TEST_SCENARIOS.md` timeout-at-90s scenario; abort mid-request and confirm no
  duplicate assistant message is later inserted.

## 6. Context manager (retrieval scope/session state)
- **Prerequisite:** Steps 3–5.
- **Deliverable:** Backend maintains whatever session/context state it needs per `thread_id` to
  answer follow-up questions coherently (e.g. prior turns, retrieved chunks reused). Must not
  require the frontend to resend full history beyond what `/api/chat` already sends (`messages`
  array is available frontend-side but only the last user message's text is currently forwarded to
  the backend as `question`).
- **Contract reference:** `docs/archive/CONTEXT_MANAGER.md` (existing draft, verify against real backend).
- **Verify:** Multi-turn conversation in one thread produces contextually consistent answers.

## 7. Document ingestion / RAG
- **Prerequisite:** Step 6.
- **Deliverable:** Backend can ingest materials referenced by `documents`/`document_chunks`
  (`CURRENT — SUPABASE`, loose/variable columns — read defensively per
  `frontend/src/lib/storage-management.ts`) and produce `sources[]` entries with real
  `material_id`/`material_name`/`section`/`page`/`snippet`/`score` in
  `ContextChatResponse`. `chunks_considered`/`chunks_used`/`collections` in `retrieval_summary`
  must reflect actual retrieval, not placeholders.
- **Contract reference:** `lib/context-backend.types.ts` (`ContextSourceSnippet`,
  `retrieval_summary`).
- **Verify:** `BACKEND_TEST_SCENARIOS.md` fixture with a known ingested document returns a source
  pointing at it.

## 8. Subject chat
- **Prerequisite:** Step 7.
- **Deliverable:** End-to-end `/api/chat` flow for a subject thread (`threads.subject` populated),
  including `subject_id`/`language` normalisation as sent today
  (`normalizeSubjectId`/`languageForSubject` in `lib/context-backend.server.ts`) — backend should
  not require the frontend to change these until Step 4's language contract is renegotiated.
- **Contract reference:** CODEX_HANDOFF.md `/api/chat` contract; `docs/archive/SUBJECT_MODEL_AND_LANGUAGE_RULES.md`.
- **Verify:** `BACKEND_ACCEPTANCE_CRITERIA.md` core success case.

## 9. General Assistant (non-subject)
- **Prerequisite:** Step 8.
- **Deliverable:** Whatever endpoint(s) back the general Assistant (`assistant_threads` /
  `assistant_messages` / `assistant_attachments`, separate tables from tutoring `threads`/
  `messages`) — currently `BACKEND TODO FOR CODEX`, no confirmed endpoint exists. Must preserve the
  invariant that assistant rows are never fabricated by the frontend; a real backend call is
  required before any `assistant_messages` row with `role = 'assistant'` is inserted.
- **Contract reference:** shared facts "Local Python backend boundary" section, item on
  "general Assistant generation + attachment parsing"; needs its own contract doc (see
  `OPEN_BACKEND_QUESTIONS.md` — Assistant attachment parsing pipeline).
- **Verify:** No assistant-role row appears in `assistant_messages` without a corresponding
  successful backend call in logs/telemetry.

## 10. Planner / study-plan work
- **Prerequisite:** Step 9 not required; depends only on Steps 1–2.
- **Deliverable:** Backend-side planning logic (if any) must never mutate a linked Google Calendar
  event directly — Google Calendar is a `CURRENT — EXTERNAL INTEGRATION` surface owned by
  `lib/google-calendar.ts` on the frontend, using the user's own linked identity/OAuth scope. The
  backend may propose plan content but must not perform calendar writes itself.
- **Contract reference:** `BACKEND_ACCEPTANCE_CRITERIA.md` "Planner never mutates a Google Calendar
  event" scenario.
- **Verify:** No Calendar API write calls originate from backend code paths under any planner
  endpoint.

## 11. Grades / study tools
- **Prerequisite:** Steps 1–2.
- **Deliverable:** Any quiz/exam/grading/study-tool endpoints and their persistence tables —
  currently `BACKEND TODO FOR CODEX` / `BACKEND IMPLEMENTATION UNKNOWN`; no such tables are listed
  among the frontend-referenced Supabase tables today. Must not be persisted through
  frontend-writable tables without new RLS policies scoped `user_id = auth.uid()` matching the
  existing pattern (`docs/supabase/SUPABASE_CURRENT_STATE.md`).
- **Contract reference:** `OPEN_BACKEND_QUESTIONS.md` — "study-tools endpoints and persistence
  tables".
- **Verify:** New tables (if any) reviewed for RLS parity with existing `threads`/`messages` policy
  shape before use.

## 12. Audio / media
- **Prerequisite:** Steps 1–2, and Step 13 (descriptor/retention) design decided in parallel.
- **Deliverable:** Any backend-generated audio (TTS) output must land in a private bucket following
  the `<uid>/...` path convention and be registered through the same descriptor-before-delete
  retention flow as other assistant media — currently `BACKEND TODO FOR CODEX`; browser
  `speechSynthesis` (`lib/speech.ts`) is ephemeral/client-only and out of backend scope entirely.
- **Contract reference:** `OPEN_BACKEND_QUESTIONS.md` — "audio generation/delivery format and
  storage".
- **Verify:** Generated audio objects always have a matching `media_retention_queue` row before
  being reachable by the client.

## 13. Descriptor + retention workflow
- **Prerequisite:** Step 12 (or independently, whenever backend starts producing any
  assistant-output media: image/audio/video).
- **Deliverable:** For every assistant-output media object, the backend writes a descriptor to the
  `assistant-descriptors` bucket **before** any deletion can occur, and updates
  `media_retention_queue.descriptor_path`/`status` accordingly (`descriptor_ready`). A separate
  worker (schedule/ownership TBD, see `OPEN_BACKEND_QUESTIONS.md`) deletes the original binary only
  after `delete_after` has passed **and** `status = 'descriptor_ready'`; rows still `pending` (no
  descriptor) must be skipped, not force-deleted.
- **Contract reference:** `lib/media-retention.ts` (full policy comment block), invariant
  "descriptor-before-delete" in `CODEX_HANDOFF.md`.
- **Verify:** `BACKEND_ACCEPTANCE_CRITERIA.md` "media descriptor missing" failure case.

## 14. Telemetry / error integration
- **Prerequisite:** Steps 2, 5.
- **Deliverable:** Backend errors surfaced through `/api/chat` must map to the localisable UI error
  surfaces (`lib/ui-error.ts`) and, where appropriate, be recorded via the existing
  `activity-log` Edge Function path (`usage_events` + `activity-logs` object,
  `lib/telemetry.ts:76`) — the backend does not call this Edge Function itself; it only needs to
  return errors in the envelope shape the frontend already forwards into telemetry.
- **Contract reference:** CODEX_HANDOFF.md invariant "localised UI errors only".
- **Verify:** A simulated backend 503 produces a genuinely localised (non-English-hardcoded, non-
  raw-stacktrace) message in at least two of the seven UI languages.

## 15. Remaining integrations
- **Prerequisite:** All prior steps relevant to the specific integration.
- **Deliverable:** Anything not covered above (e.g. web-retrieval provenance for `allow_web: true`,
  `selected_qwen_model` plumbing, memory scope/erasure) — see `OPEN_BACKEND_QUESTIONS.md` for the
  full list of undecided items and recommended defaults before implementing.
- **Contract reference:** `OPEN_BACKEND_QUESTIONS.md`.
- **Verify:** Each remaining integration gets its own entry in `BACKEND_ACCEPTANCE_CRITERIA.md` /
  `BACKEND_TEST_SCENARIOS.md` before being marked done.


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
