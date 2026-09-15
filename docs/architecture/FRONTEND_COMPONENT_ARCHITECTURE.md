```
Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466
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
