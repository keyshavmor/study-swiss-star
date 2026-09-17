Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

> Supersedes: `docs/frontend/STATE_OWNERSHIP.md` (top-level, if present). Archived centrally.

# State ownership

Diagram: `docs/frontend/STATE_OWNERSHIP.mmd`.

| Datum | Owning layer | Owning module | Notes |
|---|---|---|---|
| Active user (Supabase session) | Supabase Auth session | `@supabase/supabase-js` client, `frontend/src/integrations/supabase/client.ts` | Read via `supabase.auth.getUser()`/`getSession()`; gate check in `_authenticated/route.tsx`. |
| Username | Supabase PostgreSQL | `public.profiles.username` | Read/write via `lib/account-data.ts` (`fetchAccountProfile`/`updateAccountProfile`); also passed as `signUp` metadata and consumed by the `username-login`/`username-availability` Edge Functions. |
| App language (interface language) | Supabase PostgreSQL (authority) + localStorage (cache) + React context state (live value) | `public.user_preferences.preferences.app_language` (authority); `localStorage "alim.app_language"` (flash-avoidance/signed-out cache); `lib/i18n/provider.tsx` `I18nProvider` (live `language` state) | See `I18N_AND_LANGUAGE.md` for precedence. |
| Audio preferences (`assistant_audio_enabled`, `assistant_audio_autoplay`) | Supabase PostgreSQL | `public.user_preferences.preferences` | `lib/account-data.ts` `fetchPreferences`/`savePreferences`; mirrored into local component state in `StudyChat.tsx`/`AssistantChat.tsx`/`SettingsSections.tsx` as a snapshot fetched on mount. |
| Active subject (School page selection) | URL/router state | `frontend/src/routes/_authenticated/school.$subject.tsx` (path param) | The subject slug lives in the route path, resolved against `lib/mock/subjects.ts`. |
| Planner events | React context/provider state, persisted to localStorage | `lib/store/app-data.tsx` `AppDataProvider` (`DataState.events`), `localStorage "asa.data.v2"` | No Supabase table backs planner events today; entirely client-side prototype state. |
| Google Calendar events | Local component state (fetched per view), never persisted | `frontend/src/components/app/GoogleCalendarCard.tsx`, `lib/google-calendar.ts` (`fetchGoogleCalendarEvents`) | Rendered as read-only `Occurrence`s merged with local planner events; never written to `AppDataProvider` or Supabase. |
| Chat thread (tutoring) | Supabase PostgreSQL | `public.threads` | CRUD via `lib/chat.functions.ts` server functions; selected thread id lives in the URL (`chat.$threadId.tsx` route param) = URL/router state for "which thread is active". |
| Chat thread (assistant) | Supabase PostgreSQL | `public.assistant_threads` | CRUD via `lib/assistant-data.ts`; active thread id likewise URL/router state (`assistant.$threadId.tsx`). |
| Messages (tutoring) | Supabase PostgreSQL + model/context state (in-flight stream) | `public.messages` (persisted); `@ai-sdk/react` `useChat` internal state (in-flight streamed message, local backend model context) | Persisted rows written by `frontend/src/routes/api/chat.ts` (both user and assistant message on the server route, not the browser). |
| Messages (assistant) | Supabase PostgreSQL | `public.assistant_messages` | Written directly from the browser via `lib/assistant-data.ts` (`sendAssistantMessage`); assistant-role rows are never fabricated by the frontend (BACKEND IMPLEMENTATION UNKNOWN for assistant replies). |
| Document metadata | Supabase PostgreSQL + Supabase Storage | `public.documents`/`public.document_chunks` (loose columns, backend-owned) + storage-management.ts defensive read (`lib/storage-management.ts`) | Column names vary per deployment; frontend never assumes a fixed shape beyond a handful of best-effort field names. |
| Grades / assessments | React context/provider state, persisted to localStorage | `lib/store/app-data.tsx` `AppDataProvider` (`DataState.assessments`), `localStorage "asa.data.v2"` | No Supabase table; entirely prototype/local. |
| Feedback | Supabase PostgreSQL + Supabase Storage | `public.feedback` + `feedback-messages` bucket, via the `feedback-submit` Edge Function | Submitted from `frontend/src/routes/_authenticated/feedback.tsx`; local component state (`message`, `category`, `sending`) is ephemeral. |
| Telemetry (usage events) | Supabase PostgreSQL + Supabase Storage | `public.usage_events` + `activity-logs` bucket, via the `activity-log` Edge Function (`lib/telemetry.ts`) | Best-effort, fire-and-forget from the browser; payloads scrubbed of content/PII. |
| Uploaded files (assistant attachments) | Supabase Storage + Supabase PostgreSQL (metadata) | `chat-attachments` bucket + `public.assistant_attachments` | `lib/assistant-data.ts`; path convention `<uid>/...`. |
| Uploaded files (avatar) | Supabase Storage + Supabase PostgreSQL (path reference) | `profile-avatars` bucket + `public.profiles.photo` | `lib/account-data.ts` `uploadAvatar`/`removeAvatar`. |
| Media descriptors (assistant output retention) | Supabase PostgreSQL + Supabase Storage | `public.media_retention_queue` + `assistant-descriptors` bucket | `lib/media-retention.ts` only enqueues rows with an already-uploaded descriptor path; descriptor generation and the 30-minute cleanup worker are BACKEND IMPLEMENTATION UNKNOWN. |
| Theme (light/dark) | localStorage + React context/provider state | `frontend/src/hooks/use-theme.tsx` `ThemeProvider`, consumed via `ThemeToggle.tsx` | Not stored in Supabase. |
| Academic year selection | localStorage + React context/provider state | `lib/store/academic-year.tsx` `AcademicYearProvider`, `localStorage "asa.year.v1"` | Static calendar data source is `lib/mock/academic.ts`. |
| `responseLanguageHint` | React component state (local, ephemeral, in-memory only) | `StudyChat.tsx` / `AssistantChat.tsx` (`responseLanguageHints` ref, `useRef<Map>`), computed by `lib/i18n/detect.ts` `effectiveResponseLanguage` | Never persisted to Supabase, never sent to the backend today (explicitly marked `FUTURE BACKEND / CODEX` in both components). |
| Google provider (OAuth) token | Provider/OAuth token in sessionStorage (browser tab/session only) | `lib/google-calendar.ts` (`sessionStorage "alim.google-calendar.provider-token"`) | Captured from `session.provider_token` after `linkIdentity`; never written to Supabase, localStorage, or telemetry; cleared on sign-out and on 401/403 from the Calendar API. |

## Local backend state / model-context state

Two data points fall under "local backend state" / "model-context state" rather than any frontend-owned layer:

- The local Python context backend's retrieval/model context per chat turn (`thread_id`, `user_message_id`, retrieval collections, `used_model`) — produced and held entirely server-side (`lib/context-backend.server.ts` request/response only relays it); the frontend never stores this beyond rendering the returned `sources`/`examTip`/`usedModel` for one turn.
- The local Qwen model runtime state (port 8000) — entirely backend-owned; the frontend only stores the *selected* model name (`selected_qwen_model`) as a Supabase-backed preference, not the runtime itself.


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
