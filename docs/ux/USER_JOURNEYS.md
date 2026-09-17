Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# User Journeys

Complete, source-grounded catalogue of every navigable journey in Alim's Study Assistant. Each
entry documents entry point, preconditions, the user action, the resulting UI state, the real
frontend handler/component, the Supabase interaction, the backend interaction (explicitly
labelled), persistence, success state, error state, and next navigation.

Superseded document: `docs/archive/USER_FLOWS.md` predates this catalogue; this file is the current
source of truth for user journeys.

Status labels used below: **CURRENT — FRONTEND**, **CURRENT — SUPABASE**,
**CURRENT — EXTERNAL INTEGRATION**, **EXPECTED BACKEND CONTRACT**,
**BACKEND IMPLEMENTATION UNKNOWN**, **BACKEND TODO FOR CODEX**, **DEPRECATED — REMOVED**.

---

## 1. First visit

- **Entry point:** any URL, unauthenticated browser, e.g. `/`.
- **Preconditions:** no active Supabase session.
- **User action:** loads the app.
- **UI state:** `frontend/src/routes/index.tsx` `beforeLoad` calls `supabase.auth.getUser()`; with
  no user it renders `WelcomeAuthPage` → `WelcomeAuthScreen` with `AuthForm`
  (`frontend/src/components/AuthForm.tsx`) in `signin` mode by default.
- **Frontend handler/component:** `frontend/src/routes/index.tsx`, `frontend/src/components/AuthForm.tsx`.
- **Supabase interaction:** `supabase.auth.getUser()` — CURRENT — SUPABASE.
- **Backend interaction:** none.
- **Persistence:** none.
- **Success state:** welcome screen with sign-in form, language flag menu is not shown here (no
  `AppHeader`); `useI18n` still applies via `I18nProvider` in `frontend/src/routes/__root.tsx`.
- **Error state:** none applicable at this stage.
- **Next navigation:** sign in, sign up, or password reset (see below); OAuth buttons.

## 2. Signup (with username availability pre-check)

- **Entry point:** `/` → `AuthForm` → "Sign up" link switches `mode` to `"signup"`.
- **Preconditions:** signed out.
- **User action:** enters username, email, password, submits.
- **UI state:** `handleSignUp` in `frontend/src/components/AuthForm.tsx:113-153`. Username is
  normalised (`normaliseUsername`) and validated client-side against `USERNAME_PATTERN =
  /^[a-z0-9._-]{3,30}$/` (`validateUsername`, lines 34-51) before any network call.
- **Frontend handler/component:** `frontend/src/components/AuthForm.tsx` `handleSignUp`.
- **Supabase interaction:**
  1. Edge Function `username-availability` invoked via `supabase.functions.invoke` (line
     121-124) — CURRENT — SUPABASE. Response `{available?, valid?}`; per FACTS, a failed/absent
     response is NOT treated as "taken" (continues to signUp, letting the DB unique index decide).
  2. `supabase.auth.signUp({ email, password, options: { emailRedirectTo: origin + "/home", data:
     { username } } })` — CURRENT — SUPABASE.
- **Backend interaction:** none (auth is Supabase-native).
- **Persistence:** Supabase `auth.users` row created (pending confirmation); username stored in
  auth metadata via `options.data`; a corresponding `public.profiles` row is expected to be
  provisioned by Supabase-side logic (not in frontend code — CURRENT — SUPABASE, declared).
- **Success state:** `toast.success(t("auth.checkEmailToConfirm"))`, mode reset to `"signin"`
  with the identifier pre-filled with the chosen username; `auth_signup_succeeded` telemetry
  event via `track()` (`frontend/src/lib/telemetry.ts`).
- **Error state:** `validateUsername` failure → `UiError` with localized length/char message.
  `availability.data.valid === false` → `auth.usernameCharsError`. `availability.data.available
  === false` → `auth.usernameTaken`. A `signUp` failure NEVER matches on the raw message: an
  `unexpected_failure`/HTTP 500 triggers a re-check of the exact username via
  `username-availability` and only `available: false` shows `auth.usernameTaken`, otherwise the
  generic localized error from `auth-errors.ts`; other errors map by stable code and are shown via
  `toast.error(localizedMessage(err) ?? t("auth.authenticationFailed"))`; `trackFailure` logs
  `auth_signup_failed`.
- **Next navigation:** stays on `/`, now in sign-in mode awaiting email confirmation, or user
  completes email login once confirmed.

## 3. Username creation

- **Entry point:** part of the signup flow above; there is no separate "create username" screen —
  username is chosen at signup time only.
- **Preconditions:** signed out, in `signup` mode.
- **User action:** types into the `username` field (`frontend/src/components/AuthForm.tsx:246-256`).
- **UI state:** helper text `auth.usernameHelper` under the field; validation happens on submit,
  not on keystroke.
- **Frontend handler/component:** `AuthForm.tsx` (`handleSignUp`, `validateUsername`).
- **Supabase interaction:** `username-availability` Edge Function (see Signup above).
- **Backend interaction:** none.
- **Persistence:** stored as `auth.users.user_metadata.username` at sign-up; `public.profiles.username`
  is the canonical field read later (`frontend/src/lib/account-data.ts`).
- **Success/Error state:** identical to Signup journey above.
- **Next navigation:** proceeds through Signup.

## 4. Email login

- **Entry point:** `/`, `AuthForm` in default `signin` mode.
- **Preconditions:** signed out; has a confirmed email/password account.
- **User action:** types an email (containing `@`) into the identifier field, enters password,
  submits.
- **UI state:** `handleSignIn` (`frontend/src/components/AuthForm.tsx:76-111`) detects `@` and
  branches to email sign-in.
- **Frontend handler/component:** `AuthForm.tsx` `handleSignIn`.
- **Supabase interaction:** `supabase.auth.signInWithPassword({ email, password })` — CURRENT —
  SUPABASE.
- **Backend interaction:** none.
- **Persistence:** Supabase session (JWT) persisted by the Supabase JS client's storage adapter.
- **Success state:** `track({ event_name: "auth_signin_succeeded", ... method: "email" })`, then
  `navigate({ to: "/home", replace: true })`.
- **Error state:** thrown `error` bubbles to `handleSubmit`'s catch; `trackFailure("auth_signin_failed", ...)`;
  `toast.error(localizedMessage(err) ?? t("auth.authenticationFailed"))`.
- **Next navigation:** `/home`.

## 5. Username login

