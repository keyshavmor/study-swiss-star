Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# Edge Functions

All five functions below are **deployed externally to this repository** — there is no
`supabase/functions/` implementation in this codebase. Contracts are declared from frontend call
sites plus `docs/archive/SUPABASE_SERVICES.md` (CURRENT — EXTERNAL INTEGRATION for behaviour; BACKEND
IMPLEMENTATION UNKNOWN for internals).

## `username-login`

- **Caller:** `frontend/src/components/AuthForm.tsx:94`.
- **Auth assumption:** unauthenticated caller (this *is* the sign-in path); the function itself must
  authenticate the username/password pair.
- **Input:** `{ username: string, password: string }` (username pre-normalised/validated
  client-side).
- **Output (v2, verified 2026-09-15):** HTTP 200 in every expected case.
  - success → `{ ok: true, access_token, refresh_token, expires_in, token_type }`
  - wrong username/password → `{ ok: false, error_code: "invalid_credentials" }`
  - service/config unavailable → `{ ok: false, error_code: "authentication_unavailable" }`
  Expected bad credentials are deliberately **no longer** an HTTP 401 Edge Function runtime error,
  which is what previously surfaced as a 401/blank-screen failure for an ordinary typo.
- **Side effects:** none on Supabase tables from the frontend's perspective; presumed to verify
  credentials against `auth.users`/`profiles` internally.
- **Tables/buckets touched:** none directly observable from the frontend; internals unknown.
- **Failure semantics:** `error_code: "invalid_credentials"` → generic
  `auth.usernamePasswordError` (no account enumeration, no email disclosed).
  `error_code: "authentication_unavailable"`, a transport failure or a missing body →
  generic `auth.errorGeneric` service error, never "wrong credentials". Classification lives in
  `frontend/src/lib/username-login.ts` (`classifyUsernameLogin`) and is unit-tested.

## `username-availability`

- **Caller:** `frontend/src/components/AuthForm.tsx:121`.
- **Auth assumption:** unauthenticated (called before sign-up completes).
- **Input:** `{ username: string }`.
- **Output:** `{ available: boolean, valid: boolean }`.
- **Side effects:** read-only (checks uniqueness, presumably against `profiles.username`).
- **Tables/buckets touched:** `profiles` (read-only, presumed).
- **Failure semantics — CRITICAL:** if `availability.error` is truthy or `data` is missing, the
  frontend must **not** report the username as taken; it proceeds to `supabase.auth.signUp` and
  treats the database unique constraint as final authority (`AuthForm.tsx:125-136`). Only an
  explicit `available === false` response triggers the "taken" message.

## `activity-log`

- **Caller:** `frontend/src/lib/telemetry.ts:76` (`logActivity`), invoked from dozens of instrumented
  call sites app-wide.
- **Auth assumption:** normally authenticated; anonymous calls are permitted **only** for
  `auth_signin_failed` and `oauth_signin_failed` event names (`docs/archive/SUPABASE_SERVICES.md`).
- **Input:** `{ event_name: string, feature?: string, subject?: string, properties?: Record<string,
  Primitive> }`, sanitised client-side (forbidden-key stripping, `MAX_STRING = 200`,
  `MAX_PROPERTIES = 12`, `route` auto-injected).
- **Output:** not consumed by the frontend (fire-and-forget; errors are swallowed after a single
  console warning, `telemetry.ts:66-75`).
- **Side effects:** writes a row to `public.usage_events` and a text object to the private
  `activity-logs` bucket at `<user_id>/<YYYY-MM-DD>/<uuid>.log`.
- **Tables/buckets touched:** `public.usage_events`, `activity-logs` bucket.
- **Failure semantics:** never surfaces to the user and never blocks the action that triggered it —
  `track()` is a void-returning wrapper that does not await.

## `feedback-submit`

- **Caller:** `frontend/src/lib/storage-management.ts` is unrelated; the actual caller is
  `frontend/src/routes/_authenticated/feedback.tsx:64`.
- **Auth assumption:** authenticated (route is under `_authenticated/`).
- **Input:** `{ message: string, category: string, context?: Json }`.
- **Output:** `{ ok, database_recorded, storage_recorded }`. The client is all-or-nothing: the form
  is cleared and full success shown ONLY when `ok === true && database_recorded === true &&
  storage_recorded === true`. Any partial 2xx (e.g. HTTP 207) keeps the typed text in the form and
  shows `feedback.error.partial`.
- **Side effects:** inserts a row into `public.feedback` and a text mirror into the private
  `feedback-messages` bucket at `<user_id>/<YYYY-MM-DD>/<uuid>.txt`.
- **Tables/buckets touched:** `public.feedback`, `feedback-messages` bucket.
- **Failure semantics:** partial and failed results both keep the user's text; raw Edge Function
  messages are never rendered. No direct client-side fallback
  write to `public.feedback` exists (the function is the only writer).

## `storage-emergency-cleanup`

- **Caller:** `frontend/src/lib/storage-management.ts:199` (`invokeEmergencyCleanup`).
- **Auth assumption:** authenticated (acts on the caller's own storage usage).
- **Input:** none (no body).
- **Output:** none consumed by the frontend beyond success/error.
- **Side effects:** "the backend function decides what to remove" (inline comment,
  `storage-management.ts:197`) — presumed to delete some of the caller's own Storage objects and/or
  associated metadata rows to bring usage back under quota.
- **Tables/buckets touched:** unspecified from the frontend's perspective; presumed to span
  `user-materials`/`chat-attachments` and related metadata tables (`documents`,
  `assistant_attachments`). Exact scope is BACKEND IMPLEMENTATION UNKNOWN.
- **Failure semantics:** any error is rethrown as `Error(error.message)` to the caller
  (`storage-management.ts:200`), typically surfaced as a UI error via `lib/ui-error.ts`.


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
