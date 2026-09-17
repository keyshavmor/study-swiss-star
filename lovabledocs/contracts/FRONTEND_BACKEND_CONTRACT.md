Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# Frontend ↔ Local Python Backend Contract

Scope: the local Python context backend only (`{ALIM_CONTEXT_BACKEND_URL}/api/chat`, default `http://127.0.0.1:8001`). Everything below is EXPECTED BACKEND CONTRACT from the frontend's point of view — implementation is BACKEND IMPLEMENTATION UNKNOWN because no backend source exists in this repo. Source of truth: `frontend/src/lib/context-backend.server.ts`, `frontend/src/lib/context-backend.types.ts`, `frontend/src/routes/api/chat.ts`.

## Request

`POST {ALIM_CONTEXT_BACKEND_URL}/api/chat`

Headers:
```
Content-Type: application/json
X-Student-Id: <supabase user id (uuid)>
```

**`X-Student-Id` caveat (read carefully): this header is context only, never an authorization boundary.** It is a plain string set by the TanStack server route from the caller's already-verified Supabase JWT (`data.claims.sub`), but the local backend receives no cryptographic proof that the value is genuine — any process that can reach the backend's port can send an arbitrary `X-Student-Id`. **BACKEND TODO FOR CODEX**: if the backend needs an authorization boundary (e.g. to scope retrieval to a student's own documents), it must independently verify a Supabase-issued JWT (e.g. accept `Authorization: Bearer <jwt>` and validate it against Supabase's JWKS/issuer) rather than trusting `X-Student-Id` as identity proof.

Body:
```json
{
  "thread_id": "uuid",
  "user_message_id": "uuid | undefined",
  "question": "string (concatenated text parts of the latest user message)",
  "subject_id": "string | undefined (normalized, e.g. 'spf-biology', 'political-education')",
  "language": "de | en | fr | undefined",
  "academic_year": "string | undefined",
  "grade_level": "number | undefined",
  "include_sources": true,
  "allow_web": true,
  "stream": false
}
```

TypeScript (request), from `frontend/src/lib/context-backend.server.ts`:
```ts
interface ContextBackendRequest {
  thread_id: string;
  user_message_id?: string;
  question: string;
  subject_id?: string;
  language?: "de" | "en" | "fr";
  academic_year?: string;
  grade_level?: number;
  include_sources: true;
  allow_web: true;
  stream: false;
}
```

`subject_id` normalization (`normalizeSubjectId`) and `language` derivation (`languageForSubject`) are entirely frontend logic — the backend receives already-normalized values, it does not need to replicate subject-name parsing.

## Response (success)

TypeScript, from `frontend/src/lib/context-backend.types.ts`:
```ts
interface ContextChatResponse {
  thread_id: string;
  message_id: string;
  answer: string;
  sources: ContextSourceSnippet[];
  exam_tip: string | null;
  used_model: string;
  retrieval_summary: {
    chunks_considered: number;
    chunks_used: number;
    collections: string[];
  };
  language: string | null;
  created_at: string; // ISO-8601
}

interface ContextSourceSnippet {
  source_id: string;
  material_id: string | null;
  material_name: string | null;
  section: string | null;
  page: number | null;
  chapter?: string | null;
  snippet: string;
  score: number;
  url: string | null;
}
```

Example JSON:
```json
{
  "thread_id": "3b1e...9a",
  "message_id": "d4c2...11",
  "answer": "The derivative of x^2 is 2x because...",
  "sources": [
    {
      "source_id": "src-1",
      "material_id": "mat-42",
      "material_name": "Analysis I — Chapter 3",
      "section": "3.2 Power rule",
      "page": 14,
      "chapter": "Differentiation",
      "snippet": "For f(x) = x^n, f'(x) = n x^(n-1)...",
      "score": 0.87,
      "url": null
    }
  ],
  "exam_tip": "Always state the power rule before applying it.",
  "used_model": "Qwen/Qwen3.8-27B",
  "retrieval_summary": { "chunks_considered": 40, "chunks_used": 6, "collections": ["math-analysis-1"] },
  "language": "en",
  "created_at": "2026-09-14T10:00:00.000Z"
}
```

The frontend validates only that `payload.answer` is a `string`; any other missing field is passed through as-is (e.g. `exam_tip: null` is rendered as "no tip").

## Fields the frontend actually renders

From `frontend/src/routes/api/chat.ts` and `frontend/src/components/StudyChat.tsx`:
- `answer` → streamed as the assistant message text.
- `sources` → rendered as citation chips/snippets.
- `exam_tip` → rendered under the `chat.examTip` label ("Exam tip:") when non-null.
- `used_model` → surfaced in message metadata (`usedModel`).
- `retrieval_summary` → surfaced as `retrievalSummary` (chunks considered/used, collections) in message metadata; used for transparency UI, not for control flow.

