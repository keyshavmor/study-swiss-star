```
Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466
```

# Backend Acceptance Criteria

Given/When/Then acceptance criteria for every backend-dependent frontend feature, success and
failure cases. Status of the underlying backend behaviour is noted per scenario using the shared
status labels; most are `BACKEND TODO FOR CODEX` because no confirmed backend implementation has
been inspected in this pass.

## 1. Subject chat — success path
**Status: EXPECTED BACKEND CONTRACT** (`frontend/src/routes/api/chat.ts`, `lib/context-backend.server.ts`)

- **Given** a signed-in user with a valid Supabase access token and an existing `threads` row they
  own,
- **When** they POST to `/api/chat` with a `threadId` and a final message with `role: "user"` and
  non-empty text,
- **Then** the response is a `200` UI-message stream containing `text-start`/`text-delta`/
  `text-end` parts whose concatenated text equals the local backend's `answer`, followed by a
  `data-context-metadata` part with `sources`, `examTip`, `usedModel`, `retrievalSummary`; the
  user's message and the assistant's reply are both persisted as rows in `messages` with the
  correct `thread_id`/`user_id`.

## 2. Subject chat — no bearer token
**Status: CURRENT — FRONTEND** (already enforced today)

- **Given** a request to `/api/chat` with no `Authorization` header, or a header not starting with
  `Bearer `, or a token that is not a well-formed JWT,
- **When** the request is received,
- **Then** the response is `401` and no rows are inserted into `messages`, and no call is made to
  the local backend.

## 3. Subject chat — foreign thread
**Status: CURRENT — FRONTEND**

- **Given** a valid bearer token for user A and a `threadId` that exists but belongs to user B,
- **When** user A POSTs to `/api/chat` with that `threadId`,
- **Then** the response is `404 "Thread not found"` and no rows are inserted, and no call is made
  to the local backend.

## 4. Subject chat — missing threadId or user text
**Status: CURRENT — FRONTEND**

- **Given** a valid bearer token,
- **When** the body has no `threadId` (and no `data.threadId`), **or** has a `threadId` but the
  last message is missing/not `role: "user"`/has only empty text parts,
- **Then** the response is `400` (`"Thread ID is required"` or `"A current user message is
  required"` respectively) and no assistant call is made. Note: if `threadId` is present and valid
  but the user-message check fails after the user message was already inserted, the user message
  row may still exist — Codex must not assume `400` implies zero side effects for this particular
  sub-case; see `BACKEND_TEST_SCENARIOS.md` for the exact ordering.

## 5. Local backend unavailable during chat
**Status: BACKEND TODO FOR CODEX (backend availability itself), CURRENT — FRONTEND (handling)**

- **Given** a valid bearer token, an owned thread, and a valid final user message,
- **When** the local backend at `ALIM_CONTEXT_BACKEND_URL` is down, refuses the connection, or
  returns non-JSON,
- **Then** the frontend returns `503` with a message such as "Local Qwen backend unavailable" or the
  backend's own `context_backend_unavailable` message, the UI must show a **localised failure
  state** in the chat UI (not a silent hang, not a fabricated assistant bubble), and **no**
  assistant-role row is inserted into `messages`. The user's own message row (inserted before the
  backend call) may remain — that is correct; only the assistant reply must never be fabricated.

## 6. Local backend timeout
**Status: BACKEND TODO FOR CODEX**

- **Given** the same setup as #5,
- **When** the local backend does not respond within `ALIM_CONTEXT_BACKEND_TIMEOUT_MS` (default
  90000 ms),
- **Then** the request is aborted, the frontend returns `503` with a timeout message
  ("Context backend request timed out"), and no assistant message is fabricated or inserted.

## 7. Invalid backend response shape
**Status: BACKEND TODO FOR CODEX**

- **Given** the same setup as #5,
- **When** the local backend returns HTTP 200 but the JSON body has no string `answer` field (or is
  not valid JSON),
- **Then** the frontend treats this as `invalid_response` and returns `502`, and no assistant
  message is inserted.

## 8. UI language Hochdeutsch + Italian user message
**Status: BACKEND TODO FOR CODEX** (response-language enforcement not implemented anywhere yet)

- **Given** a user whose `app_language` preference is `de` (Hochdeutsch) and whose
  `assistant_reply_language_policy` is `message_then_app` (the live default),
- **When** they send a chat message that `lib/i18n/detect.ts`'s `effectiveResponseLanguage()` would
  confidently classify as Italian (`it`),
