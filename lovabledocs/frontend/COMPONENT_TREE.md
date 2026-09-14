Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

> Supersedes: `docs/COMPONENT_TREE.md` (top-level, if present). Archived centrally.

# Component tree — frontend → backend requirement map

Each entry below answers "which frontend component creates this backend requirement?" by listing every Supabase table/bucket/RPC/Edge-Function and every local-backend call the component triggers, directly or through a `lib/*` module it calls. See `docs/frontend/COMPONENT_TREE.mmd` for the render-graph diagram.

Conventions: "Backend calls" = the local Python context backend (`ALIM_CONTEXT_BACKEND_URL`) reached only via `/api/chat`. "—" means none.

## Root & shell

### `frontend/src/routes/__root.tsx` (RootComponent, NotFoundComponent, ErrorComponent)
- Route(s): every route (document shell).
- Parent: none (root).
- Children: `<Outlet/>` → active route component; `<Toaster/>` (sonner).
- Props: none (route component).
- State owned: none directly (delegates to providers).
- State consumed: `queryClient` (route context), `useRouterState().location.pathname`.
- Hooks/providers: mounts `QueryClientProvider` → `I18nProvider` → `ThemeProvider` → `AppDataProvider` → `AcademicYearProvider`; `useI18n()` inside `NotFoundComponent`/`ErrorComponent`.
- Supabase calls: `supabase.auth.onAuthStateChange` (session transitions only).
- Backend calls: —.
- Side effects: `installGlobalErrorTelemetry()`; `track({event_name:"page_viewed"})` per route change; `router.invalidate()` + `queryClient.invalidateQueries()` on auth events; `reportLovableError` on error-boundary catch.
- Persistence: none directly.
- Error behaviour: `ErrorComponent` shows localized generic error + retry/home; `NotFoundComponent` shows localized 404.
- Localisation: `useI18n()` for all copy.
- Source: `frontend/src/routes/__root.tsx`.

### `frontend/src/components/app/AppShell.tsx` (`AppShell`, `AppFooter`, `PageHeading`)
- Route(s): every `_authenticated/*` screen (layout wrapper).
- Parent: each authenticated route component.
- Children: `AppHeader`, `MobileNavigation`, route body, `AppFooter`.
- Props: `children: ReactNode` (+ heading props on `PageHeading`).
- State owned: none.
- State consumed: `useI18n()` for footer copy.
- Hooks/providers: `useI18n`.
- Supabase/Backend calls: —.
- Persistence: none.
- Error behaviour: none own; relies on route-level error boundary.
- Localisation: `t()` for footer/heading copy.
- Source: `frontend/src/components/app/AppShell.tsx`.

### `frontend/src/components/app/AppHeader.tsx`
- Route(s): all authenticated screens (via `AppShell`).
- Parent: `AppShell`.
- Children: `NotificationCenter`, `LiveClock`, `ThemeToggle`, `LanguageMenu`, mobile `Sheet` menu (logo, tabs, sign-out).
- Props: none.
- State owned: `open` (mobile sheet), local menu open state.
- State consumed: `profile` from `useAppData()` (avatar/name display).
- Hooks/providers: `useAppData`, `useI18n`, `useNavigate`/`useRouter`/`useRouterState`.
- Supabase calls: none directly; `signOutCompletely()` (→ `supabase.auth.signOut`).
- Backend calls: —.
- Side effects: navigation to `/` on sign-out; `toast` on sign-out failure.
- Persistence: none directly (delegates to `sign-out.ts`, which clears the Google session token).
- Error behaviour: `toast.error` on sign-out failure (localized).
- Localisation: full `useI18n()`.
- Source: `frontend/src/components/app/AppHeader.tsx`.

### `frontend/src/components/app/MobileNavigation.tsx`
- Route(s): all authenticated screens, mobile viewport only.
- Parent: `AppShell` (rendered alongside `AppHeader`).
- Children: `Link` items (Home, School, Planner/CalendarDays, Assistant/Bot icons).
- Props: none.
- State consumed: `useRouterState()` for active-tab highlighting.
- Hooks: `useI18n`.
- Supabase/Backend calls: —.
- Persistence: none.
- Localisation: `t()` per tab label.
- Source: `frontend/src/components/app/MobileNavigation.tsx`.