`message_id`, `thread_id`, `language`, `created_at` are consumed internally (e.g. building the AI-SDK stream's text id) but are not separately rendered as their own UI elements.

## Streaming: `stream:false` today

The request always sends `"stream": false`. The local backend is expected to return one complete JSON object per call. The frontend's `/api/chat` route then wraps that single `answer` string as one `text-delta` inside an AI-SDK UI message stream purely to satisfy the AI SDK's chat transport shape — **this is not token streaming from the backend**, it is a single chunk. **EXPECTED BACKEND CONTRACT**: if/when the backend supports `stream:true` with incremental tokens, the frontend has no code path consuming that today (see "Contract extensions" below).

## Timeout / cancellation

- `ALIM_CONTEXT_BACKEND_TIMEOUT_MS` (default `90000` ms / 90s) drives a `setTimeout` that calls `controller.abort()` on an `AbortController` passed as `fetch`'s `signal`.
- On abort, the caught error's `name === "AbortError"` is mapped to the message "Context backend request timed out" and re-thrown as `ContextBackendError(message, 503, "context_backend_unavailable")`.
- There is no user-initiated mid-flight cancellation (e.g. a "stop generating" button) — the only aborts are timeout-driven.

## Error envelope

Non-2xx responses are expected to be JSON of the shape:
```json
{ "error": { "code": "string", "message": "string" } }
```
Parsing failure (non-JSON body, or `payload` without an `error` key) still produces a `ContextBackendError` using a generic HTTP-status message.

Frontend-recognized `code` values (used purely as pass-through/logging, not for branching logic beyond status mapping):
- `context_backend_error` — generic non-2xx from the backend.
- `invalid_response` — 2xx but the body did not have a string `answer` field (frontend synthesizes this with HTTP 502).
- `context_backend_unavailable` — network failure or timeout (frontend synthesizes this with HTTP 503).

`/api/chat` (the TanStack route) forwards `ContextBackendError.status` (default `503`) and `.message` as the HTTP response to the browser; it does not forward the `code` field today.

## Contract extensions the frontend is ready for but does not send today

- **`responseLanguageHint` / `ui_language` / `message_language` / effective response language** — `frontend/src/lib/i18n/detect.ts` computes `effectiveResponseLanguage(text, uiLanguage)` client-side (Cyrillic deterministic, Latin heuristic) purely to drive the browser's speech-synthesis locale (`frontend/src/lib/speech.ts`). It is **never sent** to `/api/chat` or the context backend. **BACKEND TODO FOR CODEX**: if the backend should answer in a student's preferred language, the frontend needs a documented field to send (e.g. `response_language_hint`); until then, response-language enforcement is entirely a BACKEND TODO — no contract exists for it today.
- **Streaming** — `stream:false` is hardcoded. **BACKEND TODO FOR CODEX**: incremental token streaming would require both a request flag change and new frontend stream-consumption code; today's `text-delta` handling assumes exactly one full-text chunk.
- **Cancellation** — no mid-flight cancel request/response contract exists. **BACKEND TODO FOR CODEX** if a "stop generating" UX is desired.
- **Audio** — the backend has no audio/TTS contract; all speech today is `window.speechSynthesis` in the browser (`frontend/src/lib/speech.ts`), ephemeral and never uploaded or requested from the backend. **BACKEND TODO FOR CODEX** for server-side TTS.
- **Media descriptors** — `frontend/src/lib/media-retention.ts` defines the client-side *shape* of a retention row (`descriptor_bucket`, `descriptor_path`) but explicitly states descriptor generation, descriptor upload, and the 30-minute cleanup worker "are backend responsibilities and are NOT implemented today." **BACKEND TODO FOR CODEX**.

Anything not explicitly listed as EXPECTED BACKEND CONTRACT or BACKEND TODO FOR CODEX above is out of scope for this document.


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


## Hardening addendum — bearer JWT is the authorization boundary

STATUS: CURRENT FRONTEND / EXPECTED LOCAL BACKEND CONTRACT.

Model-readiness requests from the TanStack server adapter carry:

```
Authorization: Bearer <caller Supabase access token>   # authorization boundary
X-Student-Id: <verified claims.sub>                     # context / cross-check only
```

The token comes from the request already verified by `requireSupabaseAuth`; it is never logged,
persisted, echoed to the browser or included in telemetry, and no service-role key is involved.
**BACKEND TODO FOR CODEX**: verify the JWT against Supabase JWKS/issuer and treat `X-Student-Id`
purely as a cross-check.

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


## Post-login gate — CURRENT (2026-09-17)

Supersedes any statement earlier in this file that language onboarding is a
once-per-account step or that model setup is optional/advisory.

Canonical order after Supabase Auth succeeds:
compliance (durable, once) → **language decision for this browser session**
(select a language or explicit skip) → **model decision for this browser
session** (backend-confirmed `ready`, or an explicit "Continue without AI") →
`/home` and the rest of the product.

- Authentication and non-AI product areas never depend on the local AI backend.
- `user_preferences.preferences.app_language` stays the durable default used to
  preselect the language screen; `language_onboarding_completed` is kept only as
  legacy compatibility metadata and is not a gate.
- `selected_qwen_model` persists a *preference*; readiness comes only from an
  explicit backend `ready` state (`alim.ai_session.v1` in `sessionStorage`).
- The decisions survive a refresh in the same session and are cleared on
  sign-out; direct navigation to a protected route re-runs the same gate.
- AI actions are centrally guarded (`AiFeatureGate` / `useAiBlocked`): blocked
  actions issue no request and show one localized red notice with retry,
  Settings and non-AI paths.

Full contract: `docs/backend-handoff/POST_LOGIN_LANGUAGE_MODEL_GATE_HANDOFF.md`;
sequence: `docs/sequences/POST_LOGIN_STARTUP.mmd`.
