Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# API Contracts

Every HTTP boundary the frontend actually calls. Nothing below is invented; each entry cites the real caller path.

## 1. `POST /api/chat` (TanStack Start server route)

- **Purpose**: Subject/tutoring chat turn — persists the user message, forwards the question to the local context backend, streams back an AI-SDK UI message.
- **Frontend caller**: `frontend/src/components/StudyChat.tsx` (via the AI SDK `useChat`/transport pointed at `/api/chat`).
- **Source**: `frontend/src/routes/api/chat.ts`.
- **Method / path**: `POST /api/chat`.
- **Authentication**: `Authorization: Bearer <supabase access token>` header, required. Verified server-side with `supabase.auth.getClaims(token)`; a malformed/absent/invalid token returns `401 Unauthorized` before any backend call.
- **Request headers**: `Authorization: Bearer <jwt>`, `Content-Type: application/json` (implicit, body is JSON).
- **Request body (JSON)**:
  ```json
  {
    "messages": [ /* UIMessage[] from the AI SDK */ ],
    "threadId": "uuid",
    "academicYear": "2025",
    "gradeLevel": 3
  }
  ```
  Also accepted nested under `data: { threadId, academicYear, gradeLevel }` (both shapes are read).
  **TypeScript** (informal, from `frontend/src/routes/api/chat.ts`):
  ```ts
  type Body = {
    messages?: UIMessage[];
    threadId?: string;
    academicYear?: string;
    gradeLevel?: number;
    data?: { threadId?: string; academicYear?: string; gradeLevel?: number };
  };
  ```