### `frontend/src/components/app/Breadcrumbs.tsx` (`Breadcrumbs`, `BackLink`, `PageNav`)
- Route(s): every authenticated screen (via `PageNav` at top of each page body).
- Parent: individual route components.
- Children: `Link`s.
- Props: `items`/`back`/`crumbs`.
- State/hooks: `useI18n` only.
- Supabase/Backend calls: —.
- Source: `frontend/src/components/app/Breadcrumbs.tsx`.

### `frontend/src/components/app/LanguageMenu.tsx`
- Route(s): `AppHeader` (all authenticated screens) and the welcome screen.
- Parent: `AppHeader`.
- Children: dropdown list of `LANGUAGES`.
- Props: `className?`.
- State consumed/owned: `language`, `setLanguage` from `useI18n()` (delegates to `I18nProvider`).
- Supabase calls (indirect, via `I18nProvider.setLanguage`): upsert `public.user_preferences.preferences.app_language`.
- Persistence: `localStorage "alim.app_language"` (cache) + Supabase (authority) — both written by `I18nProvider`, triggered by this menu's `onSelect`.
- Localisation: itself is the language switcher.
- Source: `frontend/src/components/app/LanguageMenu.tsx`.

### `frontend/src/components/app/NotificationCenter.tsx`
- Route(s): `AppHeader` (all authenticated screens).
- Parent: `AppHeader`.
- Children: `EventDetailDialog` (on notification click), `Badge`, `Popover`.
- Props: none.
- State owned: `open`, `selected`.
- State consumed: `readNotifications`, `dismissedNotifications`, `events`, `assessments` from `useAppData()`; derives `buildNotifications()` (`lib/notifications.ts`) — pure client-side computation over planner/assessment data, no network call.
- Hooks: `useAppData`, `useI18n`.
- Supabase/Backend calls: — (notifications are computed client-side from local planner state).
- Persistence: `markNotificationRead`/`dismissNotification` write into `AppDataProvider`'s state, persisted to `localStorage "asa.data.v2"`.
- Error behaviour: `toast` for any dismiss failure path.
- Source: `frontend/src/components/app/NotificationCenter.tsx`.

### `frontend/src/components/ThemeToggle.tsx`
- Route(s): `AppHeader` (authenticated) and `StudyChat` sidebar.
- Parent: `AppHeader`, `StudyChat`.
- Props: `className?`.
- State consumed: `theme`, `toggleTheme` from `useTheme()` (`frontend/src/hooks/use-theme.tsx`, backs the `ThemeProvider`).
- Persistence: theme is persisted by `use-theme.tsx` (localStorage-backed; not Supabase).
- Localisation: aria-label/tooltip via `useI18n`.
- Source: `frontend/src/components/ThemeToggle.tsx`.

### `frontend/src/components/app/AcademicYearSelector.tsx` (+ `AcademicYearLabel`)
- Route(s): `planner.tsx`, `stats.tsx`, `school.*` (wherever academic year context matters).
- State consumed: `yearId`, `years`, `setYearId`, `step`, `yearLabel` from `useAcademicYear()`.
- Persistence: `localStorage "asa.year.v1"` via `AcademicYearProvider`.
- Supabase/Backend calls: —.
- Localisation: `t()` for arrows/labels; `formatDate`/`formatWeekday` not used here directly (see `format.ts` doc for callers).
- Source: `frontend/src/components/app/AcademicYearSelector.tsx`.

## Auth

