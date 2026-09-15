```
Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466
```

# Codex Handoff — Alim / Gymi Genius Backend

This is the single entry point for Codex (or any engineer) picking up the local Python backend
work for Alim. Read this file first, then follow the CODEX MISSION below in order.

## Authority rules — what Codex must trust

**AUTHORITATIVE, in this exact order of precedence when sources disagree:**

1. The **current frontend code** in `frontend/src` at the commit stated above (routes, `lib/`,
   `integrations/supabase/types.ts`).
2. The **current live Supabase schema, RLS policies, and Storage bucket configuration** on the
   production project (`ucacmeadsufiedxrgqit`) — inspected directly (SQL, `supabase` CLI, or
   dashboard), not recalled from memory or old docs.
3. **The documentation produced in this handoff pass** (`docs/backend-handoff/*`,
   `docs/contracts/*`, `docs/supabase/*`, `docs/architecture/*` as they exist at the time Codex
   reads them).
4. **The actual local backend source code Codex receives to work on** — its real current
   behaviour, not what any doc says it should do.

**NOT AUTHORITATIVE — must never override the above:**

- Old documentation, old screenshots, old Lovable exports, or anything under `lovabledocs/`.
- Deprecated UI behaviour or removed features (see "Removed / deprecated" list below).
- Prior assumptions about what the backend does, including this document's own prose if it turns
  out to disagree with the live frontend code or live Supabase state.
- Stale backend code in GitHub `main` if it differs from the actual local backend source Codex was
  handed for this task — the local backend Codex is asked to modify is the ground truth for
  "what exists today", not whatever is committed to `main`.

If any two authoritative sources conflict, prefer the higher-numbered-precedence item above and
flag the conflict in `OPEN_BACKEND_QUESTIONS.md` rather than silently picking one.

## CODEX MISSION (do these steps in order)

1. Read `docs/backend-handoff/CODEX_HANDOFF.md` (this file) in full.
2. Read the architecture diagrams: `docs/architecture/SYSTEM_CONTEXT.md` (+ `.mmd`),
   `docs/architecture/CONTAINER_ARCHITECTURE.md` (+ `.mmd`),
   `docs/architecture/FRONTEND_COMPONENT_ARCHITECTURE.md` (+ `.mmd`).
3. Read `frontend/UI_EVENT_TO_SYSTEM_MAP.md`. **Status at the time of this pass: not present in
   the repository.** If it is still missing when Codex starts, that gap itself is a blocker to
   flag back, not something to invent; do not fabricate its contents.
4. Read the contracts: `docs/contracts/*` (API/DTO contracts) together with
   `docs/backend-handoff/BACKEND_TEST_SCENARIOS.md` in this package for concrete request/response
   fixtures.
5. Read the Supabase schema/RLS/storage docs: `docs/supabase/DATABASE_SCHEMA.md`,
   `docs/supabase/DATABASE_ERD.mmd`, `docs/supabase/SUPABASE_CURRENT_STATE.md`, and
   `docs/archive/SUPABASE_SERVICES.md` — then confirm against the **live** Supabase project per the
   authority rules above.
6. Read the sequence diagrams referenced from `docs/architecture/CONTAINER_ARCHITECTURE.md` and
   any diagrams under `docs/architecture/` that show request flows (chat turn, upload, retention).
7. Inspect the actual local backend Codex has been handed: its routes, models, RAG/retrieval code,
   auth handling, and configuration. Do not assume it matches any doc until verified by reading it.
8. Compare the inspected backend against the contracts and against
   `BACKEND_GAP_MATRIX.md`. **Status at the time of this pass: `BACKEND_GAP_MATRIX.md` is not yet
   present in the repository.** Until it exists, build the comparison directly from
   `docs/backend-handoff/BACKEND_ACCEPTANCE_CRITERIA.md`,
   `docs/backend-handoff/BACKEND_TEST_SCENARIOS.md`, and `docs/backend-handoff/
   CODEX_IMPLEMENTATION_ORDER.md`, and produce `BACKEND_GAP_MATRIX.md` as part of the work if asked
   to, rather than assuming pre-existing gap content.
9. Implement the mismatches found in step 8, **without**:
   - breaking the frontend contract described below (request/response shapes, status codes, error
     envelope, streaming event shapes `text-start`/`text-delta`/`text-end` + `data-context-metadata`);
   - breaking Supabase RLS/ownership rules (the backend must operate within per-user isolation, not
     bypass it with a service-role key reachable from the browser).
10. Run the acceptance tests in `BACKEND_ACCEPTANCE_CRITERIA.md` and the scenarios in
    `BACKEND_TEST_SCENARIOS.md` against the implementation before declaring any item done.

## One-page system summary