- **Entry point:** `/`, `AuthForm` in default `signin` mode.
- **Preconditions:** signed out; identifier does not contain `@`.
- **User action:** types username + password, submits.
- **UI state:** `handleSignIn` normalises and validates the username, then calls the Edge
  Function.
- **Frontend handler/component:** `AuthForm.tsx:90-111`.
- **Supabase interaction:**
  1. `supabase.functions.invoke("username-login", { body: { username, password } })` — CURRENT —
     SUPABASE (`AuthForm.tsx:94`). Expected result `{ access_token, refresh_token }`.
  2. `supabase.auth.setSession({ access_token, refresh_token })` — CURRENT — SUPABASE.
- **Backend interaction:** none (Edge Function is Supabase-hosted, not the local Python backend).
- **Persistence:** Supabase session established via `setSession`.
- **Success state:** `track(... method: "username")`; navigate to `/home`.
- **Error state:** invalid username format → `UiError` before network call. Missing tokens or
  function error → `Error(t("auth.usernamePasswordError"))`. `sessionError` from `setSession`
  rethrown. All surfaced via the shared `toast.error` path in `handleSubmit`.
- **Next navigation:** `/home`.

## 6. OAuth login (GitHub / LinkedIn / Spotify)

- **Entry point:** `/`, `AuthForm`, OAuth button row (visible in `signin` and `signup` modes).
- **Preconditions:** signed out; provider enabled in the Supabase project.
- **User action:** clicks a provider button (GitHub, LinkedIn, or Spotify — the only three offered,
  per `OAUTH_PROVIDERS` in `AuthForm.tsx:24-32`).
- **UI state:** `handleOAuth(provider, label)` (`AuthForm.tsx:194-210`) sets `isLoading`, fires
  `track({ event_name: "oauth_signin_started", ... })`.