### `frontend/src/components/AuthForm.tsx`
- Route(s): `/` (`index.tsx`), `/auth` (`auth.tsx`).
- Parent: welcome route component.
- Children: `BrandLogos` (GitHub/LinkedIn/Spotify), shadcn `Input`/`Button`/`Label`.
- Props: none.
- State owned: `mode` (signin/signup/reset), `identifier`, `signupEmail`, `username`, `password`, `resetEmail`, `isLoading`.
- Hooks: `useI18n`, `useNavigate`.
- Supabase calls:
  - `supabase.auth.signInWithPassword` (email sign-in)
  - `supabase.functions.invoke("username-login")` then `supabase.auth.setSession` (username sign-in)
  - `supabase.functions.invoke("username-availability")` (pre-signup check; a failed check is NOT treated as "taken")
  - `supabase.auth.signUp` (with `data: { username }`)
  - `supabase.auth.resetPasswordForEmail`
  - `supabase.auth.signInWithOAuth({provider: github|linkedin_oidc|spotify})`
- Backend calls: —.
- Side effects: `track()`/`trackFailure()` for every auth outcome (method-tagged, no credentials); `toast` success/error; `navigate({to:"/home"})` on success.
- Persistence: Supabase Auth session (cookie/localStorage managed by `@supabase/supabase-js`).
- Error behaviour: raw provider errors are logged and never shown; only `UiError`-wrapped or explicitly localized messages reach the user (`localizedMessage`, fallback `auth.authenticationFailed`).
- Localisation: fully localized (`useI18n`); this is also where `assistant_reply_language_policy`/`app_language` do NOT yet apply (pre-auth, uses cached/default language only).
- Source: `frontend/src/components/AuthForm.tsx`.

## Tutoring chat (`StudyChat` family)

### `frontend/src/components/StudyChat.tsx`
- Route(s): `chat.index.tsx`, `chat.$threadId.tsx`.
- Parent: those two route components.
- Children: `ThreadList`, `ThemeToggle`, `Conversation`/`ConversationContent`/`ConversationScrollButton` (`ai-elements/conversation.tsx`), `Message`/`MessageContent` (`ai-elements/message.tsx`), `PromptInput*` (`ai-elements/prompt-input.tsx`), `Shimmer`, `SourceSnippetList`, shadcn `Dialog` (new-session).
- Props: `threadId?` (falls back to router param).
- State owned: `newThreadOpen`, `newThreadTitle`, `newThreadSubject`, `preferences` (local mirror of `UserPreferences`), `speakingId`, plus refs for response-language hints.
- State consumed: `useAcademicYear()` (`yearId`, `year.gradeLevel` sent as chat body fields), `useI18n()` (`language`, `formatDate`).
- Hooks/providers: `useChat` (`@ai-sdk/react`) with `DefaultChatTransport` pointed at `/api/chat`; `useQuery` (threads, messages) via TanStack Query + `useServerFn`.
- Supabase calls: `listThreads`/`listMessages`/`createThread`/`deleteThread` server functions (`lib/chat.functions.ts`, tables `threads`/`messages`); `supabase.auth.getSession()` to attach the bearer token to every `/api/chat` fetch; `supabase.auth.signOut()` on sign-out button.
- Backend calls: every chat send goes through `/api/chat` → `requestContextAnswer` → local Python context backend (see `FRONTEND_ARCHITECTURE.md`).
- Side effects: `track`/`trackFailure` for message lifecycle (`chat_message_completed`, `chat_message_failed`) — status only, never prompt/response text; `speak()`/`stopSpeaking()` (Web Speech API) for autoplay/manual "Listen"/"Stop" controls, gated by `preferences.assistant_audio_enabled`/`assistant_audio_autoplay`; navigates to the first thread when none is selected.
- Persistence: thread/message rows in Supabase (`threads`, `messages`); `responseLanguageHints` map is in-memory only (never persisted, never sent to backend).
- Error behaviour: `onError` in `useChat` → `toast.error(t("chat.sendFailed"))` + `trackFailure`; thread create/delete failures show `toast.error` with dedicated keys.
- Localisation: fully localized; assistant reply text itself is rendered as-is (backend-controlled language).
- Source: `frontend/src/components/StudyChat.tsx`.

