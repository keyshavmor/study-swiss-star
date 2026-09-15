```
Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466
```

# Backend Test Scenarios

Concrete, executable-style scenarios against `POST /api/chat`
(`frontend/src/routes/api/chat.ts`) and the downstream local backend contract
(`lib/context-backend.server.ts`, `lib/context-backend.types.ts`). All statuses reflect current
frontend behaviour (`CURRENT — FRONTEND`); backend-side fixtures are `EXPECTED BACKEND CONTRACT`
unless noted `BACKEND TODO FOR CODEX`.

## S1. Success — subject chat turn
Request to `/api/chat`:
```json
{
  "threadId": "11111111-1111-1111-1111-111111111111",
  "messages": [
    { "id": "m1", "role": "user", "parts": [{ "type": "text", "text": "Explain photosynthesis" }] }
  ],
  "academicYear": "2025-2026",
  "gradeLevel": 3
}
```
Downstream call body expected to local backend:
```json
{
  "thread_id": "11111111-1111-1111-1111-111111111111",
  "user_message_id": "m1",
  "question": "Explain photosynthesis",
  "subject_id": "biology",
  "language": "de",
  "academic_year": "2025-2026",
  "grade_level": 3,
  "include_sources": true,
  "allow_web": true,
  "stream": false
}
```
Local backend fixture response (200):
```json
{
  "thread_id": "11111111-1111-1111-1111-111111111111",
  "message_id": "a2222222-2222-2222-2222-222222222222",
  "answer": "Photosynthesis converts light energy into chemical energy...",
  "sources": [
    {
      "source_id": "chunk-42",
      "material_id": "doc-9",
      "material_name": "Biology Chapter 4",
      "section": "4.2",
      "page": 87,
      "chapter": "Energy in cells",
      "snippet": "Chlorophyll absorbs light...",
      "score": 0.91,
      "url": null
    }
  ],
  "exam_tip": "Remember the light-dependent vs light-independent reactions.",
  "used_model": "Qwen/Qwen3.8-27B",
  "retrieval_summary": { "chunks_considered": 12, "chunks_used": 3, "collections": ["biology-g3"] },
  "language": "de",
  "created_at": "2026-09-14T10:00:00.000Z"
}
```
**Expected HTTP status:** `200`.
**Expected Supabase row effects:** one `messages` row inserted for `m1` (`role: "user"`) before the
backend call; one `messages` row inserted for the assistant reply (`role: "assistant"`, same
`thread_id`) after stream `onFinish`.

## S2. 401 — no bearer token
Request: same body as S1, header `Authorization` omitted.
**Expected HTTP status:** `401`.
**Expected Supabase row effects:** none — no `messages` insert, no call to local backend.

## S3. 401 — malformed JWT
Request: `Authorization: Bearer not-a-jwt`.
**Expected HTTP status:** `401`.
**Expected Supabase row effects:** none.

## S4. 404 — foreign threadId
Request: valid bearer token for user A, `threadId` belonging to user B.
**Expected HTTP status:** `404`.
**Body:** `"Thread not found"`.
**Expected Supabase row effects:** none — the ownership `.eq("user_id", userId)` filter returns no
row, so nothing is inserted and the local backend is never called.

## S5. 400 — missing threadId
Request body: `{ "messages": [...] }` (no `threadId`, no `data.threadId`).
**Expected HTTP status:** `400`.
**Body:** `"Thread ID is required"`.
**Expected Supabase row effects:** none.

## S6. 400 — no current user text message
Request body:
```json
{ "threadId": "11111111-1111-1111-1111-111111111111", "messages": [] }
```
**Expected HTTP status:** `400`.
**Body:** `"A current user message is required"`.
**Expected Supabase row effects:** none (empty `messages` array means `lastMessage` is undefined,
so the insert branch is skipped entirely).