Alim is a Swiss Gymnasium study app. The frontend is a TanStack Start v1 + React 19 app
(`frontend/src`) backed by Supabase (Postgres + Auth + Storage) for all persistent state
(threads/messages, assistant threads/messages/attachments, profiles, preferences, documents,
feedback, usage events, media retention queue). Supabase RLS enforces per-user row isolation
directly (see `docs/supabase/SUPABASE_CURRENT_STATE.md`).

For subject/tutoring chat, the frontend's own server route `frontend/src/routes/api/chat.ts`
(TanStack server route, not a separate service) verifies the caller's Supabase session, checks
thread ownership, persists the user's message, then calls a **local Python context/RAG backend**
(`lib/context-backend.server.ts`, `requestContextAnswer`) over plain HTTP at
`ALIM_CONTEXT_BACKEND_URL` (default `http://127.0.0.1:8001`). That local backend is expected to run
retrieval-augmented generation against ingested course materials and a local Qwen model
(llama.cpp runtime on port 8000, not called directly by the frontend) and return one JSON answer
(no server-sent streaming from the backend itself — the frontend fakes a UI-message stream from a
single response). The frontend then streams the answer back to the browser as AI-SDK UI message
parts and stores the assistant's reply in `messages` itself — **the frontend never fabricates an
assistant reply; every stored assistant message is bytes that came back from the local backend.**

The local Python backend, as of this pass, is unverified/unknown in its actual implementation. It
is expected to exist at the contract boundary described in `lib/context-backend.server.ts` and
`lib/context-backend.types.ts`, but no confirmed backend code has been inspected to write this
documentation — treat everything about its *internal* behaviour as
**BACKEND IMPLEMENTATION UNKNOWN** until Codex reads the real source.

Language handling, audio, media descriptors/retention, quiz/exam/grading, study-plan, and the
general Assistant's own reply generation are all **BACKEND TODO FOR CODEX** — the frontend has
client-side scaffolding (preferences, detection heuristics, retention queue rows, UI states) but
no server-side enforcement or generation exists yet.

## The `/api/chat` contract (exact)

**Route:** `frontend/src/routes/api/chat.ts`, `POST /api/chat` (TanStack server route, part of the
frontend deployment, not the Python backend).

**Auth:** `Authorization: Bearer <supabase access token>` header is required. The token is passed
to `supabase.auth.getClaims(token)`; missing header, malformed JWT (not 3 dot-separated segments),
or claims lookup failure → `401`. There is no other authentication path.

**Request body** (JSON; fields also accepted nested under `data`):
```json
{
  "messages": [ /* AI-SDK UIMessage[] */ ],
  "threadId": "uuid",
  "academicYear": "2025-2026",
  "gradeLevel": 3
}
```
- `threadId` missing → `400 "Thread ID is required"`.
- Thread must exist in `threads` with `user_id = <caller>`; otherwise → `404 "Thread not found"`.
- The last message in `messages` must have `role: "user"` and non-empty text across its
  `text` parts; otherwise → `400 "A current user message is required"`.

**Server-side steps:**
1. Verify auth, load thread (ownership check as above).
2. Insert the caller's user message into `messages` (`thread_id`, `user_id`, `id`, `role`,
   `content`, `parts`).
3. Call `requestContextAnswer` (see below) with `{ studentId, threadId, userMessageId, question,
   subject: thread.subject, academicYear, gradeLevel }`.
4. On backend failure, return `new Response(message, { status })` using the
   `ContextBackendError.status` (default `503`) and its message — **not** a 200 with an error
   payload.
5. On success, stream an AI-SDK UI message stream:
   - `text-start` / `text-delta` (the full answer as one delta) / `text-end`, all under one text id.
   - `data-context-metadata` part: `{ sources, examTip, usedModel, retrievalSummary }`.
   - `onFinish`: insert the assistant message into `messages` with the concatenated text content.

**Downstream call to the local backend** (`lib/context-backend.server.ts`):
```
POST {ALIM_CONTEXT_BACKEND_URL:-http://127.0.0.1:8001}/api/chat
Content-Type: application/json
X-Student-Id: <supabase user id>       // context only — NOT an authorization boundary
```
```json
{
  "thread_id": "uuid",
  "user_message_id": "uuid",
  "question": "string",
  "subject_id": "mathematics",
  "language": "de",
  "academic_year": "2025-2026",
  "grade_level": 3,
  "include_sources": true,
  "allow_web": true,
  "stream": false
}
```
Timeout: `ALIM_CONTEXT_BACKEND_TIMEOUT_MS` (default `90000` ms) via `AbortController`.

