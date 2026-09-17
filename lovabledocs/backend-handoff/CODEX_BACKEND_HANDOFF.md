# CODEX backend handoff — what the local Python backend must implement

Scope: the local FastAPI backend (port 8001) plus the local model runtime
(llama.cpp / Qwen, port 8000). Everything listed under "already implemented"
exists in the Lovable frontend or in the production Supabase project and MUST
NOT be duplicated in Python.

## Already implemented — do not duplicate

- Supabase authentication, RLS-isolated user data, profiles, preferences,
  compliance/consents, moderation queues, peer messaging, documents/materials,
  and the existing assessment tables (`quizzes`, `quiz_attempts`, `mock_exams`,
  `mock_exam_attempts`, `grading_results`, `assessments`, `study_plans`).
- Per-user combined 50 MB quota: `get_my_quota_status()`,
  `can_allocate_my_quota()`, database trigger and Storage policy enforcement.
  See `docs/contracts/USER_QUOTA_CONTRACT.md`.
- The whole assessment frontend: setup wizard, typed question contracts, public
  question vs private answer key separation, lifecycle state machine, runner,
  submission review, quit/abandon flow, grading-pending and results/review UI,
  Knowledge Profile, scientific content rendering and answer inputs.
  See `docs/architecture/ASSESSMENT_SYSTEM.md`.
- Authentication/startup routing. AI readiness is NOT an auth gate; never
  design an endpoint that must answer before a user can sign in.

## 1. Assessment generation and grading

Operations (client abstraction: `frontend/src/lib/assessment/api.ts`; semantics:
`docs/contracts/ASSESSMENT_API_CONTRACT.md`):

`createGenerationJob`, `getGenerationStatus`, `cancelGeneration`,
`beginAssessment`, `heartbeat`, `submitAssessment`, `abandonAssessment`,
`getGradingStatus`, `getResult`.

Obligations:

- Report only real phases (`queued | generating | validating | ready | failed |
  cancelled | expired`). Never percentages the frontend must invent.
- The visible question payload must validate against `publicQuestionSchema` and
  must NOT contain correct options, tolerances, canonical values, model answers
  or rubrics. Those live in server-only storage and are returned only by
  `getResult` after grading.
- The backend is authoritative for elapsed time and time expiry.
- `abandonAssessment`, generation cancellation, sign-out cleanup and heartbeat
  TTL expiry MUST delete generated questions, answer keys and configuration and
  must NOT persist the set as a completed attempt.
- Only final submission creates a durable snapshot (questions, answers,
  provenance, timing, configuration, completion timestamp).
- Because a browser can be closed mid-flight, a lease/attempt TTL sweeper is
  mandatory: browser lifecycle events are best-effort only.

## 2. Local system capability probe and model recommendation

Contract: `docs/contracts/SYSTEM_CAPABILITY_CONTRACT.md`.

The backend is the ONLY authority for hardware values. It must:

- Detect the host OS (Linux/macOS).
- Measure CPU RAM total/available.
- Enumerate GPUs with name, VRAM total/available, accelerator backend
  (`cuda`/`rocm`/`metal`/`cpu`) and unified-memory flag (Apple silicon).
- Measure storage available to the model runtime (not the browser).
- Report automatic load balancing: mode (`gpu_only`, `cpu_gpu_split`,
  `unified_memory`, `cpu_only`), spare capacity, active model processes and
  machine-readable constraint codes.
- Produce a model recommendation: `recommended_model_id`, alternatives with
  estimated size and headroom, machine-readable rationale and warning codes.
- Return `measured_at`, measurement source and measurement quality.
- Return an explicit unavailable/error state rather than partial guesses; the
  frontend will present it truthfully and never fabricate values.

## 3. Existing system endpoints still outstanding

`/api/system/admission/check`, `/api/system/health`,
`/api/system/session/heartbeat`, `/api/system/runtime/release`,
`/api/system/model/recommendation`, `/api/model/status`, `/api/model/prepare`,
`/api/model/operation`, `/api/safety/moderate`, `/api/peer-messaging/send`,
`/api/safety/attachment-scan`.

Note the behavioural change: admission and model readiness are ADVISORY. They
govern AI availability only. They must never be required for authentication or
for non-AI product access.

## 4. Security obligations

- Authorization boundary is the verified Supabase bearer JWT. `X-Student-Id` is
  context only and must never be trusted for authorization.
- Never use a Supabase service-role key from a browser-reachable path.
- Never log, persist or echo bearer tokens.
- Private learning files stay in the private `user-materials` bucket under a
  path prefixed by the authenticated user's UUID.
- Never store answer keys where the client role can read them.
- Respect the per-user 50 MB quota: preflight with `can_allocate_my_quota()`
  before writing user-owned rows or objects on the user's behalf.


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
