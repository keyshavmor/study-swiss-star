Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
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
