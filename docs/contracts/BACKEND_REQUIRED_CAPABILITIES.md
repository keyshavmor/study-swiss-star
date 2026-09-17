Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# Backend-Required Capabilities

Derived strictly from what the UI implies it needs. Status labels used verbatim: CURRENT — FRONTEND / CURRENT — SUPABASE / CURRENT — EXTERNAL INTEGRATION / EXPECTED BACKEND CONTRACT / BACKEND IMPLEMENTATION UNKNOWN / BACKEND TODO FOR CODEX / DEPRECATED — REMOVED.

## 1. Subject chat answering with provenance
- **UI surface**: `frontend/src/routes/_authenticated/chat.$threadId.tsx`, `frontend/src/routes/_authenticated/chat.index.tsx`, rendered by `frontend/src/components/StudyChat.tsx`.
- **Expected contract**: `POST /api/chat` → `POST {ALIM_CONTEXT_BACKEND_URL}/api/chat` returning `answer`, `sources[]`, `exam_tip`, `used_model`, `retrieval_summary` (see FRONTEND_BACKEND_CONTRACT.md).
- **Status**: EXPECTED BACKEND CONTRACT (request/response shape fixed by frontend code); BACKEND IMPLEMENTATION UNKNOWN.

## 2. General Assistant answering + attachment parsing
- **UI surface**: `frontend/src/routes/_authenticated/assistant.index.tsx`, `assistant.$threadId.tsx`, backed by `frontend/src/lib/assistant-data.ts` (`assistant_threads`/`assistant_messages`/`assistant_attachments`).
- **Expected contract**: none defined in frontend code today — `sendAssistantMessage` only persists the user's row and uploads attachments; per FACTS.md, "assistant_messages assistant rows are never fabricated by the frontend," implying a backend must insert the assistant reply row itself (no HTTP call from the frontend targets a backend for this).
- **Status**: BACKEND TODO FOR CODEX — no request contract exists yet; attachment parsing (`parse_status: "unparsed"` written by the frontend) also has no backend contract.

## 3. Context management / budgeting
- **UI surface**: implicit in `academicYear`/`gradeLevel`/`subject_id` passed on every `/api/chat` call (`frontend/src/routes/api/chat.ts`).
- **Expected contract**: backend receives these fields per turn and is expected to manage its own context window/budget when assembling retrieval + history; the frontend does not truncate or budget history before sending `messages`.
- **Status**: EXPECTED BACKEND CONTRACT (inputs only); BACKEND IMPLEMENTATION UNKNOWN.

## 4. Document ingestion + chunking + embeddings
- **UI surface**: `documents`/`document_chunks` tables referenced defensively by `frontend/src/lib/storage-management.ts` ("column names vary per deployment"); `user-materials` Storage bucket.
- **Expected contract**: none — no frontend code uploads to an ingestion endpoint; documents rows are read/soft-deleted only (`status: "deleted"`, `object_path: null`).
- **Status**: BACKEND TODO FOR CODEX — ingestion pipeline is assumed to exist elsewhere (backend-owned) but no contract is visible from the frontend.

## 5. Hybrid retrieval + reranking
- **UI surface**: `retrieval_summary.{chunks_considered,chunks_used,collections}` rendered in `StudyChat.tsx`.
- **Expected contract**: the backend performs retrieval/reranking internally and reports only the summary counts; no retrieval parameters (top-k, rerank model, etc.) are sent by the frontend.
- **Status**: EXPECTED BACKEND CONTRACT (output shape only); BACKEND IMPLEMENTATION UNKNOWN.

## 6. Student memory
- **UI surface**: none found — no route, component, or table reference for cross-session "memory" beyond ordinary `threads`/`messages` history.
- **Expected contract**: none defined.
- **Status**: BACKEND TODO FOR CODEX if desired; currently UNKNOWN/not implied by any UI surface.

## 7. Study plans
- **UI surface**: `chat.readyDescription` copy ("Ask for an explanation, a quiz, or a study plan for your next exam") in `frontend/src/lib/i18n/messages/chat.ts`; no dedicated route/table.
- **Expected contract**: implied to be produced as ordinary chat answers through `/api/chat`, not a separate endpoint.
- **Status**: EXPECTED BACKEND CONTRACT is "answer via `/api/chat`"; no structured study-plan schema exists. BACKEND IMPLEMENTATION UNKNOWN.