- **Frontend handler/component:** `AuthForm.tsx` `handleOAuth`.
- **Supabase interaction:** `supabase.auth.signInWithOAuth({ provider, options: { redirectTo:
  origin + "/home" } })` where `provider` is `"github" | "linkedin_oidc" | "spotify"` — CURRENT —
  SUPABASE / CURRENT — EXTERNAL INTEGRATION (provider's own OAuth screen).
- **Backend interaction:** none.
- **Persistence:** browser is redirected off-app to the provider, then back with a Supabase
  session established via the OAuth redirect handling in `frontend/src/routes/__root.tsx`'s
  `onAuthStateChange` wiring.
- **Success state:** browser lands on `/home` after the provider redirect completes.
- **Error state:** only synchronous errors from initiating the redirect are caught:
  `trackFailure("oauth_signin_failed", ...)`, `toast.error(t("auth.oauthSignInFailed", { provider:
  label }))`, `isLoading` reset. Errors mid-flow at the provider are outside frontend control.
- **Next navigation:** `/home`.

## 7. Logout

- **Entry point:** `AppHeader` profile dropdown menu (`frontend/src/components/app/AppHeader.tsx:181-184`),
  available on every authenticated screen (rendered via `AppShell`).
- **Preconditions:** signed in.
- **User action:** clicks "Sign out".
- **UI state:** `handleSignOut` (`AppHeader.tsx:49-60`) calls `signOutCompletely()`.
- **Frontend handler/component:** `frontend/src/lib/sign-out.ts` `signOutCompletely`.
- **Supabase interaction:** `logActivity({ event_name: "auth_signout", feature: "auth" })` (writes
  to `usage_events` via the `activity-log` Edge Function, see `frontend/src/lib/telemetry.ts`)
  sent *before* `supabase.auth.signOut()` so it is still attributed to the user — CURRENT —
  SUPABASE.
- **Backend interaction:** none.
- **Persistence:** Supabase session cleared; `clearGoogleAccess()` (`frontend/src/lib/google-calendar.ts`)
  removes the sessionStorage-held Google Calendar provider token, always run in a `finally` block
  even if sign-out throws.
- **Success state:** `router.invalidate()` then `navigate({ to: "/", replace: true })`, landing on
  the welcome/sign-in screen.
- **Error state:** thrown error is caught in `AppHeader.handleSignOut`; `console.error`,
  `toast.error(t("nav.signOutFailed"))`; navigation is skipped so the user stays on the current
  authenticated page.
- **Next navigation:** `/` (welcome) on success; stays put on failure.

## 8. Home

- **Entry point:** `/home`, reached after any successful sign-in, or via header/nav "Home" link.
- **Preconditions:** signed in (`_authenticated/route.tsx` gate).
- **User action:** lands on the page; optionally changes the academic year selector.
- **UI state:** `frontend/src/routes/_authenticated/home.tsx` renders `AppShell` with a greeting
  (`profile.preferredName`/`fullName`), two big cards (School, Planner), a "Today" stat row
  (average, next exam, study time, next activity) computed from `useAppData()` and
  `useAcademicYear()`, and `SchoolLinksSection`.
- **Frontend handler/component:** `home.tsx`, `frontend/src/components/app/AcademicYearSelector.tsx`,
  `frontend/src/components/app/SchoolLinksSection.tsx`.
- **Supabase interaction:** none directly in this route; underlying data comes from
  `AppDataProvider` (`frontend/src/lib/store/app-data.ts`), which is client-local prototype state
  (mock data / localStorage-backed), not a live Supabase query for grades/events at this time.
- **Backend interaction:** none.
- **Persistence:** academic-year selection persisted via `AcademicYearProvider`
  (`frontend/src/lib/store/academic-year.ts`).
- **Success state:** dashboard renders with computed stats; empty states show `"—"` /
  `home.stat.*.none` copy when there is no data.
- **Error state:** none surfaced (pure client computation).
- **Next navigation:** `/school`, `/planner`, or any header nav item.

## 9. School list

- **Entry point:** `/school` via Home's "School" card or header nav.
- **Preconditions:** signed in.
- **User action:** browses subjects, sorts/filters, optionally adds a test or uploads a transcript.
- **UI state:** `frontend/src/routes/_authenticated/school.index.tsx` renders `SubjectGrid`
  (`frontend/src/components/app/SubjectCard.tsx`), a year-average panel with rounding
  accordion, and a failing-subjects warning banner when applicable. Sort (`name`, average
  asc/desc, `recent`) and filter (`all`, `failing`, `with-grades`, `no-grades`) are local `useState`.
- **Frontend handler/component:** `school.index.tsx`, `AssessmentDialog`
  (`frontend/src/components/app/AssessmentDialog.tsx`), `TranscriptImportDialog`
  (`frontend/src/components/app/TranscriptImportDialog.tsx`), `StatsOverviewPanel`.
- **Supabase interaction:** none directly; grade math runs client-side over `useAppData()`
  assessments (`frontend/src/lib/grade-math.ts`).
- **Backend interaction:** none. Transcript OCR/parsing is BACKEND IMPLEMENTATION UNKNOWN — the
  dialog collects data client-side only (see Document upload journey for the actual upload path).
- **Persistence:** assessments live in the `AppDataProvider` client store (prototype state), not
  Supabase tables, per current code.
- **Success state:** subject grid + year-average table populate; "Add test" via `AssessmentDialog`
  updates state immediately.
- **Error state:** empty state (`EmptyState`) when there are no grades yet, with a CTA to add a
  test.
- **Next navigation:** `/school/$subject` (click a subject card), `/stats`, `/planner`.

## 10. Subject selection

- **Entry point:** `/school`, clicking a `SubjectCard`.
- **Preconditions:** signed in; subject slug must resolve via `getSchoolSubject`.
- **User action:** clicks a subject tile.
- **UI state:** router navigates to `/school/$subject`; `loader` in
  `frontend/src/routes/_authenticated/school.$subject.tsx:34-38` calls `getSchoolSubject(params.subject)`
  and throws `notFound()` if absent.
- **Frontend handler/component:** `school.$subject.tsx` loader + `SubjectDashboard`.
- **Supabase interaction:** none.
- **Backend interaction:** none.
- **Persistence:** none (pure routing/lookup).
- **Success state:** `SubjectDashboard` renders with subject header, combined-average card (for
  multi-component subjects), and mode tabs.
- **Error state:** `notFoundComponent: SubjectNotFound` renders an `EmptyState` with a "back to
  School" button when the slug is unknown.
- **Next navigation:** any of the seven subject-mode tabs (Chat, Knowledge Analysis, Quiz Mode,
  Exam Mode, Study Plan, Statistics, Subject Tools).

## 11. Subject workspace (mode tabs)

- **Entry point:** `/school/$subject`, left-hand mode nav.
- **Preconditions:** on a valid subject dashboard.
- **User action:** clicks a mode tab (`SUBJECT_MODES` from `frontend/src/lib/mock/materials.ts`).
- **UI state:** local `mode` state (`school.$subject.tsx:78`) switches the central panel:
  - **Chat** → description + a button linking to `/chat` (the tutoring Study Chat, not embedded
    here).
  - **Statistics** → for multi-component subjects, a "combined vs. component" toggle; otherwise a
    per-subject `AverageWithRounded`, `GradeLineChart`, and editable test list with
    `AssessmentActions`/`AssessmentDialog`.
  - **Knowledge Analysis / Quiz Mode / Exam Mode / Study Plan / Subject Tools** → `EmptyState`
    with `subject.comingNext` copy and a disabled "Notify me" button — these modes are UI
    placeholders only.
- **Frontend handler/component:** `school.$subject.tsx`, `frontend/src/components/app/GradeDisplay.tsx`,
  `frontend/src/components/app/AssessmentActions.tsx`, `frontend/src/components/app/AssessmentDialog.tsx`.
- **Supabase interaction:** none for these tabs (grade edits go through `useAppData()` local
  mutators).
- **Backend interaction:** Quiz/Exam/Study-Plan generation is BACKEND TODO FOR CODEX — no such
  endpoint exists or is called from the frontend; the tabs are intentionally inert placeholders.
- **Persistence:** grade edits persist in the client `AppDataProvider` store only.
- **Success state:** immediate re-render on mode/tab switch; grade edits reflect instantly.
- **Error state:** none beyond the standard `EmptyState` placeholders.
- **Next navigation:** `/chat` (from Chat tab), `/stats`, stays within `/school/$subject`.

## 12. Grades

- **Entry point:** `/school` (year table), `/school/$subject` (Statistics tab), `/stats`.
- **Preconditions:** signed in.
- **User action:** opens `AssessmentDialog` ("Add test") or `AssessmentActions` (edit/delete) on
  an existing row.
- **UI state:** `frontend/src/components/app/AssessmentDialog.tsx` form (title, type, points/max,
  date, subject, source); `frontend/src/components/app/AssessmentActions.tsx` exposes
  edit/duplicate/delete affordances per row.
- **Frontend handler/component:** `AssessmentDialog.tsx`, `AssessmentActions.tsx`,
  `frontend/src/lib/grade-math.ts` (`gradeOf`, `summariseSubject`, `summariseYear`,
  `roundToHalf`).
- **Supabase interaction:** none — assessments are a client-side prototype model in
  `frontend/src/lib/store/app-data.ts` (see `docs/frontend/FRONTEND_DATA_MODEL.md`/`STATE_AND_STORAGE.md`
  for full model; not re-derived here).
- **Backend interaction:** none.
- **Persistence:** in-memory/localStorage-backed `AppDataProvider` state only; not written to
  Supabase tables at this time.
- **Success state:** dialog closes, list/table and averages re-render, `toast.success` on save
  where applicable.
- **Error state:** required-field validation is enforced by native form constraints inside the
  dialog; no network error path exists since there is no backend call.
- **Next navigation:** stays on the current subject/statistics page.

## 13. Assessments

Assessments and grades share the same model/UI in this codebase (an "assessment" row carries
type, points, and yields a grade). See **Grades** above for the full journey; the same
`AssessmentDialog`/`AssessmentActions` pair is reused from `/school`, `/school/$subject`, and
`/stats`.

## 14. Materials

- **Entry point:** `/school/$subject`, right-hand `MaterialsPanel`.
- **Preconditions:** on a subject dashboard.
- **User action:** clicks "Add material" (link/note) or opens an existing material.
- **UI state:** `frontend/src/components/app/MaterialsPanel.tsx` lists materials filtered to the
  active subject, grouped by `MaterialSection`; a `MaterialDialog` (same file, lines 65+) collects
  name/type/section/subject/url/notes.
- **Frontend handler/component:** `MaterialsPanel.tsx` (`addMaterial`, `updateMaterial` from
  `useAppData()`).
- **Supabase interaction:** none for link/note-type materials — these are client-side metadata
  only. (File uploads are a separate journey — see **Document upload** below, which does use
  Supabase Storage.)
- **Backend interaction:** none.
- **Persistence:** client `AppDataProvider` store.
- **Success state:** `toast.success(t("materials.toast.updated"|"materials.toast.added"))`.
- **Error state:** none beyond required-field form validation.
- **Next navigation:** stays on `/school/$subject`.

## 15. Document upload

- **Entry point:** `/school` "Upload transcript" button, or file-type entries added from
  `MaterialsPanel`/`SettingsSections` (avatar) — the general file-upload primitives live in
  `frontend/src/lib/storage-management.ts`.
- **Preconditions:** signed in; file under the relevant size limit (`AVATAR_MAX_BYTES` 2 MiB for
  avatars, `MEDIA_MAX_BYTES` 1 MiB for chat/assistant attachments per FACTS).
- **User action:** picks a file via `TranscriptImportDialog`
  (`frontend/src/components/app/TranscriptImportDialog.tsx`) or an attachment picker in
  `AssistantChat`.
- **UI state:** file name/size preview chip; upload progress via local `sending`/`uploading`
  state.
- **Frontend handler/component:** `TranscriptImportDialog.tsx`; for assistant attachments,
  `frontend/src/lib/assistant-data.ts` `validateAttachment` + `sendAssistantMessage`.
- **Supabase interaction:** Storage upload to a private bucket under `<uid>/...` (buckets:
  `user-materials`, `chat-attachments`, `profile-avatars`, `assistant-descriptors` depending on
  context) — CURRENT — SUPABASE, RLS scoped to `(storage.foldername(name))[1] = auth.uid()::text`
  per the preview-project evidence in FACTS (must be re-verified against production before
  treating as machine-verified).
- **Backend interaction:** transcript OCR/parsing and document chunking (`documents`,
  `document_chunks` tables) are BACKEND IMPLEMENTATION UNKNOWN — no frontend code parses uploaded
  transcripts today; the dialog captures manual entry alongside the file.
- **Persistence:** object stored in Supabase Storage under the user's folder; a
  `media_retention_queue` row is created for chat/assistant attachments per
  `frontend/src/lib/media-retention.ts`, with a default `delete_after` of `now() + 30 minutes`
  (BACKEND TODO FOR CODEX for the actual deletion sweep — the frontend only enqueues the row).
- **Success state:** `toast.success` and the attachment/material chip appears attached.
- **Error state:** `validateAttachment` rejects oversized/unsupported files client-side before
  upload with a localized error; Storage errors are caught and surfaced via `toast.error` /
  `trackFailure`.
- **Next navigation:** stays on the current screen; attachment is sent with the next chat message
  (Assistant) or listed in Materials (subject transcript).

## 16. Study tools

- **Entry point:** `/school/$subject`, "Subject Tools" mode tab.
- **Preconditions:** on a subject dashboard.
- **User action:** clicks the "Subject Tools" tab.
- **UI state:** renders the shared `EmptyState` placeholder (`subject.comingNext` /
  `subject.comingNextDescription`) with a disabled-in-effect "Notify me" button — no working
  study-tools implementation exists yet.
- **Frontend handler/component:** `school.$subject.tsx` (mode `"Subject Tools"` branch).
- **Supabase interaction:** none.
- **Backend interaction:** BACKEND TODO FOR CODEX — no endpoint defined.
- **Persistence:** none.
- **Success/Error state:** n/a (static placeholder).
- **Next navigation:** switch to another mode tab.

## 17. Subject chat (Study Chat / tutoring)

- **Entry point:** `/school/$subject` Chat tab → "Open Study Chat" button, or directly via
  `/chat`.
- **Preconditions:** signed in.
- **User action:** `/chat` (`frontend/src/routes/_authenticated/chat.index.tsx`) picks up the
  most recent thread or creates one, then redirects to `/chat/$threadId`
  (`frontend/src/routes/_authenticated/chat.$threadId.tsx` → `StudyChat`
  component, `frontend/src/components/StudyChat.tsx`). User types a message and sends.
- **UI state:** `StudyChat` renders a thread list (`ThreadList`), a `Conversation`/`Message`
  stream from `@ai-sdk/react`'s `useChat`, and a `PromptInput` composer. Assistant replies stream
  in as `text-delta` parts; a `context-metadata` data part renders `SourceSnippetList`.
- **Frontend handler/component:** `frontend/src/components/StudyChat.tsx`,
  `frontend/src/lib/chat.functions.ts` (`listThreads`, `listMessages`, `createThread`,
  `deleteThread` — TanStack server functions).
- **Supabase interaction:**
  - `listThreads`/`listMessages`/`createThread`/`deleteThread` read/write `threads` and `messages`
    tables — CURRENT — SUPABASE, RLS `user_id = auth.uid()` (preview-project evidence).
  - `supabase.auth.getSession()` is used per-request to attach `Authorization: Bearer
    <access_token>` to the `/api/chat` fetch (`StudyChat.tsx:120-129`).
- **Backend interaction:** `POST /api/chat` (`frontend/src/routes/api/chat.ts`) — EXPECTED
  BACKEND CONTRACT. Verifies the bearer token via `supabase.auth.getClaims`, checks thread
  ownership, inserts the user message, then calls
  `frontend/src/lib/context-backend.server.ts` `requestContextAnswer`, which POSTs to
  `${ALIM_CONTEXT_BACKEND_URL}/api/chat` (default `http://127.0.0.1:8001/api/chat`) with headers
  `Content-Type` + `X-Student-Id` and a JSON body `{thread_id, user_message_id, question,
  subject_id, language, academic_year, grade_level, include_sources:true, allow_web:true,
  stream:false}`. On success, streams `text-start/text-delta/text-end` plus a
  `context-metadata` data part `{sources, examTip, usedModel, retrievalSummary}`; on
  `onFinish`, inserts the assistant message into `messages`.
- **Persistence:** `messages` table (both user and assistant rows), `threads.updated_at`
  implicitly touched by inserts.
- **Success state:** streamed answer renders progressively; sources list and exam tip shown when
  present; optional Listen button (see Speech journey) appears on the completed assistant
  message.
- **Error state:** missing/invalid bearer → 401 from `/api/chat`; thread not owned/found → 404;
  no `threadId`/no user text → 400; backend failure → `ContextBackendError.status` (default 503)
  with its message. `chat.onError` shows `toast.error(t("chat.sendFailed"))` and
  `trackFailure("chat_message_failed", ...)`.
- **Next navigation:** stays in `/chat/$threadId`; "New session" creates another thread via
  `createThreadFn`.

## 18. General Assistant

- **Entry point:** header nav "Assistant" → `/assistant` (redirect-free landing, unlike Study
  Chat) or `/assistant/$threadId`.
- **Preconditions:** signed in.
- **User action:** types a message, optionally attaches files, sends.
- **UI state:** `frontend/src/routes/_authenticated/assistant.index.tsx` and
  `assistant.$threadId.tsx` both render `AssistantChat`
  (`frontend/src/components/assistant/AssistantChat.tsx`) with a thread sidebar, message list,
  and composer supporting attachments (image/audio/video/document chips via `AttachmentChip`).
- **Frontend handler/component:** `AssistantChat.tsx`, `frontend/src/lib/assistant-data.ts`
  (`listAssistantThreads`, `listAssistantMessages`, `createAssistantThread`,
  `renameAssistantThread`, `deleteAssistantThread`, `sendAssistantMessage`, `validateAttachment`).
- **Supabase interaction:** reads/writes `assistant_threads`, `assistant_messages`,
  `assistant_attachments` — CURRENT — SUPABASE, RLS `user_id = auth.uid()` (preview-project
  evidence); attachment blobs go to a Storage bucket via `assistant-data.ts`.
- **Backend interaction:** per FACTS, general Assistant generation is BACKEND IMPLEMENTATION
  UNKNOWN — "assistant_messages assistant rows are never fabricated by the frontend." The
  frontend stores the user's message/attachments and waits; it does not call any local model
  endpoint for a reply in current code.
- **Persistence:** `assistant_threads`/`assistant_messages`/`assistant_attachments` rows; uploaded
  attachment objects in Storage.
- **Success state:** user message and attachment chips appear immediately; thread title is
  derived via `deriveThreadTitle` when unset.
- **Error state:** `validateAttachment` rejects unsupported/oversized files before upload;
  `sendAssistantMessage` failures are caught and reported via `toast.error`/`trackFailure`.
- **Next navigation:** switching threads in the sidebar updates the URL to
  `/assistant/$threadId`; "New chat" creates a thread and navigates there.

## 19. Planner

- **Entry point:** header nav "Planner", Home's "Planner" card, or `/planner` directly (supports
  `?date=`, `?event=`, `?google=` search params).
