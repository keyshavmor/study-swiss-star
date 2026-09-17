```
Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
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
- `user_preferences.preferences.app_language` is a SAVED DEFAULT VISUAL HINT
  only. It never counts as the session selection: Continue on the language screen
  stays disabled until the user clicks a language in this session, or the user
  explicitly skips. `language_onboarding_completed` is kept only as legacy
  compatibility metadata and is not a gate.
- `selected_qwen_model` persists a *preference*; readiness comes only from an
  explicit backend `ready` state (`alim.ai_session.v1` in `sessionStorage`).
- The decisions survive a refresh in the same session and are cleared on
  sign-out; direct navigation to a protected route re-runs the same gate.
- AI actions are centrally guarded (`AiFeatureGate` / `useAiBlocked`): blocked
  actions issue no request and show one localized red notice with retry,
  Settings and non-AI paths.

Full contract: `docs/backend-handoff/POST_LOGIN_LANGUAGE_MODEL_GATE_HANDOFF.md`;
sequence: `docs/sequences/POST_LOGIN_STARTUP.mmd`.
