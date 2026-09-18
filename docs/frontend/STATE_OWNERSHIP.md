Document status: CURRENT
Generated from: frontend authority main at f0910e6971f12efe0ad547b904f6e2a518b13856 · live Supabase evidence dated 2026-09-18
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: f0910e6971f12efe0ad547b904f6e2a518b13856

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
| Messages (assistant) | Supabase PostgreSQL | `public.assistant_messages` | Written directly from the browser via `lib/assistant-data.ts` (`sendAssistantMessage`); assistant-role rows are never fabricated by the frontend (BACKEND GAP for assistant replies). |
| Document metadata | Supabase PostgreSQL + Supabase Storage | `public.documents`/`public.document_chunks` (loose columns, backend-owned) + storage-management.ts defensive read (`lib/storage-management.ts`) | Column names vary per deployment; frontend never assumes a fixed shape beyond a handful of best-effort field names. |
| Grades / assessments | React context/provider state, persisted to localStorage | `lib/store/app-data.tsx` `AppDataProvider` (`DataState.assessments`), `localStorage "asa.data.v2"` | No Supabase table; entirely prototype/local. |
| Feedback | Supabase PostgreSQL + Supabase Storage | `public.feedback` + `feedback-messages` bucket, via the `feedback-submit` Edge Function | Submitted from `frontend/src/routes/_authenticated/feedback.tsx`; local component state (`message`, `category`, `sending`) is ephemeral. |
| Telemetry (usage events) | Supabase PostgreSQL + Supabase Storage | `public.usage_events` + `activity-logs` bucket, via the `activity-log` Edge Function (`lib/telemetry.ts`) | Best-effort, fire-and-forget from the browser; payloads scrubbed of content/PII. |
| Uploaded files (assistant attachments) | Supabase Storage + Supabase PostgreSQL (metadata) | `chat-attachments` bucket + `public.assistant_attachments` | `lib/assistant-data.ts`; path convention `<uid>/...`. |
| Uploaded files (avatar) | Supabase Storage + Supabase PostgreSQL (path reference) | `profile-avatars` bucket + `public.profiles.photo` | `lib/account-data.ts` `uploadAvatar`/`removeAvatar`. |
| Media descriptors (assistant output retention) | Supabase PostgreSQL + Supabase Storage | `public.media_retention_queue` + `assistant-descriptors` bucket | `lib/media-retention.ts` only enqueues rows with an already-uploaded descriptor path; descriptor generation and the 30-minute cleanup worker are BACKEND GAP. |
| Theme (light/dark) | localStorage + React context/provider state | `frontend/src/hooks/use-theme.tsx` `ThemeProvider`, consumed via `ThemeToggle.tsx` | Not stored in Supabase. |
| Academic year selection | localStorage + React context/provider state | `lib/store/academic-year.tsx` `AcademicYearProvider`, `localStorage "asa.year.v1"` | Static calendar data source is `lib/mock/academic.ts`. |
| `responseLanguageHint` | React component state (local, ephemeral, in-memory only) | `StudyChat.tsx` / `AssistantChat.tsx` (`responseLanguageHints` ref, `useRef<Map>`), computed by `lib/i18n/detect.ts` `effectiveResponseLanguage` | Never persisted to Supabase, never sent to the backend today (explicitly marked `FUTURE BACKEND / CODEX` in both components). |
| Google provider (OAuth) token | Provider/OAuth token in sessionStorage (browser tab/session only) | `lib/google-calendar.ts` (`sessionStorage "alim.google-calendar.provider-token"`) | Captured from `session.provider_token` after `linkIdentity`; never written to Supabase, localStorage, or telemetry; cleared on sign-out and on 401/403 from the Calendar API. |

## Local backend state / model-context state

Two data points fall under "local backend state" / "model-context state" rather than any frontend-owned layer:

- The local Python context backend's retrieval/model context per chat turn (`thread_id`, `user_message_id`, retrieval collections, `used_model`) — produced and held entirely server-side (`lib/context-backend.server.ts` request/response only relays it); the frontend never stores this beyond rendering the returned `sources`/`examTip`/`usedModel` for one turn.
- The local Qwen model runtime state (port 8000) — entirely backend-owned; the frontend only stores the *selected* model name (`selected_qwen_model`) as a Supabase-backed preference, not the runtime itself.


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
  (FUTURE CODEX IMPLEMENTATION). Unreachable / 404 / timeout / unparsable ⇒
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
