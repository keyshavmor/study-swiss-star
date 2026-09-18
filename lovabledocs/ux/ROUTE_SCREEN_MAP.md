Document status: CURRENT
Generated from: frontend authority main at f0910e6971f12efe0ad547b904f6e2a518b13856 · live Supabase evidence dated 2026-09-18
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: f0910e6971f12efe0ad547b904f6e2a518b13856

# Route → Screen Map

Superseded document: the older top-level `docs/archive/ROUTE_SCREEN_MAP.md` is superseded by this file;
treat this file (`docs/ux/ROUTE_SCREEN_MAP.md`) as the current source of truth for route/screen
mapping. See `docs/ux/USER_JOURNEYS.md` for step-by-step user flows through the same routes.

Status labels used below: **CURRENT — FRONTEND**, **CURRENT — SUPABASE**,
**CURRENT — EXTERNAL INTEGRATION**, **EXPECTED LOCAL BACKEND CONTRACT**,
**BACKEND GAP**, **FUTURE CODEX IMPLEMENTATION**, **DEPRECATED**.

All authenticated routes are nested under `frontend/src/routes/_authenticated/route.tsx`, which
gates on `supabase.auth.getUser()` (`ssr: false`, `beforeLoad` redirects to `/` when signed out —
CURRENT — SUPABASE). All routes inherit the provider stack mounted once in
`frontend/src/routes/__root.tsx`: `QueryClientProvider` → `I18nProvider` → `ThemeProvider` →
`AppDataProvider` → `AcademicYearProvider`, plus global telemetry (`installGlobalErrorTelemetry`,
`page_viewed` tracking) and a `supabase.auth.onAuthStateChange` listener that invalidates the
router/query cache. These four providers are common to every authenticated route below and are
only repeated in the "State providers used" column when a route also uses something additional.