- **Preconditions:** signed in.
- **User action:** browses Timetable/Day/Month/List views, adds/edits/moves events, toggles
  category filters.
- **UI state:** `frontend/src/routes/_authenticated/planner.tsx` — large stateful page: `view`,
  `anchor` date, `active` category filter, drag-to-move via `Timetable`
  (`frontend/src/components/app/Timetable.tsx`), `EventDialog`/`EventDetailDialog` for
  create/edit/detail, conflict detection banner, and a `GoogleCalendarCard` for the read-only
  Google integration.
- **Frontend handler/component:** `planner.tsx`, `frontend/src/components/app/Timetable.tsx`,
  `frontend/src/components/app/EventDialog.tsx`, `EventDetailDialog.tsx`,
  `frontend/src/lib/store/app-data.ts` (`updateEvent`, `updateOccurrence`, `splitSeriesFrom`,
  `removeEvent`, `removeOccurrence`, `endSeriesBefore`, `duplicateEvent`, `restoreEvent`).
- **Supabase interaction:** none for editable planner events (client `AppDataProvider` store);
  see Google Calendar journeys below for the read-only external merge.
- **Backend interaction:** none; study-session/plan auto-generation is BACKEND TODO FOR CODEX.
- **Persistence:** client store only for editable events.
- **Success state:** `toast.success(t("planner.movedToast", ...))` after a drag-move;
  `track({ event_name: "planner_event_moved", ... })`.