- **Response body**: An AI-SDK UI message stream (`createUIMessageStreamResponse`), not a single JSON object. Parts emitted: `text-start`, `text-delta` (the backend's full `answer` in one delta), `text-end`, then a custom data part `data-context-metadata` with:
  ```ts
  { sources: ContextSourceSnippet[]; examTip: string | null; usedModel: string; retrievalSummary: { chunks_considered: number; chunks_used: number; collections: string[] } }
  ```
- **Streaming behaviour**: The transport is a streaming response, but today the answer text arrives as a single `text-delta` (the backend itself returns `stream:false`); there is no token-by-token streaming from the local Python backend today. `onFinish` persists the assistant message into `messages` after the stream completes.
- **Cancellation**: Whatever `AbortController` behaviour the AI SDK's `useChat` transport provides client-side; the route itself does not expose an explicit cancel endpoint. No frontend code found that aborts an in-flight `/api/chat` request.
- **Timeout assumptions**: None enforced by this route directly; the inner call to the context backend has its own 90s timeout (see `requestContextAnswer`), after which this route returns `503`.
- **Errors**:
  - `401 Unauthorized` — missing/invalid bearer token or `getClaims` failure.
  - `400 Bad Request` — no `threadId`, or no current user text message (`"Thread ID is required"`, `"A current user message is required"`).
  - `404 Not Found` — thread not found or not owned by the caller (`"Thread not found"`).
  - `<status>` (default `503`) — backend failure; body is the `ContextBackendError.message`, status is `ContextBackendError.status` when available.
- **Backend responsibility**: The local Python context backend (see contract below) produces the actual answer, sources, exam tip and retrieval summary.
- **Supabase responsibility**: JWT verification (`auth.getClaims`), `threads` ownership check, persisting both the user message and the assistant message into `public.messages` (RLS scoped by `user_id = auth.uid()` per preview-project evidence).
- **Frontend responsibility**: Assembling `UIMessage[]`, sending the bearer token, rendering the streamed text plus `context-metadata` (sources / exam tip / used model / retrieval summary) in `frontend/src/components/StudyChat.tsx`.

## 2. `POST {ALIM_CONTEXT_BACKEND_URL}/api/chat` (local Python backend)

See `docs/contracts/FRONTEND_BACKEND_CONTRACT.md` for full implementation-level detail. Summary:

- **Purpose**: Produce a grounded tutoring answer with sources, an exam tip, and a retrieval summary for one subject-chat turn.
- **Frontend caller**: `frontend/src/lib/context-backend.server.ts` (`requestContextAnswer`), called only from `frontend/src/routes/api/chat.ts` (server-side, never from the browser).
- **Method / path**: `POST {ALIM_CONTEXT_BACKEND_URL}/api/chat`, default base URL `http://127.0.0.1:8001`.
- **Authentication**: None at the HTTP layer beyond network placement. Identity is carried via the `X-Student-Id` header only — **this header is context, not an authorization boundary** (see FRONTEND_BACKEND_CONTRACT.md). BACKEND TODO FOR CODEX: derive identity from a verified Supabase JWT if the backend needs an authorization boundary.
- **Request headers**: `Content-Type: application/json`, `X-Student-Id: <supabase user id>`.
- **Request body / response body / streaming / cancellation / timeout / errors**: see FRONTEND_BACKEND_CONTRACT.md (exact JSON shapes, 90s `AbortController` timeout, `stream:false`, `{error:{code,message}}` envelope).
- **Backend responsibility**: retrieval, ranking, answer generation, exam tip, retrieval summary, source attribution — status BACKEND IMPLEMENTATION UNKNOWN (no backend source in this repo).
- **Supabase responsibility**: none directly; the frontend passes `academic_year`/`grade_level` sourced from `user_preferences`/thread state.
- **Frontend responsibility**: building the request payload, enforcing the 90s abort, translating error envelopes into `ContextBackendError`, never exposing `X-Student-Id` as a trust boundary.

## 3. Supabase REST/Storage via the JS client (`@supabase/supabase-js`)

- **Purpose**: All CRUD for tutoring/assistant threads & messages, profiles, preferences, feedback rows, retention queue, and all Storage object upload/download/remove for the six private buckets.
- **Frontend caller**: `frontend/src/integrations/supabase/client.ts` is the shared client; consumers include `frontend/src/lib/chat.functions.ts` (threads/messages via `createServerFn`), `frontend/src/lib/assistant-data.ts` (assistant threads/messages/attachments + `chat-attachments` uploads), `frontend/src/lib/media-retention.ts` (`media_retention_queue`), `frontend/src/lib/storage-management.ts` (Storage removal + `documents`/`assistant_attachments` housekeeping), `frontend/src/lib/account-data.ts` (profiles/preferences/avatars), `frontend/src/components/AuthForm.tsx` (`supabase.auth.*`).
- **Method / path**: Supabase's generated PostgREST/Storage HTTP API, wrapped by the JS SDK; no raw paths are constructed by the frontend beyond bucket/object paths (`<uid>/...` convention, see FACTS.md).
- **Authentication**: The signed-in user's Supabase session (JWT) is attached automatically by the client; RLS enforces per-row/per-object ownership (`user_id = auth.uid()` on tables and `(storage.foldername(name))[1] = auth.uid()::text` on Storage per PREVIEW PROJECT ONLY evidence in FACTS.md; production policy is CURRENT — SUPABASE (declared; not machine-verified this pass)).
- **Request/response bodies**: table-shaped rows per `frontend/src/integrations/supabase/types.ts` (see FACTS.md table list); Storage calls take `File`/`Blob` uploads and return signed/public-less private object references (fetched via `download`/`createSignedUrl` where used).
- **Streaming**: N/A (request/response only).
- **Cancellation**: Whatever the underlying `fetch` in the SDK supports; no explicit `AbortController` usage found in the listed libs.
- **Timeout assumptions**: None set explicitly by the frontend; relies on Supabase/PostgREST defaults.
- **Errors**: Every call site checks `{ error }` and throws `new Error(error.message)` (never a `UiError` at this layer — callers wrap it, see `docs/contracts/ERROR_CONTRACTS.md`).
- **Backend responsibility**: none — this is a direct browser/server-to-Supabase boundary, no local Python backend involvement.
- **Supabase responsibility**: RLS enforcement, storage quota (`get_storage_usage_status()` RPC, 1 GiB quota per FACTS.md), referential integrity.
- **Frontend responsibility**: constructing row payloads, respecting `MEDIA_MAX_BYTES`/`AVATAR_MAX_BYTES` before upload, cleaning up partial uploads on metadata-insert failure (see `frontend/src/lib/assistant-data.ts` `sendAssistantMessage`).

## 4. Supabase Edge Functions

All five are invoked via `supabase.functions.invoke("<name>", { body })`, which POSTs JSON to the function under the project's Auth context (anon or user JWT as applicable).

### 4.1 `username-login`
- **Purpose**: Resolve a username to sign-in credentials.
- **Frontend caller**: `frontend/src/components/AuthForm.tsx:94`.
- **Method/path**: Edge Function invoke (`POST` under the hood).
- **Authentication**: Anonymous call (pre-authentication flow); function itself is trusted to look up the account.
- **Request body**: `{ username, password }` shape (exact fields per `AuthForm.tsx` call site).
- **Response**: sign-in outcome consumed to complete `supabase.auth.signInWithPassword` or equivalent; failure surfaces as `auth.usernamePasswordError` (see ERROR_CONTRACTS.md).
- **Errors**: Any failure is treated as "that username/password combination did not work" — never distinguishes "user not found" from "wrong password" in the UI copy.
- **Backend responsibility**: Edge Function (Supabase-hosted, not the local Python backend) does the credential resolution.
- **Supabase responsibility**: hosting/running the function, database lookup.
- **Frontend responsibility**: submitting normalised username (`normaliseUsername`), rendering the generic failure message.

### 4.2 `username-availability`
- **Purpose**: Pre-signup check whether a username is already taken.
- **Frontend caller**: `frontend/src/components/AuthForm.tsx:121`.
- **Authentication**: Anonymous.
- **Request body**: `{ username }`.
- **Response**: availability boolean/status.
- **Errors**: Per FACTS.md, a failure of this call must **not** be treated as "username taken" — the frontend must degrade to "unknown" rather than blocking signup.
- **Backend responsibility**: Edge Function database lookup.
- **Frontend responsibility**: distinguishing "confirmed taken" from "check failed" and not blocking signup on the latter.

### 4.3 `activity-log`
- **Purpose**: Telemetry ingestion — writes a `usage_events` row and mirrors the event as an object in the private `activity-logs` bucket.
- **Frontend caller**: `frontend/src/lib/telemetry.ts:76` (`logActivity`), used by `track`/`trackFailure` across the app.
- **Authentication**: Signed-in user's session (JWT); `usage_events.user_id` is nullable per FACTS.md, implying anonymous/pre-auth events are tolerated.
- **Request body**: `{ event_name: string (<=80 chars), feature?: string (<=80), subject?: string (<=120), properties?: Record<string, string|number|boolean|null> }` — sanitised client-side first (see EVENT_AND_TELEMETRY_CONTRACT.md).
- **Response**: not consumed by callers beyond error swallowing.
- **Streaming/cancellation/timeout**: N/A; fire-and-forget, wrapped in try/catch, failures never surface to the user (`logActivity` swallows all errors).
- **Errors**: Any Edge Function error is caught and dropped; a single `console.warn`-class comment notes best-effort delivery — no user-facing error, no retry.
- **Backend responsibility**: Edge Function writes `usage_events` + `activity-logs` object; local Python backend has no role.
- **Supabase responsibility**: durability of the write, RLS/service-role scoping inside the function.
- **Frontend responsibility**: sanitisation (`FORBIDDEN_KEY`, `MAX_STRING`, `MAX_PROPERTIES`) before the call ever leaves the browser.

### 4.4 `feedback-submit`
- **Purpose**: Submit user feedback; creates a `feedback` row and an object in the private `feedback-messages` bucket.
- **Frontend caller**: `frontend/src/routes/_authenticated/feedback.tsx:64`.
- **Authentication**: Signed-in user's session.
- **Request body**:
  ```json
  { "message": "string (10-4000 chars, trimmed)", "category": "idea|bug|general", "context": { "route": "string", "user_agent": "string (<=200)", "submitted_at": "ISO-8601" } }
  ```
- **Response**: `{ error }` shape checked by the SDK wrapper; success clears the form and shows `feedback.success.toast`.
- **Errors**: On any `fnError`, the raw (English, provider) message is logged to `console.error` and never rendered; the UI shows the localized `feedback.error.submitFailedGeneric`. Client-side validation (`trimmed.length < 10`) shows `feedback.error.tooShort` before any network call.
- **Backend responsibility**: Edge Function persists the `feedback` row and `feedback-messages` object.
- **Frontend responsibility**: length validation, category selection, non-PII context payload (route, truncated user agent, timestamp only).

### 4.5 `storage-emergency-cleanup`
- **Purpose**: Platform-wide emergency storage cleanup; the Edge Function decides what to remove (quota pressure relief).
- **Frontend caller**: `frontend/src/lib/storage-management.ts:199` (`invokeEmergencyCleanup`).
- **Authentication**: Signed-in user's session.
- **Request body**: none (no-arg invoke).
- **Response**: `{ error }` checked; on error, `throw new Error(error.message)`; caller in Settings maps this to `settings.storage.cleanupError`.
- **Backend responsibility**: Edge Function determines and executes deletions server-side.
- **Frontend responsibility**: triggering the call (e.g. from Settings storage screen) and surfacing the generic localized failure.

## 5. Google Calendar API v3 (read-only)

- **Purpose**: List the signed-in user's primary calendar events for the Planner's read-only overlay.
- **Frontend caller**: `frontend/src/lib/google-calendar.ts` (`fetchGoogleCalendarEvents`), used from the Planner route (`frontend/src/routes/_authenticated/planner.tsx`).
- **Method / path**: `GET https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=...&timeMax=...&singleEvents=true&orderBy=startTime&maxResults=250`.
- **Authentication**: `Authorization: Bearer <google provider access token>` — the token is captured from the Supabase session's `provider_token` after `supabase.auth.linkIdentity({ provider: "google", options: { scopes: "https://www.googleapis.com/auth/calendar.readonly" } })` and stored **only** in `sessionStorage` (key `alim.google-calendar.provider-token`), never in the database or `localStorage`.
- **Request headers**: `Authorization: Bearer <token>` only.
- **Request body**: none (GET).
- **Response body**: Google's standard Events list payload; the frontend only reads `items[].{id,status,summary,location,htmlLink,start,end}` (`GoogleApiEvent`), converting to `GoogleCalendarEvent { id, title, date, start, end, allDay, location?, link? }`.
- **Streaming**: N/A.
- **Cancellation**: none implemented (`fetch` without `AbortController` in `google-calendar.ts`).
- **Timeout assumptions**: none enforced client-side; relies on browser/network defaults.
- **Errors**: `401`/`403` → token cleared from `sessionStorage` and a `GoogleCalendarAuthError("access-expired", ...)` is thrown; any other non-OK status → `GoogleCalendarError("request-failed", ...)`. Full code list and localization in `docs/contracts/ERROR_CONTRACTS.md`.
- **Backend responsibility**: none — this call is made directly from the browser to Google; the local Python backend is never involved (per FACTS.md, "NOT called by the frontend" applies to the model runtime, and no backend code proxies Calendar).
- **Supabase responsibility**: hosting the OAuth identity link (`auth.linkIdentity`) and issuing sessions that carry `provider_token`; Supabase does not store or refresh the Google access token beyond the initial OAuth exchange.
- **Frontend responsibility**: token capture/expiry bookkeeping (55-minute conservative TTL), read-only merge of Google events into planner `Occurrence[]` (`googleOccurrences`), never writing back to Google, never persisting calendar content (titles/locations) to telemetry.


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


## Hardening addendum — model-readiness auth + strict language gate

STATUS: CURRENT FRONTEND / EXPECTED LOCAL BACKEND CONTRACT.

- **Authorization boundary (model endpoints)**: `frontend/src/lib/model-backend.server.ts` now sends
  `Authorization: Bearer <caller Supabase access token>` on every `/api/model/prepare`,
  `/api/model/operation` and legacy `/api/model/status` call. The token is read server-side by
  `model-readiness.functions.ts` (`callerAccessToken()`) from the request that
  `requireSupabaseAuth` already verified. **BACKEND TODO FOR CODEX**: validate this bearer JWT
  against Supabase's JWKS/issuer and use its `sub` as identity.
- **`X-Student-Id` is context / cross-check ONLY** — never authentication, on any endpoint.
- The token is never logged, persisted, returned to the browser or sent to telemetry. No
  service-role key is used in the browser or in this server adapter.
- Unreachable, 404, timeout or unparsable backend responses still map to `backend_unavailable`;
  readiness is never fabricated.
- **Strict language-first gate**: `startup-flow.ts` `languageOnboardingStatus()` returns
  `completed | required | unknown`. A failed `user_preferences` read yields `unknown`, is never
  cached, and keeps the user on `/onboarding/language` with a localized retry state — product
  routes including `/home` stay unreachable until completion is actually known.

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

## Chat safety moderation gate (this pass)

**CURRENT FRONTEND:** `POST /api/chat` (`frontend/src/routes/api/chat.ts`) now calls
`/api/safety/moderate` (surface `ai_prompt`) on the caller's prompt before storing the user
message or requesting an answer from the context backend. While the safety backend is missing or
unreachable, the route returns `HTTP 503` with header `X-Safety-Verdict: safety_unavailable` and
body `safety:safety_unavailable` — it never falls back to answering unmoderated. When the safety
backend returns a blocking verdict, the route returns `HTTP 403` with the bounded verdict code
(e.g. `block_warning`, `block_suspend_pending_review`) and never echoes the offending prompt text
back in the response. See `docs/contracts/ERROR_CONTRACTS.md` for the corresponding UI-facing
failure catalogue entry and `docs/sequences/FIRST_SAFETY_STRIKE.mmd`.

**LEGAL REVIEW REQUIRED BEFORE PRODUCTION:** see `legal/LEGAL_REVIEW_REQUIRED.md`. This pass makes
no claim of GDPR or any other regulatory certification; lawful basis, DPAs, records of processing,
breach procedures, jurisdictional guardian-consent rules and cookie/ePrivacy analysis are
organisational decisions outside what frontend code can establish.
