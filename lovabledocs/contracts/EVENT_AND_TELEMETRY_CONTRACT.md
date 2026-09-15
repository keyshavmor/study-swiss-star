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

## Compliance, system admission, safety & peer messaging (this pass)

**Startup order (CURRENT FRONTEND / CURRENT SUPABASE):** signed out → sign in/up →
`/onboarding/compliance` (gated on CURRENT SUPABASE flag
`account_compliance.compliance_onboarding_completed`, RPC
`complete_account_compliance_onboarding`) → `/onboarding/language` → SYSTEM ADMISSION gate
(`/onboarding/system-admission`, every new browser session, sessionStorage lease
`alim.admission_session.v1`, FAILS CLOSED — EXPECTED LOCAL BACKEND CONTRACT) → model readiness gate
(`alim.ai_session.v1`) → `/home`. `account_compliance.account_status = 'suspended_pending_review'`
outranks every other route and redirects to `/account/suspended`. New legal routes:
`/legal/terms`, `/legal/privacy`, `/legal/acceptable-use`, `/legal/child-safety`. See
`sequences/SIGNUP_ROLE_GUARDIAN_CONSENT.mmd`,
`sequences/STARTUP_COMPLIANCE_LANGUAGE_ADMISSION_MODEL_HOME.mmd`.

**System admission (EXPECTED LOCAL BACKEND CONTRACT, policy is CURRENT SUPABASE via
`get_system_admission_policy()`):** max 10 admitted users; login requires ≥50% free GPU/RAM/local
disk; automatic model rebalancing preserves in-flight requests and queues new allocations; health
informs model recommendation. Effective utilisation ceiling reconciles the earlier free-floor
policy (GPU≥30% free, RAM≥25% free, storage≥30% free) with the new 75%-used ceiling as an
ADDITIONAL cap: effective max used = GPU 70%, RAM 75%, storage 70%. See
`sequences/ADMISSION_MAX10_LOGIN50_RULE.mmd`, `sequences/EFFECTIVE_CAPS_75_VS_30_25_30_FLOORS.mmd`,
`sequences/MODEL_LOAD_BALANCING_LIGHTER_ASSIGNMENT.mmd`,
`sequences/INFLIGHT_PRESERVE_NEWCOMER_QUEUE_SAFE_REBALANCE.mmd`,
`sequences/SYSTEM_HEALTH_AGGREGATION.mmd`. New route: `/system-health`.

**Content safety (EXPECTED LOCAL BACKEND CONTRACT; queue/strike tables are CURRENT SUPABASE):**
verdicts `allow | block_warning | block_suspend_pending_review | safety_unavailable | scanning`.
First CONFIRMED violation blocks content and records a warning; second CONFIRMED violation sets
`suspended_pending_review` and, for students, queues a `guardian_notification_queue` item for
HUMAN review only — no automatic permanent deletion, no guardian disclosure from an unreviewed AI
classification. `apply_confirmed_safety_strike(...)` is service-role only, never callable from the
browser. Age-appropriate curriculum discussion of history/war/medicine/sexual health is explicitly
allowed; explicit/graphic/instructional/glorifying content unsuitable for minors is blocked. See
`sequences/FIRST_SAFETY_STRIKE.mmd`, `sequences/SECOND_STRIKE_SUSPENSION_GUARDIAN_REVIEW.mmd`.

**Peer messaging (CURRENT SUPABASE reads; sends are EXPECTED LOCAL BACKEND CONTRACT):** exact
username discovery only (`find_peer_by_exact_username`, no directory);
`get_or_create_direct_peer_conversation`, `mark_peer_conversation_read`; tables
`peer_conversations`, `peer_conversation_members`, `peer_messages`, `peer_message_attachments`,
`peer_message_notifications`, all RLS-scoped by membership. Direct client writes to messages and
attachments are intentionally disabled — only the local backend, after an `allow` verdict, may
persist them via `sendPeerMessage`. Attachments: private bucket `peer-message-attachments`, hard
250000-byte limit, PDF/DOC/DOCX/JPEG/PNG/WEBP allow-list, client-side compression ladder before
upload, no authenticated direct upload. New preferences: `peer_message_notifications` (default
true), `browser_message_notifications` (default false). New routes: `/messages`,
`/messages/$conversationId`. See `sequences/PEER_CHAT_CREATION_BY_USERNAME.mmd`,
`sequences/PEER_MESSAGE_MODERATION_SEND_NOTIFY.mmd`,
`sequences/ATTACHMENT_COMPRESS_SCAN_STORE.mmd`,
`sequences/OFFLINE_MESSAGE_NEXT_LOGIN_UNREAD.mmd`,
`sequences/MESSAGING_STORAGE_RLS_BOUNDARIES.mmd`.

**Endpoints (EXPECTED LOCAL BACKEND CONTRACT, centralised in
`frontend/src/lib/local-backend-endpoints.ts`):** `/api/model/*`,
`/api/system/admission/check`, `/api/system/health`, `/api/system/session/heartbeat`,
`/api/system/runtime/release`, `/api/system/model/recommendation`, `/api/safety/moderate`,
`/api/peer-messaging/send`, `/api/safety/attachment-scan`. The browser never talks to the local
backend directly: a TanStack server function forwards the caller's already-verified Supabase
bearer JWT server-to-server; `X-Student-Id` is context/cross-check only, never an authorization
boundary; no service-role key is used anywhere in this path.

**Sign-out (CURRENT FRONTEND; sweeper is BACKEND TODO FOR CODEX):** best-effort runtime release
call while the token is still valid, then Supabase `signOut()`, then clearing the AI session,
admission lease, Google token, transient messaging state and object URLs. A heartbeat/lease-TTL
sweeper that reclaims an abandoned session's model process/VRAM, session CPU/context RAM and
temporary local artifacts when the browser closes mid-flight is **not implemented** anywhere in
this repository. See `sequences/RELEASE_MY_MODEL.mmd`,
`sequences/SIGNOUT_RUNTIME_RELEASE_LEASE_TTL_FALLBACK.mmd`.

**Data rights (CURRENT SUPABASE):** `get_user_visible_supabase_health()` (unsupported quotas
reported as `not_exposed_by_sql`, never invented), `get_my_data_summary()`, and the JWT-protected
Edge Function `delete-my-data` (`range | all_content | delete_account`, Storage objects deleted
before DB rows, caller-only, no target-user-id parameter accepted). See
`sequences/DELETE_MY_DATA_RANGE.mmd`, `sequences/DELETE_MY_DATA_ALL_CONTENT_KEEP_ACCOUNT.mmd`,
`sequences/DELETE_ACCOUNT.mmd`, `sequences/GDPR_PRIVACY_DATA_MAP_RIGHTS_WORKFLOW.mmd`.

**LEGAL REVIEW REQUIRED BEFORE PRODUCTION:** see `legal/LEGAL_REVIEW_REQUIRED.md`. This pass makes
no claim of GDPR or any other regulatory certification; lawful basis, DPAs, records of processing,
breach procedures, jurisdictional guardian-consent rules and cookie/ePrivacy analysis are
organisational decisions outside what frontend code can establish.