- **Error state:** overlapping-event conflicts are surfaced as a non-blocking banner
  (`planner.conflictOverlap`/`conflictDetail`), not an error dialog.
- **Next navigation:** stays on `/planner`; `EventDetailDialog` can deep-link back via the
  `?event=` search param for notification-triggered highlighting.

## 20. Google Calendar connect

- **Entry point:** `/planner`, `GoogleCalendarCard` (`frontend/src/components/app/GoogleCalendarCard.tsx`),
  "Connect" button when not connected.
- **Preconditions:** signed in; Google OAuth provider enabled and manual identity linking allowed
  in the Supabase project.
- **User action:** clicks "Connect".
- **UI state:** `handleConnect` (`GoogleCalendarCard.tsx:127-138`) sets `busy`, fires
  `track({ event_name: "google_calendar_connect_started", ... })`.
- **Frontend handler/component:** `GoogleCalendarCard.tsx`, `frontend/src/lib/google-calendar.ts`
  `connectGoogleCalendar`.
- **Supabase interaction:** `supabase.auth.linkIdentity({ provider: "google", options: { scopes:
  "https://www.googleapis.com/auth/calendar.readonly", redirectTo: origin +
  "/planner?google=connected", queryParams: { access_type: "online", prompt: "consent" } } })` —
  CURRENT — SUPABASE / CURRENT — EXTERNAL INTEGRATION (Google's consent screen).
- **Backend interaction:** none.
- **Persistence:** none until the redirect returns with a session carrying `provider_token`.
- **Success state:** browser is redirected to Google, then back to `/planner?google=connected`;
  `captureProviderToken` stores the token in `sessionStorage` (key
  `alim.google-calendar.provider-token`) with a conservative ~55-minute expiry — never written to
  the database, localStorage, or telemetry.
- **Error state:** `GoogleCalendarError` codes `manual-linking-disabled` and `provider-not-enabled`
  are distinguished by message-matching on the Supabase error; both and a generic
  `connect-failed` show a localized status line (`ERROR_KEY` map in `GoogleCalendarCard.tsx`).
- **Next navigation:** stays on `/planner`; card flips to the connected state once a token is
  captured.

## 21. Google Calendar sync

- **Entry point:** `/planner`, automatic on load/range change/every 5 minutes once connected, or
  manual "Sync now" button.
- **Preconditions:** connected (valid session token in `sessionStorage`).
- **User action:** none required (auto) or clicks "Sync now".
- **UI state:** `sync()` (`GoogleCalendarCard.tsx:65-96`) sets `busy`, calls
  `fetchGoogleCalendarEvents`, converts results via `googleOccurrences`, and calls the
  `onOccurrences` callback prop to merge them into the planner's rendered (not editable) list.
- **Frontend handler/component:** `GoogleCalendarCard.tsx`, `frontend/src/lib/google-calendar.ts`
  (`fetchGoogleCalendarEvents`, `googleOccurrences`).
- **Supabase interaction:** none (direct Google API call).
- **Backend interaction:** none — CURRENT — EXTERNAL INTEGRATION: direct browser fetch to
  `https://www.googleapis.com/calendar/v3/calendars/primary/events` with `Authorization: Bearer
  <provider token>`.
- **Persistence:** none — Google events are merged for rendering only each sync cycle, never
  written into the editable planner state or any database table.
- **Success state:** `setLastSync(new Date())`; `track({ event_name:
  "google_calendar_sync_succeeded", ... event_count })`. Silent syncs (`options.silent`) do not
  toast.
- **Error state:** 401/403 → `clearGoogleAccess()` + `GoogleCalendarAuthError("access-expired")`;
  other non-OK → `GoogleCalendarError("request-failed")`. `trackFailure("google_calendar_sync_failed", ...)`;
  non-silent syncs show `toast.error(t("calendar.toastSyncFailed"))`.
- **Next navigation:** stays on `/planner`; Google-badge items appear inline in Timetable/Month/List
  views (see Read-only events below).

## 22. Google Calendar disconnect

- **Entry point:** `/planner`, `GoogleCalendarCard`, "Disconnect" button (shown when connected).
- **Preconditions:** connected.
- **User action:** clicks "Disconnect".
- **UI state:** `handleDisconnect` (`GoogleCalendarCard.tsx:140-147`).
- **Frontend handler/component:** `GoogleCalendarCard.tsx`, `frontend/src/lib/google-calendar.ts`
  `clearGoogleAccess`.
- **Supabase interaction:** none (does not revoke the linked identity server-side; only clears
  the local session token).
- **Backend interaction:** none.
- **Persistence:** removes `sessionStorage` key `alim.google-calendar.provider-token`.
- **Success state:** card flips to disconnected; status text `calendar.disconnectedStatus`;
  `onOccurrences([])` clears any Google events from the current view;
  `track({ event_name: "google_calendar_disconnected", ... })`.
- **Error state:** none (synchronous, cannot fail).
- **Next navigation:** stays on `/planner`.

## 23. Google Calendar read-only events

- **Entry point:** any planner view (Timetable, Day, Month, List) while connected.
- **Preconditions:** connected and synced.
- **User action:** clicks a Google-sourced occurrence.
- **UI state:** `handleSelect` in `planner.tsx:282-285` routes Google occurrences
  (`isGoogleOccurrence`, `frontend/src/lib/google-calendar.ts:299-301`) to `setGoogleDetail`
  instead of the editable `EventDetailDialog`/drag flow; List view renders a small "Google" badge
  (`GoogleCalendarLogo`) next to such items.
- **Frontend handler/component:** `planner.tsx`, `frontend/src/lib/google-calendar.ts`
  `isGoogleOccurrence`/`googleOccurrences`.
- **Supabase interaction:** none.
- **Backend interaction:** none.
- **Persistence:** none — explicitly never enters the editable planner state
  (`googleOccurrences` sets `readOnly: true`, `externalSource: "google"` on the synthesized
  `PlannerEvent`); `applyMove`/`handleMove` bail out immediately for Google occurrences
  (`isGoogleOccurrence(occurrence) → return`).
- **Success/Error state:** n/a beyond the Sync journey above.
- **Next navigation:** stays on `/planner`.

## 24. Statistics

- **Entry point:** header nav "Statistics" or `/school` failing-banner links, → `/stats`.
- **Preconditions:** signed in.
- **User action:** filters by subject, reviews KPIs/charts/table, optionally adds a test.
- **UI state:** `frontend/src/routes/_authenticated/stats.tsx` renders four KPI cards (year
  average, tests added, highest/lowest grade), a `MiniTrendChart`
  (`frontend/src/components/app/StatsOverviewPanel.tsx`), a subject-comparison bar list, and a
  full sortable test table with `AssessmentActions` per row.
- **Frontend handler/component:** `stats.tsx`, `frontend/src/lib/grade-math.ts`
  (`monthlySeries`, `summariseYear`, `summariseSubjectView`, `percentageOf`, `gradeOf`).
- **Supabase interaction:** none (client `AppDataProvider` data).
- **Backend interaction:** none.
- **Persistence:** none new (reads/edits the same client assessment store as Grades).
- **Success state:** KPIs and table populate; `AssessmentDialog` "Add test" updates instantly.
- **Error state:** `EmptyState` when `yearTests.length === 0`.
- **Next navigation:** `/school` (back link), stays on `/stats`.

## 25. Notifications

- **Entry point:** bell icon in `AppHeader` (`frontend/src/components/app/NotificationCenter.tsx`),
  present on every authenticated screen.
- **Preconditions:** signed in.
- **User action:** opens the bell popover; clicks a notification, "mark all read", or dismiss (X).
- **UI state:** `buildNotifications` (`frontend/src/lib/notifications.ts`) derives a feed purely
  from planner event occurrences in a −14/+30-day window relative to today, grouped into
  Today/Upcoming/Earlier sections; explicitly documented as **prototype only** — "nothing is
  delivered, scheduled or pushed anywhere" (source comment). A `notifications.prototypeBadge`
  chip is shown in the popover footer to make this visible to users.
- **Frontend handler/component:** `NotificationCenter.tsx`, `notifications.ts`,
  `frontend/src/components/app/EventDetailDialog.tsx` (opened on click).
- **Supabase interaction:** none.
- **Backend interaction:** none. Real push/reminder delivery (`exam_reminders`,
  `daily_study_summary` preferences) is BACKEND TODO FOR CODEX — the preferences exist in
  `frontend/src/lib/account-data.ts` but no delivery mechanism is implemented.
- **Persistence:** `readNotifications`/`dismissedNotifications` are tracked in the client
  `AppDataProvider` store (`markNotificationRead`, `markAllNotificationsRead`,
  `dismissNotification`).
- **Success state:** unread count badge updates; toast on dismiss
  (`toast.success(t("notifications.dismissed"))`).
- **Error state:** none (pure client state).
- **Next navigation:** clicking a notification opens `EventDetailDialog` for that occurrence,
  which can deep-link to `/planner?event=<id>` for highlighting.

## 26. Language switching

- **Entry point:** flag icon in `AppHeader` (`frontend/src/components/app/LanguageMenu.tsx`), on
  every authenticated screen; also implicitly available pre-login via browser/localStorage
  detection.
- **Preconditions:** none.
- **User action:** picks a language from the dropdown (exactly seven: en, de, gsw, ru, es, fr, it
  per FACTS/`frontend/src/lib/i18n/languages.ts`).
- **UI state:** `setLanguage(entry.code)` calls into `I18nProvider`
  (`frontend/src/lib/i18n/provider.tsx`); the selected item is highlighted
  (`bg-thread-active`).
- **Frontend handler/component:** `LanguageMenu.tsx`, `frontend/src/lib/i18n/provider.tsx`.
- **Supabase interaction:** for signed-in users, the authoritative value is
  `public.user_preferences.preferences.app_language` — CURRENT — SUPABASE (declared per FACTS;
  the provider is responsible for reading/writing this on change).
- **Backend interaction:** none.
- **Persistence:** `localStorage` key `alim.app_language` is used only as a flash-avoidance cache
  and only when signed out; for signed-in users the database preference is authoritative.
- **Success state:** all `t()`-driven strings and `formatDate`/`formatWeekday`/`formatTime`
  helpers re-render immediately in the new language; date formatting stays `dd/mm/yyyy`,
  weekday+numeric, 24h `HH:mm` regardless of language (per FACTS), with Swiss German (`gsw`)
  using explicit weekday names (Mäntig…Sunntig) and no `ß`.
- **Error state:** none surfaced; a failed preference write would leave the UI on the
  newly-selected language locally while silently not persisting (not explicitly handled in
  reviewed code).
- **Next navigation:** stays on the current screen; language persists across navigation.

## 27. Speech: Listen

- **Entry point:** a completed assistant message bubble in Study Chat (`StudyChat.tsx`) or
  Assistant (`AssistantChat.tsx`) with a Listen (`Volume2`) icon.
- **Preconditions:** `assistant_audio_enabled` preference true (default); browser supports
  `window.speechSynthesis`.
- **User action:** clicks the Listen icon on a message.
- **UI state:** `speak({ text, uiLanguage, onEnd })` (`frontend/src/lib/speech.ts:56-80`) is
  invoked; `speakingId` state tracks which message is currently playing so the icon can swap to a
  Stop (`Square`) icon.
- **Frontend handler/component:** `StudyChat.tsx`/`AssistantChat.tsx`, `frontend/src/lib/speech.ts`.
- **Supabase interaction:** none.
- **Backend interaction:** none — per FACTS, audio/TTS generation is NOT implemented by the local
  backend; this is purely the browser's Web Speech API, ephemeral and never persisted.
- **Persistence:** none.
- **Success state:** `speechLocaleFor(text, uiLanguage)` picks a locale via
  `effectiveResponseLanguage`-informed detection (Cyrillic deterministic, Latin heuristic per
  FACTS) with fallback to the UI language; if a matching voice exists, `speak` returns `"spoken"`
  and audio plays; `onEnd` clears `speakingId`.
- **Error state:** `"unsupported"` (no Web Speech API), `"no-voice"` (no matching voice for the
  locale), or `"error"` (empty text or synthesis threw) are all surfaced as a graceful
  "unavailable" state in the UI rather than a hard failure — no toast spam.
- **Next navigation:** none; playback is inline on the message.

## 28. Speech: Stop

- **Entry point:** the same message bubble, now showing a Stop icon while its speech is playing.
- **Preconditions:** a message is currently being spoken (`speakingId` matches).
- **User action:** clicks Stop.
- **UI state:** `stopSpeaking()` (`frontend/src/lib/speech.ts:82-89`) calls
  `window.speechSynthesis.cancel()`; `speakingId` is cleared, icon reverts to Listen.
- **Frontend handler/component:** `StudyChat.tsx`/`AssistantChat.tsx`, `speech.ts`.
- **Supabase interaction:** none.
- **Backend interaction:** none.
- **Persistence:** none.
- **Success/Error state:** always succeeds synchronously (wrapped in try/catch, silently no-ops
  if nothing was speaking).
- **Next navigation:** none. Speech is also force-stopped when switching threads or unmounting
  (`useEffect` cleanup in both chat components).

## 29. Profile

- **Entry point:** `AppHeader` profile dropdown "View profile", or header nav in the mobile sheet,
  → `/profile`.
- **Preconditions:** signed in.
- **User action:** views personal/school/account info; clicks "Edit" to open `EditProfileDialog`.
- **UI state:** `frontend/src/routes/_authenticated/profile.tsx` loads both the client
  `AppDataProvider` profile (prototype fields like class, school links) and the Supabase-backed
  `AccountProfile` (`frontend/src/lib/account-data.ts` `fetchAccountProfile`) plus the signed-in
  email (`supabase.auth.getUser()`) and a signed avatar URL (`avatarSignedUrl`).
- **Frontend handler/component:** `profile.tsx`, `frontend/src/components/app/EditProfileDialog.tsx`.
- **Supabase interaction:** `fetchAccountProfile()` reads `public.profiles` (columns: `username`,
  `full_name`, `preferred_name`, `photo`, `nationality`, `contact_phone`, `contact_details` jsonb,
  `date_of_birth`) — CURRENT — SUPABASE, RLS `user_id = auth.uid()` in production per FACTS
  (`id = auth.uid()` in the preview project, which uses a different key column — labelled
  accordingly). `avatarSignedUrl` generates a signed URL against the private
  `profile-avatars` bucket.
- **Backend interaction:** none.
- **Persistence:** reads only on this screen; edits happen through `EditProfileDialog`.
- **Success state:** account fields override the local prototype fallback when present
  (`account?.fullName || profile.fullName`, etc.); falls back to `t("profile.notSet")` for empty
  values.
- **Error state:** the load is wrapped in try/catch with a silent fallback comment — "Account
  details stay empty; the local prototype details still render" — no user-facing error shown for
  a failed account fetch.
- **Next navigation:** `/settings` (storage-management link), stays on `/profile` after edits.

## 30. Settings

- **Entry point:** `AppHeader` profile dropdown "Settings", or `/profile`'s storage-management
  link, → `/settings`.
- **Preconditions:** signed in.
- **User action:** edits account fields/avatar, chooses a Qwen model, toggles preferences,
  manages storage.
- **UI state:** `frontend/src/routes/_authenticated/settings.tsx` composes three sections from
  `frontend/src/components/app/SettingsSections.tsx`: `AccountSection` (profile fields, avatar
  upload/remove, email/password change), `PreferencesSections` (model selection, language policy,
  audio/reminder/sound toggles), `StorageSection` (usage bar, item list, delete, emergency
  cleanup).
- **Frontend handler/component:** `SettingsSections.tsx`, `frontend/src/lib/account-data.ts`
  (`fetchAccountProfile`, `updateAccountProfile`, `uploadAvatar`, `removeAvatar`,
  `fetchPreferences`, `savePreferences`), `frontend/src/lib/storage-management.ts`
  (`fetchStorageUsage`, `listStorageItems`, `deleteStorageItems`, `invokeEmergencyCleanup`).
- **Supabase interaction:**
  - `public.profiles` read/update — CURRENT — SUPABASE.
  - `profile-avatars` Storage bucket upload/remove (`AVATAR_MAX_BYTES` 2 MiB) — CURRENT —
    SUPABASE.
  - `public.user_preferences` read/update (`preferences` jsonb: `selected_qwen_model`,
    `app_language`, `assistant_reply_language_policy`, `assistant_audio_enabled`,
    `assistant_audio_autoplay`, `exam_reminders`, `daily_study_summary`, `sound_effects`,
    `auto_storage_cleanup`) — CURRENT — SUPABASE.
  - `get_storage_usage_status()` RPC (1 GiB quota; returns quota/used/remaining/percent/
    warning/emergency) — CURRENT — SUPABASE.
  - `storage-emergency-cleanup` Edge Function via `invokeEmergencyCleanup` — CURRENT — SUPABASE.
  - `supabase.auth.updateUser` for email/password change (implied by `AccountSection`'s
    email/password fields).
- **Backend interaction:** none — local model inference itself (llama.cpp/Qwen on port 8000) is
  backend-owned and not called from Settings; only the *selection* of a model name is stored here.
- **Persistence:** `public.profiles`, `public.user_preferences`, Storage objects.
- **Success state:** `toast.success` per section save; storage usage bar/list refresh after
  delete/cleanup.
- **Error state:** upload/save failures caught and reported via `toast.error`/`trackFailure`
  (`frontend/src/lib/telemetry.ts`); avatar validation (size/type) is enforced before upload.
- **Next navigation:** stays on `/settings`.

## 31. Feedback

- **Entry point:** footer "Feedback" link or header nav → `/feedback`.
- **Preconditions:** signed in.
- **User action:** selects a category (idea/bug/general), writes a message (10–4000 chars),
  submits.
- **UI state:** `frontend/src/routes/_authenticated/feedback.tsx`; `tooShort` inline validation
  hint while typing; character counter.
- **Frontend handler/component:** `feedback.tsx` `handleSubmit`.
- **Supabase interaction:** `supabase.functions.invoke("feedback-submit", { body: { message,
  category, context: { route, user_agent, submitted_at } } })` — CURRENT — SUPABASE
  (`feedback.tsx:64`). Writes a `feedback` row (`id, user_id, category, message, context jsonb,
  created_at`, all non-null) plus an object in the `feedback-messages` bucket per FACTS.
- **Backend interaction:** none.
- **Persistence:** `public.feedback` table row; `feedback-messages` Storage object.
- **Success state:** form clears, `setSent(true)` shows `feedback.success.saved` inline plus
  `toast.success(t("feedback.success.toast"))`; `track({ event_name: "feedback_submitted", ...
  })`.
- **Error state:** client-side `< MIN_LENGTH` shows `feedback.error.tooShort` without a network
  call; function errors show `feedback.error.submitFailedGeneric` and
  `trackFailure("feedback_submit_failed", ...)`.
- **Next navigation:** stays on `/feedback`.

## 32. Help

- **Entry point:** footer "Help" link or header nav → `/help`.
- **Preconditions:** signed in.
- **User action:** reads static topic cards; clicks a language tile to open a PDF guide.
- **UI state:** `frontend/src/routes/_authenticated/help.tsx` renders six static topic
  cards (indexing, grading, plans, calendar, language, audio) and a guide grid, one tile per
  language with flag + native name + page count (`GUIDE_PAGES` map: en 7 pages, all others 8).
- **Frontend handler/component:** `help.tsx`.
- **Supabase interaction:** none.
- **Backend interaction:** none.
- **Persistence:** none.
- **Success state:** static content render; clicking a tile is the PDF Guides journey below.
- **Error state:** none.
- **Next navigation:** opens a PDF guide in a new tab (see next journey); footer/nav elsewhere.

## 33. PDF guides

- **Entry point:** `/help`, guide grid tile for a specific language.
- **Preconditions:** none beyond being on `/help`.
- **User action:** clicks a language tile (`<a href="/help-guides/alim-user-guide-<code>.pdf"
  target="_blank">`).
- **UI state:** browser opens a new tab to the static PDF served from `public/help-guides/` (a
  build-time static asset, not a Supabase or backend resource).
- **Frontend handler/component:** `help.tsx` (anchor tag only, no JS handler beyond the browser's
  native new-tab navigation).
- **Supabase interaction:** none.
- **Backend interaction:** none.
- **Persistence:** none.
- **Success state:** PDF renders in a new browser tab.
- **Error state:** a missing file would produce a browser-level 404 for that tab; not handled in
  application code.
- **Next navigation:** none (separate tab); original `/help` tab remains open.

## Appendix — authenticated startup flow (added this pass)

See `docs/sequences/POST_LOGIN_STARTUP.mmd`, `LANGUAGE_ONBOARDING.mmd`,
`MODEL_SELECTION_READINESS.mmd`, `RESOURCE_BLOCKED_NON_AI.mmd`, `SETTINGS_MODEL_RETRY.mmd`,
`AI_SESSION_STATE_MACHINE.mmd` for the full, source-grounded journey:

- **First authenticated load** — `frontend/src/routes/index.tsx` / `auth.tsx` resolve
  `resolveStartupDestination()` (`lib/startup-flow.ts`) instead of assuming `/home` — CURRENT FRONTEND.
- **Language onboarding** (`/onboarding/language`) — one-time, gated by
  `user_preferences.preferences.language_onboarding_completed` — CURRENT SUPABASE — CURRENT FRONTEND.
- **Model readiness gate** (`/onboarding/model`) — required every NEW browser session (sessionStorage
  key `alim.ai_session.v1`, never Supabase, never localStorage) — CURRENT FRONTEND. Backend
  preparation itself (`/api/model/prepare`, `/api/model/operation`) is BACKEND TODO FOR CODEX; until
  implemented every check ends in `backend_unavailable` and "Continue without AI".
- **Guard** — `frontend/src/routes/_authenticated/route.tsx` re-checks on every protected navigation;
  `/onboarding/*` and `/auth` are exempt; direct `/home` access cannot bypass the gate.
- **Sign-out** — `lib/sign-out.ts` clears both the cached language flag and the AI session.

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
