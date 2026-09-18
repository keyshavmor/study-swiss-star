```
Document status: CURRENT
Generated from: frontend authority main at f0910e6971f12efe0ad547b904f6e2a518b13856 · live Supabase evidence dated 2026-09-18
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: f0910e6971f12efe0ad547b904f6e2a518b13856
```

# Frontend Component Architecture (C4 Level 3) — Alim / Gymi Genius

Scope: for each route file, the screen components it renders and the `lib/` services those components
call, down to the Supabase client or the `/api/chat` server route. Real paths only.

## `frontend/src/routes/__root.tsx`
Providers: `QueryClientProvider` → `I18nProvider` → `ThemeProvider` → `AppDataProvider` →
`AcademicYearProvider`. Installs `installGlobalErrorTelemetry` (`lib/telemetry.ts`) and subscribes to
`supabase.auth.onAuthStateChange` (`integrations/supabase/client.ts`).

## `frontend/src/routes/index.tsx` (`/`) and `auth.tsx` / `auth.update-password.tsx`
- Component: `components/AuthForm.tsx`
- Services: `integrations/supabase/client.ts` → `supabase.auth.signInWithPassword` / `signUp` /
  `signInWithOAuth` (github, linkedin_oidc, spotify) / `linkIdentity` (google, `calendar.readonly`);
  Edge Functions `username-login`, `username-availability` (also via the Supabase client, invoked as
  functions).

## `frontend/src/routes/_authenticated/route.tsx`
- Gate component (ssr:false) redirecting unauthenticated sessions to `/auth`.
- Service: `integrations/supabase/client.ts` (`supabase.auth.getSession`/claims check).

## `frontend/src/routes/_authenticated/home.tsx`
- Components: `components/app/AppShell.tsx`, `AppHeader.tsx`, `Breadcrumbs.tsx`, `SubjectCard.tsx`,
  `LiveClock.tsx`, `NotificationCenter.tsx`, `Badges.tsx`.
- Services: `lib/store/app-data.tsx` (`AppDataProvider` context), `lib/account-data.ts`,
  `lib/store/academic-year.tsx` → Supabase `profiles`, `user_preferences` tables via
  `integrations/supabase/client.ts`.

## `frontend/src/routes/_authenticated/school.index.tsx` and `school.$subject.tsx`
- Components: `components/app/SubjectCard.tsx`, `MaterialsPanel.tsx`, `GradeDisplay.tsx`,
  `AssessmentDialog.tsx`, `AssessmentActions.tsx`, `TranscriptImportDialog.tsx`,
  `SourceSnippetList.tsx`.
- Services: `lib/grade-math.ts`, `lib/storage-management.ts` (bucket `user-materials`),
  `lib/mock/{subjects,grades,materials,academic}.ts` (fixtures), `lib/store/app-data.tsx` →
  Supabase `documents` / `document_chunks` tables and `user-materials` storage bucket via
  `integrations/supabase/client.ts`.

## `frontend/src/routes/_authenticated/planner.tsx`
- Components: `components/app/EventDialog.tsx`, `EventDetailDialog.tsx`, `Timetable.tsx`,
  `GoogleCalendarCard.tsx`, `AcademicYearSelector.tsx`.
- Services: `lib/google-calendar.ts` → Google Calendar API v3 (read-only); `lib/store/academic-year.tsx`;
  `lib/date-utils.ts`; `lib/notifications.ts` → Supabase `user_preferences` (`exam_reminders`,
  `daily_study_summary`).

## `frontend/src/routes/_authenticated/{chat.index,chat.$threadId}.tsx` (tutoring)
- Components: `components/StudyChat.tsx`, `components/ThreadList.tsx`,
  `components/ai-elements/{conversation,message,prompt-input,shimmer}.tsx`.
- Services: `lib/chat.functions.ts`, `lib/speech.ts` (TTS) → Supabase `threads`/`messages` tables directly
  via `integrations/supabase/client.ts`, and outbound to `frontend/src/routes/api/chat.ts` (the frontend
  API client boundary) for AI responses.

## `frontend/src/routes/_authenticated/{assistant.index,assistant.$threadId}.tsx` (general Assistant)
- Components: `components/assistant/AssistantChat.tsx`, `components/ThreadList.tsx`,
  `components/ai-elements/*`.
- Services: `lib/assistant-data.ts` → Supabase `assistant_threads`/`assistant_messages`/
  `assistant_attachments` tables and `chat-attachments` storage bucket; `lib/media-retention.ts` for the
  30-minute retention queue (`media_retention_queue`); `lib/speech.ts`.

## `frontend/src/routes/_authenticated/stats.tsx`
- Components: `components/app/StatsOverviewPanel.tsx`, `GradeDisplay.tsx`.
- Services: `lib/grade-math.ts`, `lib/telemetry.ts` (reads `usage_events` indirectly via Edge Function
  `activity-log`), `lib/store/app-data.tsx`.

## `frontend/src/routes/_authenticated/help.tsx`
- Static/i18n content via `lib/i18n/*`. No backend calls beyond auth session.

## `frontend/src/routes/_authenticated/feedback.tsx`
- Service: Edge Function `feedback-submit` (`lib/telemetry.ts`-adjacent call site at
  `routes/_authenticated/feedback.tsx:64`) → `feedback` table row + `feedback-messages` storage object.

## `frontend/src/routes/_authenticated/profile.tsx`
- Components: `components/app/EditProfileDialog.tsx`.
- Services: `lib/account-data.ts` → Supabase `profiles` table, `profile-avatars` storage bucket
  (`AVATAR_BUCKET`, 2 MiB max).

## `frontend/src/routes/_authenticated/settings.tsx`
- Components: `components/app/SettingsSections.tsx`, `LanguageMenu.tsx`, `ThemeToggle.tsx`,
  `SchoolLinksSection.tsx`, `SchoolLinkDialog.tsx`.
- Services: `lib/account-data.ts` → `user_preferences.preferences` jsonb (language, Qwen model, reply
  language policy, audio/notification toggles), `lib/storage-management.ts` (RPC
  `get_storage_usage_status`, Edge Function `storage-emergency-cleanup`).

## `frontend/src/routes/api/chat.ts`
- Not a screen: the TanStack server route acting as the frontend's sole outbound client toward the local
  backend. See `docs/architecture/CONTAINER_ARCHITECTURE.md` and `docs/contracts/FRONTEND_BACKEND_CONTRACT.md`.

## Diagram

See `FRONTEND_COMPONENT_ARCHITECTURE.mmd`.


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
