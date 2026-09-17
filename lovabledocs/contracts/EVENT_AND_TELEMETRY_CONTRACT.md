Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# Event and Telemetry Contract

Source of truth: `frontend/src/lib/telemetry.ts`.

## Transport

Every event is forwarded, best-effort, to the Supabase Edge Function `activity-log` via `supabase.functions.invoke("activity-log", { body: payload })`. A failure never surfaces to the user and never breaks the calling action (`logActivity` wraps the call in try/catch and swallows all errors).

## Sanitiser rules

- Values accepted: `string` (truncated to `MAX_STRING`), `number` (must be `Number.isFinite`), `boolean`, `null`. Anything else (`undefined`, objects, arrays, functions) is dropped.
- `MAX_STRING = 200` — string values (including `event_name`, `feature`, `subject`, and each property string) are truncated: `event_name` to 80 chars, `feature` to 80 chars, `subject` to 120 chars, individual property strings to 200 chars.
- `MAX_PROPERTIES = 12` — at most 12 properties survive sanitisation; iteration stops once the cap is hit.
- `FORBIDDEN_KEY` regex (case-insensitive), applied to every property key before the value is even sanitised:
  ```
  /(password|token|secret|key|authorization|cookie|message|content|prompt|body|title|description|location|summary|email)/i
  ```
  Any property whose key matches this pattern is dropped entirely, regardless of its value.
- `properties` is omitted from the payload entirely when nothing survives sanitisation (`Object.keys(out).length > 0 ? out : undefined`).
- The current page's `window.location.pathname` (as `route`) is always merged into the properties bag before sanitisation, so route-shaped telemetry is available on every event.

## Explicit forbidden-content list

Per the module's own doc comment (`frontend/src/lib/telemetry.ts:8-12`), telemetry must never send: passwords, access/refresh/provider tokens, raw form values, chat prompts or responses, document contents, or calendar event content. This is enforced both by the `FORBIDDEN_KEY` regex (catches keys named `message`, `content`, `prompt`, `title`, `description`, `location`, `summary`, `email`, etc.) and by convention at call sites (callers are expected not to pass prompt/response text as values under an innocuous key name — the regex is a backstop, not the only control).

## Event name catalogue (found via `rg` over `frontend/src`)

The following event names were located as literal `event_name` values passed to `track`/`logActivity`:
- `feedback_submitted` — `frontend/src/routes/_authenticated/feedback.tsx`, properties `{ category }`.
- `feedback_submit_failed` — `frontend/src/routes/_authenticated/feedback.tsx`, via `trackFailure`, properties `{ category, ...classifyError(err) }`.
- `browser_error` — `frontend/src/lib/telemetry.ts` (`installGlobalErrorTelemetry`), global `window.onerror` handler, properties `{ source: "window.error" }` plus `classifyError` fields.
- `browser_unhandled_rejection` — `frontend/src/lib/telemetry.ts`, global `unhandledrejection` handler, properties `{ source: "unhandledrejection" }` plus `classifyError` fields.

Additional call sites of `track`/`trackFailure` exist across the app (e.g. auth, storage, chat flows per the surrounding code patterns observed in `AuthForm.tsx`), but their exact `event_name` strings were not individually enumerated beyond the four confirmed above; do not invent names not found in source. Any consumer of this document that needs the full catalogue should `rg "event_name:|track\(|trackFailure\("` over `frontend/src` at doc-update time.

## `trackFailure`'s bounded error classification

`trackFailure(event_name, error, extra?)` calls `classifyError(error)` and merges its result into `properties`. `classifyError` is deliberately narrow:

```ts
function classifyError(error: unknown): Record<string, Primitive> {
  const out = { error_name: "UnknownError" };
  if (error instanceof Error) out.error_name = error.name.slice(0, 80);
  else if (typeof error === "string") out.error_name = "StringError";

  if (error && typeof error === "object") {
    const status = candidate.status ?? candidate.statusCode;
    if (typeof status === "number" && Number.isFinite(status)) out.error_status = status;
    if (typeof candidate.code === "string" && candidate.code.length <= 12) out.error_code = candidate.code;
    else if (typeof candidate.code === "number") out.error_code = candidate.code;
  }
  return out;
}
```

Only three keys are ever produced: `error_name` (constructor name or `"StringError"`/`"UnknownError"`), `error_status` (explicit numeric `status`/`statusCode` if present on the error object), and `error_code` (a short — ≤12 char — string code, or a numeric code). **`error.message`, `error.stack`, and `error.cause` are never read or forwarded** — this is intentional per the module's doc comment, because messages routinely contain user content (an email address, a form value, a calendar title, a database row).

## `usage_events` row shape

Per `frontend/src/integrations/supabase/types.ts` (see FACTS.md):
```
usage_events(id, user_id nullable, event_name, feature, subject, properties jsonb, occurred_at)
```
Note: no `created_at` column — the timestamp column is `occurred_at`. `user_id` is nullable, so pre-authentication or anonymous events are structurally supported by the schema even though `logActivity` runs under the current Supabase session context.

## Activity-logs object mirror

Per FACTS.md, the `activity-log` Edge Function also writes a text mirror of each event into the private `activity-logs` Storage bucket (path convention `<uid>/...` per the general bucket convention), in addition to the `usage_events` row. The exact mirror format (JSON line, file-per-event, etc.) is internal to the Edge Function and is BACKEND IMPLEMENTATION UNKNOWN — CURRENT — SUPABASE (declared; not machine-verified this pass).


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