- **Then** the **intended** backend behaviour is: the assistant's `answer` text is generated in
  Italian, while every other UI surface (menus, labels, dates, system messages) remains in
  Hochdeutsch — the reply language is a per-message property, not a UI-wide language switch.
- **And, failure case:** if the backend cannot yet honour this (current state — the frontend does
  not even transmit message-level language intent to the backend today, see
  `OPEN_BACKEND_QUESTIONS.md`), the assistant must still reply in a reasonable language and the UI
  chrome must remain Hochdeutsch regardless; the UI itself must never switch language based on a
  single chat message.

## 9. Planner never mutates a Google Calendar event
**Status: CURRENT — EXTERNAL INTEGRATION (frontend owns Calendar writes), BACKEND TODO FOR CODEX (planner content)**

- **Given** a user has linked Google Calendar (`calendar.readonly` scope via
  `supabase.auth.linkIdentity`, `lib/google-calendar.ts`),
- **When** any planner/study-plan backend feature runs (now or once implemented),
- **Then** no backend code path calls the Google Calendar API to create/update/delete an event; the
  scope granted is `readonly`, and any planner suggestions must be surfaced for the user to act on
  manually (or via a frontend-owned, explicitly user-triggered write path outside this backend's
  responsibility) rather than the backend performing a Calendar mutation itself.
- **And, failure case:** if a future implementation attempts a Calendar write with only a
  `readonly` scope, the Calendar API call itself will fail with an authorization error — that
  failure must be treated as a bug in the backend design (it should never have attempted the
  write), not merely caught and swallowed.

## 10. Upload succeeds in Storage but indexing fails
**Status: BACKEND TODO FOR CODEX**

- **Given** a user uploads a study document that lands successfully in a Storage bucket (e.g.
  `user-materials`),
- **When** the backend's ingestion/indexing step (chunking, embedding, writing
  `documents`/`document_chunks` rows) subsequently fails,
- **Then** the UI must show a correct, recoverable state: the document should be visible to the
  user as "uploaded, not yet indexed" or "indexing failed — retry", never silently treated as fully
  available for RAG, and never presented as a generic upload failure that implies the file itself
  is missing (the binary is safely in Storage). The user must be able to retry indexing without
  re-uploading the file.
- **And, success case:** once indexing succeeds (immediately or on retry), the document becomes
  available as a retrievable source in subsequent `/api/chat` calls.

## 11. Media descriptor missing → retention cleanup must not delete the binary
**Status: BACKEND TODO FOR CODEX** (`lib/media-retention.ts` policy)

- **Given** a `media_retention_queue` row exists for an assistant-output media object with
  `status = 'pending'` (no `descriptor_path` yet — i.e. the backend has not finished writing the
  descriptor to `assistant-descriptors`),
- **When** the retention worker's scheduled sweep runs, even if `delete_after` has already passed,
- **Then** the worker must **not** delete the original object in `storage_bucket`/`object_path`;
  it must leave the row as `pending` (or move it to a `failed` state with an `error_code`) and skip
  deletion until `status = 'descriptor_ready'`.
- **And, success case:** once the descriptor is written and `status` becomes `descriptor_ready`,
  and `delete_after` has passed, the worker deletes the original object and sets `deleted_at`.

## 12. Assistant never fabricates a reply (cross-cutting)
**Status: CURRENT — FRONTEND** (invariant already held by current frontend code; backend must not
regress it if it starts writing directly to `assistant_messages`/`messages`)

- **Given** any chat surface (subject chat or general Assistant),
- **When** the backend call fails, times out, or returns an invalid shape,
- **Then** no row with `role = 'assistant'` is inserted anywhere, under any code path, frontend or
  backend.

## 13. Localised UI errors only (cross-cutting)
**Status: CURRENT — FRONTEND (surface exists), BACKEND TODO FOR CODEX (must supply translatable codes)**

- **Given** any backend failure surfaced to the UI,
- **When** the error is rendered,
- **Then** it is shown through the app's approved language set and `lib/ui-error.ts`-style handling
  — never a raw stack trace, raw backend error `code`, or hardcoded English string bypassing i18n.

## Authenticated startup flow — acceptance cases (added this pass)

Status labels: CURRENT FRONTEND / CURRENT SUPABASE where already true today; everything about the
local backend below is **BACKEND TODO FOR CODEX** (EXPECTED LOCAL BACKEND CONTRACT), not yet
implemented in this repository.

1. **First login** → `/onboarding/language` (flag false/missing) → confirm language → `/onboarding/model`
   → backend reports `ready` → `/home` in AI-ready mode. CURRENT FRONTEND routing + CURRENT SUPABASE
   preference write already work; the `ready` response itself is BACKEND TODO FOR CODEX.