## S6b. 400 — last message present but empty text
Request body:
```json
{
  "threadId": "11111111-1111-1111-1111-111111111111",
  "messages": [{ "id": "m2", "role": "user", "parts": [{ "type": "text", "text": "   " }] }]
}
```
**Expected HTTP status:** `400`.
**Body:** `"A current user message is required"`.
**Expected Supabase row effects:** a `messages` row **is** inserted for `m2` (the insert happens
before the `question.trim()` check in current code), then the request still returns `400` and no
assistant call/insert occurs. Codex must preserve or deliberately fix this ordering — flag any
change in `OPEN_BACKEND_QUESTIONS.md` rather than silently altering it.

## S7. 503 — local backend down
Setup: `ALIM_CONTEXT_BACKEND_URL` points at a host with nothing listening.
Request: same as S1.
**Expected HTTP status:** `503`.
**Body:** `"Context backend is unavailable"` (or backend's own message if a connection was made but
then reset).
**Expected Supabase row effects:** user message row inserted (see S1's ordering); no assistant row
inserted.

## S8. 503 — timeout at 90s
Setup: local backend accepts the connection but never responds.
Request: same as S1, with `ALIM_CONTEXT_BACKEND_TIMEOUT_MS` left at default `90000`.
**Expected behaviour:** request aborts at ~90000ms via `AbortController`.
**Expected HTTP status:** `503`.
**Body:** `"Context backend request timed out"`.
**Expected Supabase row effects:** user message row inserted; no assistant row inserted.

## S9. 502 — invalid response shape
Local backend fixture response (200, malformed):
```json
{ "thread_id": "11111111-1111-1111-1111-111111111111", "message_id": "x", "result": "oops, no answer field" }
```
**Expected HTTP status:** `502`.
**Error code:** `invalid_response`.
**Body:** `"Context backend returned an invalid response"`.
**Expected Supabase row effects:** user message row inserted; no assistant row inserted.

## S10. Backend error envelope passthrough
Local backend fixture response (422):
```json
{ "error": { "code": "context_backend_error", "message": "Subject not recognised: xyz" } }
```
**Expected HTTP status:** `422` (frontend forwards `response.status` verbatim).
**Body:** `"Subject not recognised: xyz"`.
**Expected Supabase row effects:** user message row inserted; no assistant row inserted.

## S11. Non-JSON backend body
Local backend fixture response (200): body `Internal Server Error` (plain text, not JSON).
**Expected behaviour:** `response.json().catch(() => null)` yields `null` → treated as no usable
`answer` → `502 invalid_response` per S9's rule (the `!response.ok` branch does not apply since
status is 200; the invalid-response branch handles it).
**Expected HTTP status:** `502`.

## S12. Media retention — descriptor not yet ready (negative test for cleanup worker)
**Status: BACKEND TODO FOR CODEX**
Fixture row in `media_retention_queue`:
```json
{
  "id": "r1",
  "user_id": "u1",
  "media_kind": "image",
  "storage_bucket": "chat-attachments",
  "object_path": "u1/generated-1.png",
  "descriptor_bucket": "assistant-descriptors",
  "descriptor_path": null,
  "status": "pending",
  "created_at": "2026-09-14T09:00:00.000Z",
  "delete_after": "2026-09-14T09:30:00.000Z",
  "deleted_at": null,
  "error_code": null
}
```
**When:** retention worker sweep runs at `2026-09-14T10:00:00.000Z` (well past `delete_after`).
**Expected effect:** `u1/generated-1.png` still exists in `chat-attachments`; the row's `status`
remains `pending` or becomes `failed` with an `error_code`; `deleted_at` stays `null`.

## S13. Media retention — descriptor ready, past delete_after
**Status: BACKEND TODO FOR CODEX**
Same fixture as S12 but `descriptor_path: "u1/generated-1.txt"`, `status: "descriptor_ready"`.
**When:** worker sweep runs past `delete_after`.
**Expected effect:** original object removed from `chat-attachments`; row updated with
`status: "deleted"`, `deleted_at` set to the sweep time.


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
