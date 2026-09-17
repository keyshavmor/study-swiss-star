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


## Authenticated startup flow — CURRENT (2026-09-17)

Signed out → `/` (sign in / sign up; authentication NEVER waits on the local AI
backend) → **`/onboarding/language` — MANDATORY once per browser
session**: select a language (persists `user_preferences.preferences.app_language`
as the durable default) or explicitly skip → **`/onboarding/model` — MANDATORY
once per browser session**: system capability probe, recommendation, model
selection and prepare/poll; the app can be entered only after an explicit backend
`ready` confirmation (AI-ready) or an explicit "Continue without AI" (non-AI) →
`/onboarding/compliance` if compliance onboarding is still required (durable,
once, CURRENT SUPABASE `account_compliance`) → `/home`.

- Session gates: `alim.language_session.v1` and `alim.ai_session.v1`
  (`sessionStorage`). They survive a refresh and are cleared on sign-out.
- `language_onboarding_completed` is LEGACY compatibility metadata only — it is
  NOT a gate. `selected_qwen_model` is a durable PREFERENCE and never means the
  model is ready. Runtime/model/GPU readiness is never stored in Supabase.
- Route order is enforced: opening `/onboarding/model` by hand with no language
  decision redirects to `/onboarding/language`, and product routes stay blocked
  until both decisions exist (`startupRedirectFor`, `_authenticated/route.tsx`).
- There is NO mandatory system-admission screen between language and model;
  capability, admission and recommendation data are shown on the model screen.
  `/onboarding/system-admission` remains an optional diagnostics surface.
- Model preparation (`/api/system/capability`, `/api/model/prepare`,
  `/api/model/operation`, `/api/system/release`) is REQUIRED FUTURE BACKEND
  (BACKEND TODO FOR CODEX). Unreachable / 404 / timeout / unparsable ⇒
  `backend_unavailable`, shown truthfully; no values are fabricated.
- Resource policy: 50/50/50 admission, 30/25/30 runtime floors — CURRENT SUPABASE
  `get_ai_runtime_policy()`. Model catalogue: CURRENT SUPABASE `ai_model_catalog`,
  hard-coded list is fallback only.
- AI-dependent actions (chat, quiz/exam generation, grading) are centrally guarded
  (`AiFeatureGate` / `useAiBlocked`): without an AI-ready session no request is
  issued and one localized red notice offers retry model setup, Settings, or
  continuing with non-AI features. Non-AI features stay fully usable.
- The per-user `auto_storage_cleanup` preference is REMOVED; cleanup is the
  platform-wide 5-minute cron in `docs/supabase/STORAGE_LIFECYCLES.md`.

Canonical: `docs/sequences/POST_LOGIN_STARTUP.mmd`,
`docs/sequences/LANGUAGE_ONBOARDING.mmd`,
`docs/backend-handoff/POST_LOGIN_LANGUAGE_MODEL_GATE_HANDOFF.md`.

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

## Compliance, safety & peer messaging

**Startup order (CURRENT FRONTEND / CURRENT SUPABASE, 2026-09-17):** signed out →
sign in/up → `/onboarding/language` (MANDATORY per-session decision) →
`/onboarding/model` (MANDATORY per-session decision: backend-confirmed `ready`,
or explicit continue-without-AI) → `/onboarding/compliance` if still required
(CURRENT SUPABASE flag `account_compliance.compliance_onboarding_completed`, RPC
`complete_account_compliance_onboarding`) → `/home`. The system
admission gate is NOT part of this order any more; its data is shown on the model
screen and `/onboarding/system-admission` is optional. `account_compliance.account_status
= 'suspended_pending_review'` outranks every other route and redirects to
`/account/suspended`. Legal routes: `/legal/terms`, `/legal/privacy`,
`/legal/acceptable-use`, `/legal/child-safety`. See
`sequences/SIGNUP_ROLE_GUARDIAN_CONSENT.mmd`, `sequences/POST_LOGIN_STARTUP.mmd`.

## Post-login gate — CURRENT (2026-09-17)

Supersedes any statement earlier in this file that language onboarding is a
once-per-account step or that model setup is optional/advisory.

Canonical order after Supabase Auth succeeds (account suspension pre-empts
everything):
**language decision for this browser session** (select a language or explicit
skip) → **model decision for this browser session** (backend-confirmed `ready`,
or an explicit "Continue without AI") → compliance onboarding *if still
required* (durable, once) → `/home` and the rest of the product.
Ordinary compliance onboarding NEVER appears before the language and model
decisions; a suspended account (`suspended_pending_review`) still outranks all
of them.

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