**Expected success response** (`ContextChatResponse`, `lib/context-backend.types.ts`):
```json
{
  "thread_id": "uuid",
  "message_id": "uuid",
  "answer": "string",
  "sources": [
    {
      "source_id": "string",
      "material_id": "string|null",
      "material_name": "string|null",
      "section": "string|null",
      "page": 0,
      "chapter": "string|null",
      "snippet": "string",
      "score": 0.0,
      "url": "string|null"
    }
  ],
  "exam_tip": "string|null",
  "used_model": "string",
  "retrieval_summary": { "chunks_considered": 0, "chunks_used": 0, "collections": ["string"] },
  "language": "string|null",
  "created_at": "ISO-8601"
}
```
**Expected error envelope:** `{ "error": { "code": "string", "message": "string" } }` with a
non-2xx HTTP status. Codes the frontend already understands: `context_backend_error` (from the
backend's own envelope), `invalid_response` (payload had no usable `answer` string → mapped to
HTTP `502`), `context_backend_unavailable` (network failure, non-JSON body, or abort/timeout →
HTTP `503`).

## Invariants Codex must not break

- **Auth is a verified Supabase JWT.** Every privileged operation must trace back to
  `supabase.auth.getClaims(token)` succeeding for a `Bearer` token. There is no session-cookie or
  API-key auth path for `/api/chat`.
- **`X-Student-Id` is not an authorization boundary.** It is convenience context for the local
  backend (e.g. for logging/personalisation) and must never be trusted as proof of identity by
  itself; the backend must not perform any authorization decision based solely on this header.
- **RLS enforces per-user isolation.** All Supabase reads/writes the backend performs on the
  user's behalf must respect row-level security equivalent to `user_id = auth.uid()`; the backend
  must not read or write another user's rows even if it technically has the ability to.
- **No service-role key in browser code.** Any Supabase service-role key belongs only in
  backend-side, non-browser-reachable code/config. It must never be shipped to or callable from
  `frontend/src` browser bundles.
- **The frontend never fabricates assistant replies.** Every assistant message stored in
  `messages`/`assistant_messages` must be derived from an actual backend response; on backend
  failure the UI must show a failure state, never a synthesized "assistant" answer.
- **Descriptor-before-delete.** For assistant-output media retention
  (`lib/media-retention.ts`), a descriptor must be written to the `assistant-descriptors` bucket
  and its path recorded (`descriptor_path`) **before** the original media object may be deleted by
  any retention worker. A row without a ready descriptor must never be cleaned up as if it were.
- **Localised UI errors only.** User-visible error text must go through the app's approved
  language set (7 languages, see `lib/i18n/languages.ts`) and existing UI error surfaces
  (`lib/ui-error.ts`) — never raw backend stack traces, English-only hardcoded strings bypassing
  i18n, or leaking internal error codes verbatim to end users.

## Package contents

- `docs/backend-handoff/CODEX_HANDOFF.md` — this file.
- `docs/backend-handoff/CODEX_IMPLEMENTATION_ORDER.md` — dependency-ordered implementation plan.
- `docs/backend-handoff/BACKEND_ACCEPTANCE_CRITERIA.md` — Given/When/Then acceptance criteria.
- `docs/backend-handoff/BACKEND_TEST_SCENARIOS.md` — executable-style request/response fixtures.
- `docs/backend-handoff/OPEN_BACKEND_QUESTIONS.md` — unresolved contract decisions + recommended defaults.

Related existing documentation referenced above (outside this package, read-only for Codex):
`docs/architecture/SYSTEM_CONTEXT.md`, `docs/architecture/CONTAINER_ARCHITECTURE.md`,
`docs/architecture/FRONTEND_COMPONENT_ARCHITECTURE.md`, `docs/supabase/DATABASE_SCHEMA.md`,
`docs/supabase/DATABASE_ERD.mmd`, `docs/supabase/SUPABASE_CURRENT_STATE.md`,
`docs/archive/SUPABASE_SERVICES.md`, `docs/archive/API_EXPECTATIONS.md`, `docs/archive/CONTEXT_MANAGER.md`,
`docs/archive/PYTHON_BACKEND_INTEGRATION_PLAN.md`, `docs/archive/BACKEND_INTEGRATION_TODO.md`,
`docs/archive/OPEN_QUESTIONS_FOR_BACKEND.md`, `docs/archive/QWEN_MODEL_RUNTIME_AND_WEB.md`,
`docs/archive/ASSISTANT_SETTINGS_AND_STORAGE.md`, `docs/archive/SUBJECT_MODEL_AND_LANGUAGE_RULES.md`,
`docs/archive/UI_BACKEND_MAPPING.md`. Treat any of these as **NOT AUTHORITATIVE** where they conflict with
the live frontend code, live Supabase state, or this package (see Authority rules above).


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
