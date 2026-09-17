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


## Authenticated startup flow — CURRENT (2026-09-17)

Signed out → `/` (sign in / sign up; authentication NEVER waits on the local AI
backend) → `/onboarding/compliance` (durable, once, CURRENT SUPABASE
`account_compliance`) → **`/onboarding/language` — MANDATORY once per browser
session**: select a language (persists `user_preferences.preferences.app_language`
as the durable default) or explicitly skip → **`/onboarding/model` — MANDATORY
once per browser session**: system capability probe, recommendation, model
selection and prepare/poll; the app can be entered only after an explicit backend
`ready` confirmation (AI-ready) or an explicit "Continue without AI" (non-AI) →
`/home`.

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

## Compliance, safety & peer messaging

**Startup order (CURRENT FRONTEND / CURRENT SUPABASE, 2026-09-17):** signed out →
sign in/up → `/onboarding/compliance` (CURRENT SUPABASE flag
`account_compliance.compliance_onboarding_completed`, RPC
`complete_account_compliance_onboarding`) → `/onboarding/language` (MANDATORY
per-session decision) → `/onboarding/model` (MANDATORY per-session decision:
backend-confirmed `ready`, or explicit continue-without-AI) → `/home`. The system
admission gate is NOT part of this order any more; its data is shown on the model
screen and `/onboarding/system-admission` is optional. `account_compliance.account_status
= 'suspended_pending_review'` outranks every other route and redirects to
`/account/suspended`. Legal routes: `/legal/terms`, `/legal/privacy`,
`/legal/acceptable-use`, `/legal/child-safety`. See
`sequences/SIGNUP_ROLE_GUARDIAN_CONSENT.mmd`, `sequences/POST_LOGIN_STARTUP.mmd`.

## Post-login gate scenarios (2026-09-17)

| # | Scenario | Expected |
| --- | --- | --- |
| PG-1 | Fresh sign-in | `/onboarding/language` first, every browser session |
| PG-2 | Direct navigation to `/onboarding/model` with no language decision | redirect to `/onboarding/language`, no loop |
| PG-3 | AI decision present but no language decision | product routes still redirect to `/onboarding/language` |
| PG-4 | Language decided (select or skip) | `/onboarding/model` reachable, product routes still blocked |
| PG-5 | Backend never answers | model screen shows `backend_unavailable`; only retry / sign out / explicit continue-without-AI; non-AI product fully usable |
| PG-6 | Backend answers `ready` + `can_continue_with_ai` | normal continue appears; AI actions enabled |
| PG-7 | Persisted `selected_qwen_model` only | still counts as undecided; no AI until an explicit `ready` |
| PG-8 | Page refresh mid-session | both decisions preserved (sessionStorage) |
| PG-9 | Sign out, sign in again | both decisions required again |
| PG-10 | Backend lost during an AI action | bounded failure state in the UI, no hang, app shell intact |