### `frontend/src/components/ThreadList.tsx`
- Route(s): inside `StudyChat` only.
- Parent: `StudyChat`.
- Props: `threads`, `activeThreadId?`, `onDelete`, `isLoading`.
- State owned: none (fully controlled).
- Supabase calls: none directly (delete is delegated to parent's `handleDeleteThread`).
- Localisation: `useI18n` for empty-state and aria labels.
- Source: `frontend/src/components/ThreadList.tsx`.

### `frontend/src/components/app/SourceSnippetList.tsx`
- Route(s): inside `StudyChat` assistant messages.
- Parent: `StudyChat`.
- Props: `sources: ContextSourceSnippet[]` (from `data-context-metadata` stream part).
- Supabase/Backend calls: none itself — purely renders backend-supplied `ContextChatResponse.sources`.
- Source: `frontend/src/components/app/SourceSnippetList.tsx`.

### `frontend/src/components/ai-elements/{conversation,message,prompt-input,shimmer}.tsx`
- Route(s): `StudyChat` (chat screens).
- Purpose: presentational/layout primitives (scroll container, message bubble shell, composer textarea + submit button, loading shimmer). No Supabase/backend calls; no owned business state beyond `PromptInput`'s controlled textarea value forwarded from `StudyChat`.
- Source: `frontend/src/components/ai-elements/*.tsx`.

## General assistant (`AssistantChat`)

### `frontend/src/components/assistant/AssistantChat.tsx`
- Route(s): `assistant.index.tsx`, `assistant.$threadId.tsx`.
- Parent: those route components.
- Children: attachment chips, thread list `<ul>`, message list, composer (`Textarea`, hidden file `<input>`, send `Button`).
- Props: `threadId?`.
- State owned: `threads`, `messages`, `loadingThreads`, `loadingMessages`, `text`, `files`, `sending`, `renamingId`, `renameValue`, `preferences`, `speakingId`, plus refs (`responseLanguageHints`, `historyIdsRef` for autoplay suppression on load).
- State consumed: `useI18n()` (`language`, `formatDate`).
- Supabase calls (via `lib/assistant-data.ts`): `assistant_threads` CRUD, `assistant_messages`/`assistant_attachments` read, attachment upload to `chat-attachments` bucket, soft-delete (`deleted_at`) on thread deletion including Storage object removal.
- Backend calls: **none** — assistant replies are never generated by the frontend; this component only stores/shows the user's message and attachments (see file header comment: "the local AI backend endpoint is not connected yet"). A pending-notice string (`assistant.pendingNotice`) is shown after the last user message.
- Side effects: `track`/`trackFailure` for thread create/delete/message-send (`assistant_thread_created`, `assistant_message_send_started`, `assistant_message_saved`, counts only); `speak()`/`stopSpeaking()` for audio playback of existing assistant messages, gated by `assistant_audio_enabled`.
- Persistence: `assistant_threads`/`assistant_messages`/`assistant_attachments` tables; attachments in `chat-attachments` bucket (private, `<uid>/...` path convention).
- Error behaviour: every Supabase call wrapped in `try/catch` → `toast.error` with a dedicated localized key (`assistant.loadThreadsFailed`, `assistant.sendFailed`, `assistant.deleteFailed`, etc.).
- Localisation: `effectiveResponseLanguage(content, language)` computes a `responseLanguageHint` per outgoing message — **frontend-only today**, not sent to any backend (marked `FUTURE BACKEND / CODEX` in source).
- Source: `frontend/src/components/assistant/AssistantChat.tsx`.

## `frontend/src/components/app/*` — School / Planner / Profile / Settings / Stats

### `SubjectCard.tsx` (+ `SubjectGrid`)
- Route(s): `school.index.tsx`.
- Children: `AssessmentActions`, `AssessmentDialog`, `FailingBadge` (`Badges.tsx`), `AverageWithRounded` (`GradeDisplay.tsx`), `TranscriptImportDialog`.
- State consumed: `assessments`, `materials`, `events` from `useAppData()`; static `Subject` data from `lib/mock/subjects.ts`.
- State owned: `open` (expand/collapse).
- Supabase/Backend calls: none directly — grades/assessments are `AppDataProvider`-owned local state only (no Supabase table for assessments today; see `STATE_OWNERSHIP.md`).
- Localisation: `useI18n`, `GRADE_SOURCE_LABEL_KEY`/`ASSESSMENT_TYPE_LABEL_KEY`/`TREND_LABEL_KEY`.
- Source: `frontend/src/components/app/SubjectCard.tsx`.

### `AssessmentDialog.tsx` / `AssessmentActions.tsx`
- Route(s): `school.index.tsx`, `school.$subject.tsx`.
- State consumed/owned: reads/writes `assessments` via `useAppData()` (`addAssessment`, `updateAssessment`, `duplicateAssessment`, `removeAssessment`, `restoreAssessment` — undo-capable).
- Supabase/Backend calls: none — purely `AppDataProvider` (localStorage-backed).
- Localisation: `useI18n`; grade-type/source label maps from `lib/store/types.ts`.
- Source: `frontend/src/components/app/AssessmentDialog.tsx`, `AssessmentActions.tsx`.

### `EventDialog.tsx` / `EventDetailDialog.tsx`
- Route(s): `planner.tsx`.
- State consumed/owned: `useAppData()` (`addEvent`, `updateEvent`, `updateOccurrence`, `splitSeriesFrom`, `removeEvent`, `removeOccurrence`, `endSeriesBefore`, `restoreEvent`) — full planner CRUD including recurrence-series editing scope (`this occurrence` / `this and following` / `all`).
- Supabase/Backend calls: none — planner events are local-only state (`PlannerEvent[]` in `AppDataProvider`), **except** Google Calendar occurrences, which are read-only and never created/edited here (`readOnly: true`, enforced by `EventDialog`/`EventDetailDialog` refusing to open the edit form for `externalSource === "google"`).
- Side effects: `trackPlanner()` (inside `app-data.tsx`) on every create/update/delete — category + recurring flag only, never title/notes/location.
- Localisation: `useI18n` (`formatWeekday`, `formatWeekdayDate`), `EVENT_CATEGORY_LABEL_KEY`, `RECURRENCE_LABEL_KEY`, `REMINDER_LABEL_KEY`.
- Source: `frontend/src/components/app/EventDialog.tsx`, `EventDetailDialog.tsx`.

### `GoogleCalendarCard.tsx`
- Route(s): `planner.tsx`.
- State owned: `connected`, `busy`, `lastSync`, `status`.
- Supabase calls: `supabase.auth.linkIdentity({provider:"google", scopes: calendar.readonly})` (connect), `supabase.auth.onAuthStateChange` (detects the redirect-back session with a provider token), `supabase.auth.getSession()`.
- Backend calls: direct browser fetch to the Google Calendar REST API using the provider token from `sessionStorage` (`lib/google-calendar.ts`) — this is an EXTERNAL INTEGRATION, not the local Python backend.
- Persistence: Google provider token lives only in `sessionStorage` (`alim.google-calendar.provider-token`), cleared on sign-out or disconnect; never written to Supabase or localStorage.
- Side effects: `track`/`trackFailure` (`google_calendar_connect_started`, `google_calendar_sync_failed`, `google_calendar_disconnected`).
- Error behaviour: typed `GoogleCalendarAuthError`/`GoogleCalendarError` codes surfaced as localized toasts (manual-linking-disabled, provider-not-enabled, access-expired, etc.).
- Localisation: `useI18n` (`formatTime`).
- Source: `frontend/src/components/app/GoogleCalendarCard.tsx`, `frontend/src/lib/google-calendar.ts`.

### `MaterialsPanel.tsx`, `TranscriptImportDialog.tsx`
- Route(s): `school.$subject.tsx`.
- State consumed/owned: `materials` via `useAppData()` (`addMaterial`, `updateMaterial`, `removeMaterial`, `restoreMaterial`) — local-only metadata records (`Material` type); no file bytes are uploaded to Supabase Storage from these components (materials are prototype/mock-backed, distinct from the `documents`/`document_chunks` tables the local backend owns).
- Supabase/Backend calls: none directly.
- Source: `frontend/src/components/app/MaterialsPanel.tsx`, `TranscriptImportDialog.tsx`.

### `SchoolLinksSection.tsx`, `SchoolLinkDialog.tsx`
- Route(s): `school.index.tsx` / `school.$subject.tsx`.
- State consumed/owned: `links` via `useAppData()` (`addLink`, `updateLink`, `duplicateLink`, `removeLink`, `reorderLinks`, `registerLinkOpen`).
- Supabase/Backend calls: none — local-only.
- Source: `frontend/src/components/app/SchoolLinksSection.tsx`, `SchoolLinkDialog.tsx`.

### `EditProfileDialog.tsx`
- Route(s): `profile.tsx`.
- State consumed/owned: `profile` via `useAppData().updateProfile` (local prototype profile fields distinct from Supabase `profiles`/`AccountSection`'s account data).
- Supabase/Backend calls: none directly (see `SettingsSections.tsx` `AccountSection` for the Supabase-backed profile editor).
- Source: `frontend/src/components/app/EditProfileDialog.tsx`.

### `frontend/src/components/app/SettingsSections.tsx` (`AccountSection`, `PreferencesSections`, `StorageSection`)
- Route(s): `settings.tsx`.
- `AccountSection`:
  - Supabase calls: `supabase.auth.getUser()`, `fetchAccountProfile`/`updateAccountProfile` (`profiles` table), `uploadAvatar`/`removeAvatar` (`profile-avatars` bucket), `supabase.auth.updateUser({email})`, `supabase.auth.updateUser({password})`.
  - Side effects: `track()` for `settings_profile_saved`, `settings_avatar_updated`, `settings_avatar_removed`, `settings_email_change_requested`, `settings_password_changed`.
- `PreferencesSections`:
  - Supabase calls: `fetchPreferences`/`savePreferences` (`user_preferences.preferences`).
  - UI: `Switch` controls for `assistant_audio_enabled`, `assistant_audio_autoplay` (autoplay switch disabled/forced off when audio itself is off — `onCheckedChange` composition at source line ~446), plus other boolean preferences (`exam_reminders`, `daily_study_summary`, `sound_effects`, `auto_storage_cleanup`) and the `selected_qwen_model` selector.
  - Side effects: `track()` per preference change.
- `StorageSection`:
  - Supabase calls: `fetchStorageUsage()` (RPC `get_storage_usage_status`), `listStorageItems()` (`assistant_attachments` + defensive `documents` read), deletions via Storage API, `storage-emergency-cleanup` Edge Function trigger.
- Localisation: `useI18n` throughout.
- Source: `frontend/src/components/app/SettingsSections.tsx`.

### `StatsOverviewPanel.tsx`
- Route(s): `stats.tsx`.
- State consumed: `assessments` via `useAppData()`, filtered/aggregated client-side (`lib/grade-math.ts`).
- Supabase/Backend calls: none — grades/statistics are entirely local prototype state today.
- Source: `frontend/src/components/app/StatsOverviewPanel.tsx`.

### Presentational-only (no state, no Supabase/backend calls)
`Badges.tsx`, `BrandLogos.tsx`, `GradeDisplay.tsx`, `LiveClock.tsx` (owns a local `setInterval` tick only), `States.tsx` (empty/error/loading placeholders), `Timetable.tsx` (renders `occurrencesInRange()` output from `AppDataProvider`, read-only view).

## `frontend/src/components/ui/*`

All are shadcn/Radix-derived generic primitives (buttons, dialogs, inputs, selects, sheets, tables, tooltips, etc.). None call Supabase or the backend, own no domain state, and carry no localisation of their own — all copy is passed in as props/children by the components documented above. Not enumerated individually because they create no backend requirement.

