Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
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
- **Output:** `{ access_token, refresh_token }` on success; a generic error otherwise.
- **Side effects:** none on Supabase tables from the frontend's perspective; presumed to verify
  credentials against `auth.users`/`profiles` internally.
- **Tables/buckets touched:** none directly observable from the frontend; internals unknown.
- **Failure semantics:** any error or missing tokens → frontend throws a generic
  "auth.usernamePasswordError" — no account enumeration, no email disclosed.

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
- **Output:** success/failure surfaced as a toast in the feedback form; exact payload shape not
  otherwise consumed.
- **Side effects:** inserts a row into `public.feedback` and a text mirror into the private
  `feedback-messages` bucket at `<user_id>/<YYYY-MM-DD>/<uuid>.txt`.
- **Tables/buckets touched:** `public.feedback`, `feedback-messages` bucket.
- **Failure semantics:** surfaced to the user as an error toast; no direct client-side fallback
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