| Route path | Route file | Screen purpose | Main components | State providers used | Supabase resources | Backend involvement | Localisation message areas | Notes |
|---|---|---|---|---|---|---|---|---|
| `/` | `frontend/src/routes/index.tsx` | Public welcome + sign-in/sign-up entry point | `frontend/src/components/AuthForm.tsx`, `frontend/src/components/app/LiveClock.tsx`, `frontend/src/components/ThemeToggle.tsx` | `I18nProvider`, `ThemeProvider` (root only; `beforeLoad` redirects signed-in users before `AppDataProvider`/`AcademicYearProvider` content is needed) | `supabase.auth.getUser()` (beforeLoad); `supabase.auth.signInWithPassword`, `signUp`, `signInWithOAuth`, Edge Functions `username-login`, `username-availability` (all in `AuthForm.tsx`) — CURRENT — SUPABASE | None | `frontend/src/lib/i18n/messages/auth.ts` | Redirects signed-in users to `/home`. |
| `/auth` | `frontend/src/routes/auth.tsx` | Legacy alias, no UI | none (redirect-only route) | none | `supabase.auth.getUser()` — CURRENT — SUPABASE | None | none (no render) | Always redirects to `/` or `/home`; kept so old links keep working. |
| `/auth/update-password` | `frontend/src/routes/auth.update-password.tsx` | Set a new password after a reset-password link | `frontend/src/components/ThemeToggle.tsx`, shadcn `Button`/`Input`/`Label` | `I18nProvider`, `ThemeProvider` (root only) | `supabase.auth.updateUser({ password })` — CURRENT — SUPABASE | None | `frontend/src/lib/i18n/messages/auth.ts` | Navigates to `/home` on success. |
| `/_authenticated` (layout) | `frontend/src/routes/_authenticated/route.tsx` | Auth gate for every screen below; renders `<Outlet />` only | none | none beyond root stack | `supabase.auth.getUser()` (beforeLoad) — CURRENT — SUPABASE | None | none | `ssr: false`; redirects to `/` when signed out. |
| `/home` | `frontend/src/routes/_authenticated/home.tsx` | Daily dashboard: greeting, School/Planner cards, today's stats, school links | `frontend/src/components/app/AppShell.tsx`, `frontend/src/components/app/AcademicYearSelector.tsx`, `frontend/src/components/app/SchoolLinksSection.tsx` | root stack + `useAppData()` (AppDataProvider), `useAcademicYear()` | None directly; underlying data is `AppDataProvider` client-side prototype state (`frontend/src/lib/store/app-data.ts`), not a live query | None | `frontend/src/lib/i18n/messages/home.ts` | Stats computed client-side from `frontend/src/lib/grade-math.ts` and `frontend/src/lib/date-utils.ts`. |
| `/school` | `frontend/src/routes/_authenticated/school.index.tsx` | All subjects: grid, year average, rounding info, failing-subjects banner | `frontend/src/components/app/SubjectCard.tsx` (`SubjectGrid`), `frontend/src/components/app/StatsOverviewPanel.tsx`, `frontend/src/components/app/AssessmentDialog.tsx`, `frontend/src/components/app/TranscriptImportDialog.tsx`, `frontend/src/components/app/Badges.tsx`, `frontend/src/components/app/GradeDisplay.tsx`, `frontend/src/components/app/States.tsx` | root stack + `useAppData()`, `useAcademicYear()`, local `useState`/`useMemo` for sort/filter | None directly; grade math runs over `useAppData()` assessments | Transcript OCR/parsing is BACKEND GAP — `TranscriptImportDialog` collects data client-side only | `frontend/src/lib/i18n/messages/school.ts`, `frontend/src/lib/i18n/messages/grades.ts` | Sort/filter state is local, not persisted. |
| `/school/$subject` | `frontend/src/routes/_authenticated/school.$subject.tsx` | Subject dashboard with 7 mode tabs (Chat, Knowledge Analysis, Quiz Mode, Exam Mode, Study Plan, Statistics, Subject Tools) | `frontend/src/components/app/AssessmentActions.tsx`, `frontend/src/components/app/AssessmentDialog.tsx`, `frontend/src/components/app/GradeDisplay.tsx` (`AverageWithRounded`, `GradeLineChart`), `frontend/src/components/app/MaterialsPanel.tsx`, `frontend/src/components/app/States.tsx` (`EmptyState`) | root stack + `useAppData()`, local `mode` state (`useState`) | None | Quiz/Exam/Study-Plan tabs are FUTURE CODEX IMPLEMENTATION — no endpoint exists; they render inert `EmptyState` placeholders. Chat tab links out to `/chat`, it does not embed the tutoring chat | `frontend/src/lib/i18n/messages/subject.ts`, `frontend/src/lib/i18n/messages/grades.ts`, `frontend/src/lib/i18n/messages/materials.ts` | Route `loader` calls `getSchoolSubject(params.subject)` from `frontend/src/lib/mock/subjects.ts`; `notFoundComponent: SubjectNotFound` on unknown slug. |
| `/planner` | `frontend/src/routes/_authenticated/planner.tsx` | Calendar/timetable: exams, study sessions, activities, Google Calendar overlay | `frontend/src/components/app/Timetable.tsx`, `frontend/src/components/app/EventDialog.tsx`, `frontend/src/components/app/EventDetailDialog.tsx`, `frontend/src/components/app/GoogleCalendarCard.tsx`, `frontend/src/components/app/AcademicYearSelector.tsx` | root stack + `useAppData()`, `useAcademicYear()`, local calendar navigation state | None directly for events; Google Calendar overlay via `frontend/src/lib/google-calendar.ts` uses `supabase.auth.linkIdentity({ provider: "google", scopes: "calendar.readonly" })` — CURRENT — SUPABASE / CURRENT — EXTERNAL INTEGRATION | None | `frontend/src/lib/i18n/messages/planner.ts`, `frontend/src/lib/i18n/messages/events.ts`, `frontend/src/lib/i18n/messages/calendar.ts` | Google token held in `sessionStorage` only (`clearGoogleAccess`), never sent to any backend. |
| `/stats` | `frontend/src/routes/_authenticated/stats.tsx` | Cross-subject statistics overview | `frontend/src/components/app/StatsOverviewPanel.tsx`, `frontend/src/components/app/AcademicYearSelector.tsx`, `frontend/src/components/app/GradeDisplay.tsx` | root stack + `useAppData()`, `useAcademicYear()` | None directly; client-side grade math | None | `frontend/src/lib/i18n/messages/stats.ts`, `frontend/src/lib/i18n/messages/grades.ts` | Reuses `AssessmentDialog`/`AssessmentActions` from School. |
| `/help` | `frontend/src/routes/_authenticated/help.tsx` | Static help/FAQ + supported-languages reference | `frontend/src/components/app/AppShell.tsx`, `frontend/src/components/app/Breadcrumbs.tsx` (`PageNav`) | root stack only | None | None | `frontend/src/lib/i18n/messages/help.ts` | Lists the 7 supported languages from `frontend/src/lib/i18n/languages.ts`; no "Contact support" CTA (DEPRECATED). |
| `/feedback` | `frontend/src/routes/_authenticated/feedback.tsx` | User feedback form (category + message) | `frontend/src/components/app/AppShell.tsx`, shadcn `Select`/`Textarea`/`Button`/`Label` | root stack only, local form `useState` | Edge Function `feedback-submit` (`supabase.functions.invoke`, line 64) — CURRENT — SUPABASE; writes a `feedback` row + `feedback-messages` storage object per FACTS | None | `frontend/src/lib/i18n/messages/feedback.ts` | Telemetry via `frontend/src/lib/telemetry.ts` (`track`/`trackFailure`). |
| `/profile` | `frontend/src/routes/_authenticated/profile.tsx` | Account profile: avatar, name fields, year summary | `frontend/src/components/app/EditProfileDialog.tsx`, `frontend/src/components/app/AcademicYearSelector.tsx`, `frontend/src/components/app/AppShell.tsx` | root stack + `useAppData()`, `useAcademicYear()` | `supabase.auth.getUser()`; `frontend/src/lib/account-data.ts` (`fetchAccountProfile`, `avatarSignedUrl`) reads `public.profiles` and signs `profile-avatars` bucket URLs — CURRENT — SUPABASE | None | `frontend/src/lib/i18n/messages/profile.ts` | Avatar bucket `profile-avatars`, max 2 MiB (`AVATAR_MAX_BYTES`) per FACTS. |
| `/settings` | `frontend/src/routes/_authenticated/settings.tsx` | Preferences: language, model, assistant reply-language policy, audio, notifications, storage | `frontend/src/components/app/SettingsSections.tsx`, `frontend/src/components/app/AppShell.tsx` | root stack only; preferences read/written through `frontend/src/lib/account-data.ts` (`UserPreferences`) | `public.user_preferences` (per-user `preferences` jsonb) — CURRENT — SUPABASE (declared); RPC `get_storage_usage_status()` for the storage panel; `storage-emergency-cleanup` Edge Function (`frontend/src/lib/storage-management.ts:199`) — CURRENT — SUPABASE | None | `frontend/src/lib/i18n/messages/settings.ts`, `frontend/src/lib/i18n/messages/notifications.ts` | `app_language` here is the authoritative source (`public.user_preferences.preferences.app_language`); `localStorage` key `alim.app_language` is a signed-out/flash-avoidance cache only. |
| `/chat` | `frontend/src/routes/_authenticated/chat.index.tsx` | Tutoring Study Chat: thread list / create-then-redirect | none rendered directly (redirects) | root stack + `useQuery`/server functions | `frontend/src/lib/chat.functions.ts` (`listThreads`, `createThread`) reading/writing `public.threads` — CURRENT — SUPABASE | None at this route (redirect only) | `frontend/src/lib/i18n/messages/chat.ts` | Uses `useServerFn` (`@tanstack/react-start`) to call the thread-listing server functions, then navigates into `/chat/$threadId`. |
| `/chat/$threadId` | `frontend/src/routes/_authenticated/chat.$threadId.tsx` | Tutoring Study Chat conversation screen | `frontend/src/components/StudyChat.tsx` | root stack + AI SDK chat state inside `StudyChat.tsx` | `public.threads`/`public.messages` (ownership check, message inserts) — CURRENT — SUPABASE | POST `/api/chat` (`frontend/src/routes/api/chat.ts`) → bearer-authenticated loopback Python context backend — CURRENT — LOCAL BACKEND; moderation endpoint remains a fail-closed gap | `frontend/src/lib/i18n/messages/chat.ts` | Speech playback via `frontend/src/lib/speech.ts` (browser `speechSynthesis`, ephemeral, ties into `assistant_audio_enabled`/`assistant_audio_autoplay` preferences). |
| `/assistant` | `frontend/src/routes/_authenticated/assistant.index.tsx` | General Assistant, new/most-recent thread view | `frontend/src/components/app/AppShell.tsx`, `frontend/src/components/app/Breadcrumbs.tsx`, `frontend/src/components/assistant/AssistantChat.tsx` | root stack only | `public.assistant_threads`/`public.assistant_messages`/`public.assistant_attachments` via `frontend/src/lib/assistant-data.ts` — CURRENT — SUPABASE | Assistant message generation and attachment parsing are BACKEND GAP — the frontend never fabricates assistant rows itself, per FACTS | `frontend/src/lib/i18n/messages/assistant.ts` | Distinct from the tutoring Study Chat (`/chat`); separate tables and a separate component tree. |
| `/assistant/$threadId` | `frontend/src/routes/_authenticated/assistant.$threadId.tsx` | General Assistant, specific thread | `frontend/src/components/app/AppShell.tsx`, `frontend/src/components/app/Breadcrumbs.tsx`, `frontend/src/components/assistant/AssistantChat.tsx` | root stack only; `useParams()` for `threadId` | Same as `/assistant` — CURRENT — SUPABASE | Same as `/assistant` — BACKEND GAP | `frontend/src/lib/i18n/messages/assistant.ts` | Attachments go through `CHAT_ATTACHMENT_BUCKET`/media-retention flow described in `frontend/src/lib/media-retention.ts` and `frontend/src/lib/storage-management.ts`. |
| `/api/chat` (server route, no screen) | `frontend/src/routes/api/chat.ts` | POST endpoint backing the tutoring Study Chat screen | none (server-only `createFileRoute` with `server.handlers.POST`) | none (server route; no React providers) | Verifies bearer token via `supabase.auth.getClaims`; reads/writes `public.threads`/`public.messages` — CURRENT — SUPABASE | Calls `requestContextAnswer` (`frontend/src/lib/context-backend.server.ts`) → loopback FastAPI at `ALIM_CONTEXT_BACKEND_URL` (default `http://127.0.0.1:8001`) with the exact bearer and subject cross-check — CURRENT — LOCAL BACKEND; no Lovable runtime fallback exists | none (no UI strings) | Streams an AI-SDK UI message stream (`text-start`/`text-delta`/`text-end` + `data-context-metadata` part); consumed exclusively by `/chat/$threadId`. |
| `__root.tsx` (not a screen) | `frontend/src/routes/__root.tsx` | Global provider shell, 404/error boundaries, `<html>` document shell | `frontend/src/components/ui/sonner.tsx` (`Toaster`) | Mounts `QueryClientProvider` → `I18nProvider` → `ThemeProvider` → `AppDataProvider` → `AcademicYearProvider` for every route | `supabase.auth.onAuthStateChange` listener — CURRENT — SUPABASE | None | `frontend/src/lib/i18n/messages/common.ts`, `frontend/src/lib/i18n/messages/misc.ts` | Also wires `installGlobalErrorTelemetry()` and `frontend/src/lib/lovable-error-reporting.ts`; `notFoundComponent`/`errorComponent` render `common.notFound.*`/`common.error.*` copy. |

## Notes

- Every authenticated screen also shares `frontend/src/components/app/AppShell.tsx` (header, nav,
  academic-year context surface) unless noted otherwise; it is omitted from the "Main components"
  cell above only where the route renders no visible chrome (e.g. `/chat` redirect, `/api/chat`).
- "Localisation message areas" lists the primary `frontend/src/lib/i18n/messages/*.ts` module(s)
  a screen draws its strings from; most screens also pull a few keys from
  `frontend/src/lib/i18n/messages/common.ts` and `frontend/src/lib/i18n/messages/nav.ts` (shared
  nav/breadcrumb copy), which are not repeated per row.
- Superseded document: the older top-level `docs/archive/ROUTE_SCREEN_MAP.md` predates the routes/props
  documented here (e.g. it does not reflect the current `_authenticated` layout, `/assistant`
  routes, or `/api/chat` contract) and must not be treated as current; this file supersedes it.


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