2. **Existing user, new browser session** → language step skipped (`language_onboarding_completed`
   already true) → model gate still required every new session → `ready` → `/home` AI-ready.
3. **Backend unavailable** (404/timeout/network error) → `state=backend_unavailable` → user can
   "Continue without AI" → `/home` renders fully, AI-dependent UI shows `AiUnavailableNotice`.
4. **Model absent, resources ≥ 50/50/50** → backend starts a single global download (no per-user
   duplicate) — BACKEND TODO FOR CODEX, see `sequences/MODEL_DOWNLOAD_DEDUPLICATION.mmd`.
5. **Two users request the same absent model concurrently** → exactly one artifact is written; the
   second caller observes `shared_download=true` / `queued` against the same operation, not a second
   download — BACKEND TODO FOR CODEX.
6. **Resources < 50/50/50 admission threshold** → no NEW heavy download or process allocation is
   started; already-downloaded models/reusable processes may still be used if the 30/25/30 runtime
   floors are met — BACKEND TODO FOR CODEX.
7. **Resources drop below 30/25/30 after load** → the session must never be marked AI-ready
   (`can_continue_with_ai=false`) even if the model finished loading — BACKEND TODO FOR CODEX; the
   frontend enforces this by only trusting `isAiReady()` (state `ready` AND `can_continue_with_ai`).
8. **Preparation failure** → red/danger state with machine-readable `blocking_reasons`, and the user
   can retry, pick another model, continue without AI, or log out — all four exits already exist in
   `/onboarding/model` (CURRENT FRONTEND).
9. **Settings → Local model → switch model / retry** → reuses the exact same `ModelReadinessPanel` +
   `ai-session.ts` flow as onboarding (CURRENT FRONTEND); no separate readiness logic exists.
10. **Global storage usage reaches ≥ 90%** → the platform-wide 5-minute cron cleanup (CURRENT
    SUPABASE, not user-disableable) deletes the globally oldest eligible objects in
    `user-materials`/`chat-attachments` down to ~80% used, cascading `documents` /
    `assistant_attachments` / `document_chunks`; auth, profiles, preferences and avatars are never
    touched. See `sequences/STORAGE_CAPACITY_CLEANUP.mmd`.

## Additional acceptance criteria (this pass): admission, safety, messaging

1. Never admit more than 10 concurrently active users (`max_active_users`).
2. Login admission requires ALL of GPU/RAM/local-disk free% >= 50 at check time; otherwise
   `denied_capacity` (retryable) or `denied_user_limit` (not retryable, at cap) — never fabricate
   `admitted`.
3. No new heavy allocation may be granted while any resource is below the 50/50/50 login floor.
4. Global utilisation must never exceed the effective caps: GPU 70% used, RAM 75% used,
   storage 70% used (the stricter of the 75%-used ceiling and the 30/25/30 free floors).
5. In-flight requests are preserved during rebalancing (`preserve_inflight_requests`); new
   allocations are queued, not rejected, while rebalancing is in progress
   (`queue_new_allocations_while_rebalancing`).
6. Model artifacts are shared globally — no duplicate per-user downloads of the same model.
7. Preferred model (`preferred_model_id`) and assigned runtime model (`assigned_model_id`) are
   tracked separately; assignment may downgrade to a lighter model with a `recommendation_reason_code`.
8. `/api/system/model/recommendation` reflects current health (`recommend_from_system_health`).
9. Runtime release (`/api/system/runtime/release`) must safely tear down only the caller's own
   process/VRAM allocation, identified by the verified JWT + lease id, never another user's.
10. A heartbeat/lease-expiry sweeper must reclaim abandoned sessions (browser closed without a
    clean sign-out) without requiring the frontend to send an explicit release call.
11. No raw unsafe content is ever written to logs, `moderation_events`, or telemetry — bounded
    category codes and hashes only.
12. The verified Supabase JWT is the sole authorization boundary for every local-backend call;
    `X-Student-Id` is context/cross-check only and must never be trusted as authentication.
13. Peer messages are persisted only after a `safety.verdict === "allow"` decision from
    `/api/safety/moderate` (or the equivalent internal check inside `/api/peer-messaging/send`).
14. Attachments are scanned via `/api/safety/attachment-scan` (or equivalent) before being written
    to the `peer-message-attachments` bucket; nothing is stored on a non-`allow` verdict.
15. `/api/system/health` must never expose another user's identity — only aggregate counts and the
    caller's own `owned_by_me` GPU instance flags.
