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
  `/api/model/operation`, `/api/system/runtime/release`) is REQUIRED FUTURE BACKEND
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