## 8. Quiz / mock exams
- **UI surface**: same `chat.readyDescription` copy referencing "a quiz"; no dedicated quiz route, table, or grading UI found.
- **Expected contract**: none structured — presumably delivered as chat text via `/api/chat`.
- **Status**: BACKEND TODO FOR CODEX for any structured quiz/exam contract (scoring, question schema); today it is at best free-text chat output.

## 9. Grading
- **UI surface**: `frontend/src/routes/_authenticated/stats.tsx`, `frontend/src/lib/grade-math.ts` (grade computation), `mock/grades.ts`. These compute/display grades the student enters — no AI-generated grading pipeline found.
- **Expected contract**: none for AI grading; `grade-math.ts` is pure frontend arithmetic on user-entered data.
- **Status**: CURRENT — FRONTEND for manual grade tracking; BACKEND TODO FOR CODEX if AI-assisted grading is intended (no evidence it is).

## 10. Web retrieval
- **UI surface**: `allow_web: true` sent on every context-backend request (`frontend/src/lib/context-backend.server.ts`).
- **Expected contract**: backend may perform web retrieval when `allow_web` is true; no distinct web-source shape beyond the generic `sources[]` entries (which already carry an optional `url`).
- **Status**: EXPECTED BACKEND CONTRACT (flag only); BACKEND IMPLEMENTATION UNKNOWN.

## 11. Response-language policy enforcement
- **UI surface**: `assistant_reply_language_policy: "message_then_app" | "app_only"` in `frontend/src/lib/account-data.ts` `UserPreferences`; `effectiveResponseLanguage` in `frontend/src/lib/i18n/detect.ts`.
- **Expected contract**: none sent to the backend — the preference and the detected hint are consumed entirely client-side (to pick a `speechSynthesis` voice locale). The `/api/chat` request carries only a coarse `language` derived from subject, not from this preference.
- **Status**: BACKEND TODO FOR CODEX — see FRONTEND_BACKEND_CONTRACT.md "Contract extensions" section; today response-language policy is NOT enforced backend-side by any documented field.

## 12. Audio / TTS generation
- **UI surface**: `chat.audio.listen`/`chat.audio.stop`, `assistant.audio.unsupported` copy; `frontend/src/lib/speech.ts` speak/stop functions used from `StudyChat.tsx`/`AssistantChat.tsx`.
- **Expected contract**: none — 100% browser `window.speechSynthesis`, ephemeral, never sent to or requested from any backend.
- **Status**: CURRENT — FRONTEND (browser-only); BACKEND TODO FOR CODEX if server-side TTS audio is ever desired (not implied by current UI, which has a graceful "unsupported" fallback instead).

## 13. Media descriptor generation
- **UI surface**: `frontend/src/lib/media-retention.ts` documents the policy (descriptor before deletion) and exposes `enqueueAssistantMedia`/`listRetentionQueue`, but explicitly states it "never generates descriptors client-side."
- **Expected contract**: a backend process must produce a descriptor object (bucket `assistant-descriptors`) and update the `media_retention_queue` row's `descriptor_path`/`status` before the 30-minute deletion.
- **Status**: BACKEND TODO FOR CODEX (explicitly called out in source comments as "FUTURE BACKEND / CODEX").

## 14. Retention cleanup worker
- **UI surface**: `media_retention_queue.delete_after` (default `now()+30min`), `RETENTION_MINUTES = 30` in `frontend/src/lib/media-retention.ts`; `minutesUntilDeletion`/`isOriginalExpired` are read-only helpers for display.
- **Expected contract**: a worker must delete the original media object after `delete_after` and set `deleted_at`/`status`/`error_code` accordingly.
- **Status**: BACKEND TODO FOR CODEX (explicitly not implemented per source comments).

## 15. Telemetry / error integration
- **UI surface**: `frontend/src/lib/telemetry.ts` (`track`, `trackFailure`, `installGlobalErrorTelemetry`) used across auth, feedback, storage, chat, planner code.
- **Expected contract**: `activity-log` Edge Function accepts the sanitised event payload (see EVENT_AND_TELEMETRY_CONTRACT.md) and persists to `usage_events` + `activity-logs` bucket.
- **Status**: CURRENT — SUPABASE (Edge Function invoked from frontend; implementation inside the function itself is CURRENT — SUPABASE (declared; not machine-verified this pass)).


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
