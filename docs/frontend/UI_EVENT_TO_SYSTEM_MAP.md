# UI Event → System Map

```
Document status: CURRENT
Generated from: frontend authority main at f0910e6971f12efe0ad547b904f6e2a518b13856 · live Supabase evidence dated 2026-09-18
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: f0910e6971f12efe0ad547b904f6e2a518b13856
```

Every row is derived from a real file under `frontend/src/routes/**`, `frontend/src/components/**` or `frontend/src/lib/**`. "Supabase" names a table/bucket/RPC/Edge Function or `none`. "Backend/API" states the local Python backend involvement using the verbatim status labels from the facts handoff: **CURRENT — FRONTEND**, **CURRENT — SUPABASE**, **CURRENT — EXTERNAL INTEGRATION**, **EXPECTED LOCAL BACKEND CONTRACT**, **BACKEND GAP**, **FUTURE CODEX IMPLEMENTATION**, **DEPRECATED**.

A large share of Alim's "study" surface (School, Subject workspace, Planner, Notifications, most of Profile) is a **local-only prototype**: state lives in `localStorage` (`lib/store/app-data.tsx`, key `asa.data.v2`) with no Supabase table and no backend call. These rows are marked **CURRENT — FRONTEND (local only)** and Supabase/Backend columns say `none`.

---

## 1. App shell / header

Files: `frontend/src/components/app/AppHeader.tsx`, `frontend/src/components/app/MobileNavigation.tsx`, `frontend/src/components/app/AppShell.tsx`, `frontend/src/components/app/AcademicYearSelector.tsx`, `frontend/src/components/app/Breadcrumbs.tsx`, `frontend/src/components/app/LanguageMenu.tsx`, `frontend/src/components/app/LiveClock.tsx`, `frontend/src/components/app/NotificationCenter.tsx`, `frontend/src/components/ThemeToggle.tsx`, `frontend/src/lib/sign-out.ts`.

| Screen | UI element | Component | User action | Frontend handler | Local state | Supabase | Backend/API | Persistence | Success UI | Failure UI |
|---|---|---|---|---|---|---|---|---|---|---|
| App shell (desktop) | App logo → Home | `AppHeader.tsx` (`<Link to="/home">`) | Click logo | TanStack Router `Link` navigation, no handler function | none | none | none | none (route only) | Navigates to `/home` | n/a |
| App shell (mobile) | Hamburger menu button | `AppHeader.tsx` `Sheet`/`SheetTrigger` | Click | `setOpen(true)` (local `useState`) | `open: boolean` | none | none | none | Sheet slides in with nav links | n/a |
| App shell | Top nav tabs (Home/School/Planner/Assistant/Stats/Help/Feedback) | `AppHeader.tsx` `NAV` array + `Link` | Click a tab | Router `Link` (`isActive()` for styling only) | none | none | none | none | Navigates to route, tab highlighted | n/a |
| App shell (mobile) | Bottom tab bar (Home/School/Planner/Assistant) | `MobileNavigation.tsx` `ITEMS` + `Link` | Tap a tab | Router `Link` | none | none | none | none | Navigates, active tab highlighted | n/a |
| App shell | Notification bell | `NotificationCenter.tsx` `PopoverTrigger` | Click bell | `setOpen` (Popover state) | `open`, `selected` (local) | none — reads `useAppData()` events (localStorage) | none | none (all client-derived from `asa.data.v2`) | Popover list opens, badge count from `buildNotifications()` (`lib/notifications.ts`) | n/a |
| App shell | Notification "Mark all read" | `NotificationCenter.tsx` | Click | `markAllNotificationsRead(keys)` from `useAppData()` (`lib/store/app-data.tsx`) | `readNotifications: string[]` | none | none | `localStorage` (`asa.data.v2`) | Items shown as read | n/a |
| App shell | Notification item mark-read / dismiss (X) | `NotificationCenter.tsx` | Click check / X icon | `markNotificationRead(n.key)` / `dismissNotification(n.key)` (`lib/store/app-data.tsx`) | `readNotifications`, `dismissedNotifications` | none | none | `localStorage` | `toast.success(t("notifications.dismissed"))` on dismiss | n/a |
| App shell | Notification item click → event detail | `NotificationCenter.tsx` → `EventDetailDialog.tsx` | Click list item | `markNotificationRead(n.key)`, `setSelected(n)` | `selected: EventNotification \| null` | none | none | `localStorage` | `EventDetailDialog` opens | n/a |
| App shell | Language selector (flag dropdown) | `LanguageMenu.tsx` | Select a language | `setLanguage(entry.code)` from `useI18n()` (`lib/i18n/provider.tsx`) | i18n context `language` | `user_preferences.preferences.app_language` (authoritative once signed in) | none | Supabase `user_preferences` (signed in) or `localStorage` key `alim.app_language` (signed out / flash-avoidance) — **CURRENT — SUPABASE** (declared; not machine-verified this pass) | UI re-renders in new language immediately | n/a (no explicit error toast; falls back silently) |
| App shell | Theme toggle (sun/moon) | `ThemeToggle.tsx` | Click | `toggleTheme()` from `useTheme()` hook | theme state (device-only) | none | none | `localStorage`/`document` class (device-only) | Icon + page theme flips | n/a |
| App shell | Live clock | `LiveClock.tsx` | Passive (ticks every second) | `setInterval` in `useEffect` | `now: Date` | none | none | none (device clock only) | Time/date update every second | n/a |
| App shell | Profile menu → "View profile" | `AppHeader.tsx` dropdown | Click | Router `Link to="/profile"` | none | none | none | none | Navigates to `/profile` | n/a |
| App shell | Profile menu → "Settings" | `AppHeader.tsx` dropdown | Click | Router `Link to="/settings"` | none | none | none | none | Navigates to `/settings` | n/a |
| App shell | Profile menu → "Sign out" | `AppHeader.tsx` dropdown | Click | `handleSignOut()` → `signOutCompletely()` (`lib/sign-out.ts`) | none | `usage_events` (via `activity-log` Edge Function, event `auth_signout`) | none | Supabase Auth session ended (`supabase.auth.signOut()`); Google provider token cleared (`sessionStorage`) | Redirects to `/` | `toast.error(t("nav.signOutFailed"))`, error logged to console (raw message never shown) |
| App shell | Academic-year selector (‹ / dropdown / ›) | `AcademicYearSelector.tsx` | Click arrows or pick from `Select` | `step(-1/1)` / `setYearId(v)` from `useAcademicYear()` (`lib/store/academic-year.tsx`) | Academic-year context (global) | none (client-computed from `lib/mock/academic.ts`) | none | none (in-memory / URL-independent) | All pages using the selector re-render for the chosen year | n/a |
| App shell | Breadcrumbs | `Breadcrumbs.tsx` / `PageNav` | Click a crumb | Router `Link` | none | none | none | none | Navigates up the hierarchy | n/a |

---

## 2. Welcome / Auth (`/`, `/auth`, `/auth/update-password`)

Files: `frontend/src/routes/index.tsx`, `frontend/src/routes/auth.tsx`, `frontend/src/routes/auth.update-password.tsx`, `frontend/src/components/AuthForm.tsx`.

| Screen | UI element | Component | User action | Frontend handler | Local state | Supabase | Backend/API | Persistence | Success UI | Failure UI |
|---|---|---|---|---|---|---|---|---|---|---|
| `/` welcome | Email/username field | `AuthForm.tsx` (`identifier`) | Type | `setIdentifier(e.target.value)` | `identifier: string` | none | none | none | n/a | n/a |
| `/` welcome | Password field | `AuthForm.tsx` (`password`) | Type | `setPassword(e.target.value)` | `password: string` | none | none | none | n/a | n/a |
| `/` welcome (sign-up) | Username field | `AuthForm.tsx` (`username`) | Type | `setUsername(e.target.value)`, validated by `validateUsername()`/`USERNAME_PATTERN` | `username: string` | none (validated client-side, then via `username-availability`) | none | none | n/a | Inline helper text `auth.usernameHelper`; on submit see below |
| `/` welcome | Sign-in submit | `AuthForm.tsx` `handleSubmit` → `handleSignIn()` | Click "Sign in" | Email path: `supabase.auth.signInWithPassword({email,password})`. Username path: `supabase.functions.invoke("username-login", {body:{username,password}})` then `supabase.auth.setSession(...)` | `isLoading` | Supabase Auth (`auth.users`) | Edge Function **username-login** (`AuthForm.tsx:94`) — **CURRENT — SUPABASE** | Supabase session (JWT) | `track({event_name:"auth_signin_succeeded", feature:"auth", properties:{method}})`, navigate to `/home` | `toast.error(localizedMessage(err) ?? t("auth.authenticationFailed"))`; `trackFailure("auth_signin_failed", ...)` |
| `/` welcome (sign-up) | Sign-up submit incl. username-availability pre-check | `AuthForm.tsx` `handleSignUp()` | Click "Create account" | 1) `validateUsername()`; 2) `supabase.functions.invoke("username-availability", {body:{username}})` (failure is NOT treated as taken); 3) `supabase.auth.signUp({email, password, options:{emailRedirectTo, data:{username}}})` | `isLoading` | Supabase Auth + Edge Function **username-availability** (`AuthForm.tsx:121`) — **CURRENT — SUPABASE** | none | Supabase `auth.users` row (unconfirmed until email click) | `track({event_name:"auth_signup_succeeded"})`, `toast.success(t("auth.checkEmailToConfirm"))`, switches to sign-in mode | `toast.error(...)`; specific case: `t("auth.usernameTaken")` when the DB unique index rejects or availability check says taken |
| `/` welcome | Password reset request | `AuthForm.tsx` `handleReset()` | Click "Reset password" | `supabase.auth.resetPasswordForEmail(email, {redirectTo: origin + "/auth/update-password"})` | `resetEmail` | Supabase Auth | none | Supabase sends reset email | `track({event_name:"auth_password_reset_requested"})`, `toast.success(t("auth.resetLinkSent"))` | `toast.error(...)`; `trackFailure("auth_password_reset_failed", ...)` |
| `/` welcome | GitHub / LinkedIn / Spotify buttons | `AuthForm.tsx` `handleOAuth(provider,label)` | Click one of 3 buttons | `supabase.auth.signInWithOAuth({provider, options:{redirectTo: origin + "/home"}})` | `isLoading` | Supabase Auth (OAuth) — **CURRENT — EXTERNAL INTEGRATION** | none | Supabase session after redirect | Browser redirected to provider; `track({event_name:"oauth_signin_started"})` | `toast.error(t("auth.oauthSignInFailed",{provider:label}))`; `trackFailure("oauth_signin_failed", ...)` |
| `auth.update-password` | New password field | `auth.update-password.tsx` | Type | `setPassword(e.target.value)` | `password` | none | none | none | n/a | n/a |
| `auth.update-password` | Repeat password field | `auth.update-password.tsx` | Type | `setConfirm(e.target.value)` | `confirm` | none | none | none | n/a | n/a |
| `auth.update-password` | "Update password" submit | `auth.update-password.tsx` `handleSubmit` | Click | Client match check, then `supabase.auth.updateUser({password})` | `isLoading` | Supabase Auth | none | Password updated in `auth.users` | `toast.success(t("auth.passwordUpdated"))`, navigate `/home` | `toast.error(t("auth.passwordsDoNotMatch"))` (mismatch) or `toast.error(error.message)` (raw Supabase message — not localized here) |

---

## 3. Home (`/home`)

File: `frontend/src/routes/_authenticated/home.tsx`. All data is local prototype state from `useAppData()` / `useAcademicYear()`; the page itself has no interactive mutation beyond the Academic Year selector (covered in §1) and links into School/Planner/SchoolLinksSection (covered in §4).

| Screen | UI element | Component | User action | Frontend handler | Local state | Supabase | Backend/API | Persistence | Success UI | Failure UI |
|---|---|---|---|---|---|---|---|---|---|---|
| Home | "School" big card | `home.tsx` `BigCard` | Click | Router `Link to="/school"` | none | none | none | none | Navigates | n/a |
| Home | "Planner" big card | `home.tsx` `BigCard` | Click | Router `Link to="/planner"` | none | none | none | none | Navigates | n/a |
| Home | Today stats (average / next exam / study time / activity) | `home.tsx` `Stat` | Passive display | `summariseYear()` (`lib/grade-math.ts`), `occurrencesInRange()` (`lib/store/app-data.tsx`) | derived from `assessments`/`events` | none | none | `localStorage` (`asa.data.v2`) | Renders computed values | n/a |
| Home | "Important School Links" section | `SchoolLinksSection.tsx` (embedded) | See §4 School Links rows | — | — | — | — | — | — | — |

---

## 4. School list (`/school`)

Files: `frontend/src/routes/_authenticated/school.index.tsx`, `frontend/src/components/app/SubjectCard.tsx`, `frontend/src/components/app/SchoolLinksSection.tsx`, `frontend/src/components/app/SchoolLinkDialog.tsx`, `frontend/src/components/app/AssessmentDialog.tsx`, `frontend/src/components/app/AssessmentActions.tsx`, `frontend/src/components/app/TranscriptImportDialog.tsx`, `frontend/src/lib/store/app-data.tsx`.

All rows below are **CURRENT — FRONTEND (local only)**: mutations go through `useAppData()` methods which write to React state and mirror it into `localStorage` under `asa.data.v2` (`lib/store/app-data.tsx`). Supabase = `none`, Backend/API = `none` unless noted.

| Screen | UI element | Component | User action | Frontend handler | Local state | Supabase | Backend/API | Persistence | Success UI | Failure UI |
|---|---|---|---|---|---|---|---|---|---|---|
| School | Subject cards | `SubjectCard.tsx` | Click card body | Router `Link to="/school/$subject"` | none | none | none | none | Navigates to subject workspace | n/a |
| School | Subject card "Add test" | `SubjectCard.tsx` → `AssessmentDialog.tsx` | Click, fill dialog, Save | `addAssessment(payload)` (`useAppData()`) | dialog `draft` state | none | none | `localStorage` | `toast.success(t("grades.toast.addedTitle"))` | Save button `disabled` while `invalid` (client validation only); no network failure path |
| School | Subject card "Upload transcript" | `SubjectCard.tsx` → `TranscriptImportDialog.tsx` | Click, review rows, "Import" | `addAssessment()` per valid row (`TranscriptImportDialog.tsx importRows()`) | `rows`, `step` | none | none | `localStorage` | `toast.success(t("grades.transcript.toastSingular/Plural"))` | Import button disabled when `valid.length === 0` |
| School | Subject card grade-history expander | `SubjectCard.tsx` | Click chevron | `setOpen((v) => !v)` | `open: boolean` | none | none | none | Expands/collapses list | n/a |
| School | Sort-by selector | `school.index.tsx` | Choose from `Select` | `setSort(v as SortKey)` | `sort: SortKey` | none | none | none | Subject list reorders | n/a |
| School | "Show" filter selector | `school.index.tsx` | Choose from `Select` | `setFilter(v as FilterKey)` | `filter: FilterKey` | none | none | none | Subject list filters | n/a |
| School | Page-level "Add test" button | `school.index.tsx` → `AssessmentDialog.tsx` | Click, fill, Save | `addAssessment()` / `updateAssessment()` | dialog draft | none | none | `localStorage` | `toast.success(...)` (added/updated) | n/a |
| School | Page-level "Upload transcript" button | `school.index.tsx` → `TranscriptImportDialog.tsx` | same as above | same as above | — | none | none | `localStorage` | same | same |
| School | Grade-record row menu → Edit | `AssessmentActions.tsx` | Select "Edit" | opens `AssessmentDialog` with `record`; `updateAssessment(record.id, payload)` on Save | `editing: boolean` | none | none | `localStorage` | `toast.success(t("grades.toast.updatedTitle"))` | n/a |
| School | Grade-record row menu → Duplicate | `AssessmentActions.tsx` | Select "Duplicate" | `duplicateAssessment(record.id)` | none | none | none | `localStorage` | new row appears | n/a |
| School | Grade-record row menu → Move to another subject | `AssessmentActions.tsx` | Select target, "Move" | `updateAssessment(record.id, {subjectSlug: target})` | `moving`, `target` | none | none | `localStorage` | `toast.success(t("grades.move.toastSuccess"))` | n/a |
| School | Grade-record row menu → Include/Exclude from stats | `AssessmentActions.tsx` | Select | `updateAssessment(record.id, {includeInStats: !record.includeInStats})` | none | none | none | `localStorage` | list re-renders with flag toggled | n/a |
| School | Grade-record row menu → Delete | `AssessmentActions.tsx` | Confirm in `AlertDialog` | `removeAssessment(record.id)` | `confirmDelete` | none | none | `localStorage` | `toast.success(t("grades.delete.toastTitle"))` with "Undo" action → `restoreAssessment(snapshot)` | n/a |
| School | Important School Links — add | `SchoolLinksSection.tsx` → `SchoolLinkDialog.tsx` | Click "Add", fill, Save | `addLink(payload)` | dialog draft | none | none | `localStorage` | `toast.success(t("profile.linkDialog.added"))` | Save disabled while name/url empty |
| School | School link — edit | `SchoolLinkDialog.tsx` (record mode) | Click "Edit" in row menu, Save | `updateLink(record.id, payload)` | `editing` | none | none | `localStorage` | `toast.success(t("profile.linkDialog.updated"))` | n/a |
| School | School link — duplicate | `SchoolLinksSection.tsx` | Row menu "Duplicate" | `duplicateLink(link.id)` | none | none | none | `localStorage` | new tile appears | n/a |
| School | School link — move up/down | `SchoolLinksSection.tsx` `move()` | Row menu arrows | `reorderLinks(ids)` | none | none | none | `localStorage` | list reorders | n/a |
| School | School link — delete | `SchoolLinksSection.tsx` | Row menu "Delete" | `removeLink(link.id)` | none | none | none | `localStorage` | `toast.success(t("profile.links.deleted"))` with "Undo" → `restoreLink(snapshot)` | n/a |
| School | School link — open (click tile) | `SchoolLinksSection.tsx` | Click link | `registerLinkOpen(link.id)` then browser navigates via `<a target="_blank">` | `link.opens` counter | none | none | `localStorage` | opens external site in new tab | n/a |
| School | Category filter chips | `SchoolLinksSection.tsx` | Click chip | `setFilter(c)` | `filter: string` | none | none | none | list filters | n/a |
| School | Accordion "How averages are calculated" / "Grading formula" | `school.index.tsx` `Accordion` | Click header | shadcn `Accordion` internal state | none | none | none | none | Expands/collapses | n/a |

---

## 5. Subject workspace (`/school/$subject`)

Files: `frontend/src/routes/_authenticated/school.$subject.tsx`, `frontend/src/components/app/AssessmentDialog.tsx`, `frontend/src/components/app/AssessmentActions.tsx`, `frontend/src/components/app/MaterialsPanel.tsx`, `frontend/src/components/app/Timetable.tsx` (chat-mode link only). All local-only prototype (`useAppData()` / `localStorage`) unless noted.

| Screen | UI element | Component | User action | Frontend handler | Local state | Supabase | Backend/API | Persistence | Success UI | Failure UI |
|---|---|---|---|---|---|---|---|---|---|---|
| Subject workspace | Component tabs (e.g. SPF split subjects) | `school.$subject.tsx` | Click tab | `setActiveSlug(slug)` | `activeSlug` | none | none | none | Switches active sub-subject view | n/a |
| Subject workspace | Mode nav (Chat / Knowledge Analysis / Quiz / Exam / Study Plan / Statistics / Subject Tools) | `school.$subject.tsx` `SUBJECT_MODES` | Click a mode | `setMode(m)` | `mode: SubjectMode` | none | none | none | Right pane switches content; **Knowledge Analysis, Quiz Mode, Exam Mode, Study Plan, Subject Tools render `EmptyState` placeholders** — **FUTURE CODEX IMPLEMENTATION** (quiz/exam/grading/study-plan endpoints are explicitly unimplemented) | n/a |
| Subject workspace | Statistics view toggle (Combined SPF / per component) | `school.$subject.tsx` | Click chip | `setStatsView("combined"/"component")`, `setActiveSlug()` | `statsView` | none | none | none | Chart/table swaps dataset | n/a |
| Subject workspace | "Chat" mode → "Open Study Chat" button | `school.$subject.tsx` | Click | Router `Link to="/chat"` | none | none | none | none | Navigates to Study Chat (§8) | n/a |
| Subject workspace | Grade entry — add test (per active subject) | `AssessmentDialog.tsx` | Fill dialog, Save | `addAssessment(payload)` | dialog draft | none | none | `localStorage` | `toast.success(t("grades.toast.addedTitle"))` | Save disabled while invalid |
| Subject workspace | Grade entry — edit/duplicate/move/delete/include-in-stats | `AssessmentActions.tsx` | Row menu actions | `updateAssessment` / `duplicateAssessment` / `removeAssessment` / `restoreAssessment` | see §4 | none | none | `localStorage` | toasts as in §4 | n/a |
| Subject workspace | Materials — add material / add web link | `MaterialsPanel.tsx` → `MaterialDialog` | Click "Add material"/"Add web link", fill, Save | `addMaterial(payload)` | `adding: boolean`, dialog draft | none | none | `localStorage` | `toast.success(t("materials.toast.added"))` | Save disabled while name empty |
| Subject workspace | Materials — rename/edit | `MaterialFileCard` → `MaterialDialog` (record mode) | Row menu "Rename or edit", Save | `updateMaterial(file.id, patch)` | `editing` | none | none | `localStorage` | `toast.success(t("materials.toast.updated"))` | n/a |
| Subject workspace | Materials — archive/restore | `MaterialFileCard` | Row menu | `updateMaterial(file.id, {archived: !archived, section})` | none | none | none | `localStorage` | badge/section updates | n/a |
| Subject workspace | Materials — delete | `MaterialFileCard` | Row menu "Delete" | `removeMaterial(file.id)` | none | none | none | `localStorage` | `toast.success(t("materials.toast.deleted"))` with Undo → `restoreMaterial(snapshot)` | n/a |
| Subject workspace | Materials list (upload of actual files) | `MaterialsPanel.tsx` | — | **No file upload exists** — dialog only stores a name/URL/notes record, no Supabase Storage bucket is used here (contrast with `user-materials` bucket declared in facts but not wired into this UI) | — | none | none | `localStorage` | — | — |
| Subject workspace | Study tools (Subject Tools mode) | `school.$subject.tsx` | Click mode | placeholder `EmptyState` | none | none | none | none | Static "coming soon"-style copy | — |

---

## 6. Planner (`/planner`)

Files: `frontend/src/routes/_authenticated/planner.tsx`, `frontend/src/components/app/EventDialog.tsx`, `frontend/src/components/app/EventDetailDialog.tsx`, `frontend/src/components/app/GoogleCalendarCard.tsx`, `frontend/src/lib/google-calendar.ts`, `frontend/src/components/app/Timetable.tsx`.

| Screen | UI element | Component | User action | Frontend handler | Local state | Supabase | Backend/API | Persistence | Success UI | Failure UI |
|---|---|---|---|---|---|---|---|---|---|---|
| Planner | View selector (Timetable/Day/Month/List) | `planner.tsx` | Click segment | `setView(v)` | `view: PlannerView` | none | none | none | Layout switches | n/a |
| Planner | Prev/Today/Next | `planner.tsx` `shift()` | Click | `setAnchor()`, `navigate({to:"/planner", search:{...undefined}})` | `anchor: string` | none | none | none | Range shifts | n/a |
| Planner | "Full day" switch | `planner.tsx` | Toggle | `setFullDay(v)` | `fullDay: boolean` | none | none | none | Timetable hour range expands (0–24 vs 6–22) | n/a |
| Planner | Category filter chips | `planner.tsx` | Click chip | toggles `active: EventCategory[]` | `active` | none | none | none | Occurrences filtered | n/a |
| Planner | "Add item" button | `planner.tsx` → `EventDialog.tsx` | Fill dialog, Save | new: `addEvent({...payload, done:false})`; edit: `updateEvent`/`updateOccurrence`/`splitSeriesFrom` depending on scope | dialog `draft`, `scope` | none | none (`track({event_name:"planner_event_moved" ...})` only on drag, not create) | `localStorage` (`asa.data.v2`) | `toast.success(t("events.toast.added"/"updated"/"occurrenceUpdated"/"futureUpdated"/"seriesUpdated"))` | Save disabled when `invalid` (empty title / end≤start / no weekday chosen) |
| Planner | Timetable block — drag to move | `Timetable.tsx` pointer handlers → `planner.tsx handleMove/applyMove` | Drag & drop | `updateEvent` / `splitSeriesFrom` / `updateOccurrence` depending on recurrence + chosen scope dialog | `pendingMove` | none | `track({event_name:"planner_event_moved", feature:"planner", properties:{scope,category}})` (telemetry only, via `activity-log`) | `localStorage` | `toast.success(t("planner.movedToast",...))` | Read-only (Google) occurrences cannot be dragged — `commit()` returns early |
| Planner | Timetable/List block — click to open detail | `Timetable.tsx`/`planner.tsx` `handleSelect` → `EventDetailDialog.tsx` | Click | Google occurrence → `setGoogleDetail`; own occurrence → `setSelected` | `selected`/`googleDetail` | none | none | none | Dialog opens with full detail | n/a |
| Planner | Event detail dialog — Edit event | `EventDetailDialog.tsx` → `EventDialog.tsx` | Click "Edit event" | `setEditing(true)`; same save handlers as "Add item" row | `editing` | none | none | `localStorage` | toast as above | n/a |
| Planner | Event detail dialog — mark read / dismiss (from notification) | `EventDetailDialog.tsx` | Click | `markNotificationRead`/`dismissNotification` | none | none | none | `localStorage` | `toast.success(t("events.toast.markedRead"/"dismissed"))` | n/a |
| Planner | Event detail dialog — "Open in planner" | `EventDetailDialog.tsx` | Click | `navigate({to:"/planner", search:{date,event,google:undefined}})` | none | none | none | none | Planner scrolls/highlights the event | n/a |
| Planner | Delete occurrence / end series / delete whole series | `planner.tsx` (dialog around `pendingDelete`) | Confirm in dialog | `removeOccurrence` / `endSeriesBefore` / `removeEvent`, with `restoreEvent` available via Undo toast | `pendingDelete` | none | none | `localStorage` | toast confirmation | n/a |
| Planner | Duplicate event | `planner.tsx` (row menu / dialog, uses `useAppData`) | Click "Duplicate" | `duplicateEvent(id)` | none | none | none | `localStorage` | new occurrence appears | n/a |
| Planner | Google Calendar — Connect | `GoogleCalendarCard.tsx` `handleConnect()` | Click "Connect" | `connectGoogleCalendar(redirectTo)` → `supabase.auth.linkIdentity({provider:"google", options:{scopes: calendar.readonly, redirectTo, queryParams}})` | `busy`, `status` | Supabase Auth identity linking — **CURRENT — EXTERNAL INTEGRATION** | none | Google provider token kept in `sessionStorage` only (`lib/google-calendar.ts` `TOKEN_KEY`), never in DB | `track({event_name:"google_calendar_connect_started"})`; browser redirects to Google consent | `setStatus(t(errorMessageKey(err)))`; `trackFailure("google_calendar_connect_failed", ...)`; specific codes: `manual-linking-disabled`, `provider-not-enabled`, `connect-failed` |
| Planner | Google Calendar — Sync now / auto-sync (5 min) | `GoogleCalendarCard.tsx` `sync()` | Click "Sync now" or automatic timer | `fetchGoogleCalendarEvents(from,to)` (`lib/google-calendar.ts`) → Google Calendar REST API directly from the browser using the stored provider token | `lastSync`, `busy` | none (Google API, not Supabase) — **CURRENT — EXTERNAL INTEGRATION** | none | Occurrences merged into planner view only, never written to `asa.data.v2` | `track({event_name:"google_calendar_sync_succeeded", properties:{event_count}})`; badge shows "Last synced …" | `toast.error(t("calendar.toastSyncFailed"))` (unless `silent`); `trackFailure("google_calendar_sync_failed", ...)`; auth errors (401/403) clear the token and show `calendar.error.accessExpired` |
| Planner | Google Calendar — Disconnect | `GoogleCalendarCard.tsx` `handleDisconnect()` | Click "Disconnect" | `clearGoogleAccess()` (removes `sessionStorage` token) | `connected=false`, `lastSync=null` | none | none | `sessionStorage` cleared | `track({event_name:"google_calendar_disconnected"})`; status text updates | n/a |
| Planner | Timetable weekly grid (view + drag) | `Timetable.tsx` | see drag row above | — | — | — | — | — | — | — |

---

## 7. Study chat (`/chat`, `/chat/$threadId`)

Files: `frontend/src/components/StudyChat.tsx`, `frontend/src/components/ThreadList.tsx`, `frontend/src/routes/_authenticated/chat.index.tsx`, `frontend/src/routes/_authenticated/chat.$threadId.tsx`, `frontend/src/lib/chat.functions.ts` (TanStack server functions), `frontend/src/routes/api/chat.ts`, `frontend/src/lib/context-backend.server.ts`, `frontend/src/lib/speech.ts`, `frontend/src/components/app/SourceSnippetList.tsx`.

| Screen | UI element | Component | User action | Frontend handler | Local state | Supabase | Backend/API | Persistence | Success UI | Failure UI |
|---|---|---|---|---|---|---|---|---|---|---|
| Study chat | Thread list (sidebar) | `ThreadList.tsx` fed by `listThreads` server fn | Passive / click a thread | `listThreads` (`chat.functions.ts`) → `supabase.from("threads").select(...).eq("user_id", context.userId)` | React Query cache key `["threads"]` | `threads` table — **CURRENT — SUPABASE** | Server function runs via `requireSupabaseAuth` middleware (Supabase-only, not the Python backend) | Supabase Postgres | List renders; clicking a thread navigates to `/chat/$threadId` | React Query error state (no explicit toast on list-load failure) |
| Study chat | "New session" button | `StudyChat.tsx` | Click, fill Subject + Topic, "Create" | `handleCreateThread()` → `createThreadFn()` → `createThread` server fn → `supabase.from("threads").insert({user_id, title, subject})` | `newThreadOpen`, `newThreadTitle`, `newThreadSubject` | `threads` table — **CURRENT — SUPABASE** | Server function (Supabase-only) | Supabase Postgres | Dialog closes, `refetchThreads()`, navigates to new thread | `toast.error(t("chat.createFailed"))` |
| Study chat | Thread row — delete | `ThreadList.tsx` trash icon | Click | `handleDeleteThread(id)` → `deleteThreadFn()` → `deleteThread` server fn → `supabase.from("threads").delete().eq("id",..).eq("user_id",..)` | none | `threads` table — **CURRENT — SUPABASE** | Server function (Supabase-only) | Supabase Postgres | List refetches; if active thread deleted, navigates to `/chat` | `toast.error(t("chat.deleteFailed"))` |
| Study chat | Message text field | `PromptInputTextarea` inside `PromptInput` | Type | local `PromptInput` state (ai-elements) | draft text | none | none | none | n/a | n/a |
| Study chat | "Send" button | `PromptInputSubmit` / `PromptInput onSubmit` | Click / Enter | `chat.sendMessage({text:value})` via `useChat` (`@ai-sdk/react`) with `DefaultChatTransport` targeting `POST /api/chat` (`routes/api/chat.ts`); auth header injected from `supabase.auth.getSession()` | `chat.status` (submitted/streaming/ready/error) | `messages` table — inserted server-side inside `/api/chat` (user message, then assistant message on `onFinish`) — **CURRENT — SUPABASE** for persistence | `/api/chat` verifies `Authorization: Bearer <token>`, checks thread ownership, then calls `requestContextAnswer()` → loopback FastAPI with the exact bearer plus `X-Student-Id` cross-check — **CURRENT — LOCAL BACKEND**; safety remains fail-closed until its later endpoint exists | Supabase `messages` rows; response streamed as AI-SDK UI message parts incl. `data-context-metadata` (sources, examTip, usedModel, retrievalSummary) | Assistant text streams in; `track({event_name:"chat_message_sent"})` on submit, `chat_message_completed` on finish | `toast.error(t("chat.sendFailed"))`; `trackFailure("chat_message_failed", ...)`; backend status/code/request ID is preserved; timeout/cancel/offline remain distinct and never fabricate a reply |
| Study chat | Sources disclosure (`<details>`) | `SourceSnippetList.tsx` | Click "Sources (n)" | native `<details>` toggle, no handler | none | none | data comes from `context-metadata` part of the stream — **EXPECTED LOCAL BACKEND CONTRACT** | none | Expands list of `source_id`/`material_name`/`section`/`page`/`snippet`/`url` | If `sources` empty/absent, component renders `null` |
| Study chat | "Listen" button (assistant message) | `StudyChat.tsx` `handleToggleSpeech()` | Click | `speak({text, uiLanguage, onEnd})` (`lib/speech.ts`, browser `speechSynthesis`) | `speakingId` | none | none — **local browser API only, never persisted** | none | Icon swaps to "Stop"; `speakingId` set | `toast.error(t("assistant.audio.unsupported"))` or `t("assistant.audio.noVoice")` depending on `speak()` outcome |
| Study chat | "Stop" button (while speaking) | `StudyChat.tsx` `handleToggleSpeech()` | Click | `stopSpeaking()` (`lib/speech.ts`) | `speakingId=null` | none | none | none | Playback stops, icon reverts to "Listen" | n/a |
| Study chat | Autoplay of new assistant reply | `StudyChat.tsx` `useChat({onFinish})` | Passive (if `assistant_audio_enabled && assistant_audio_autoplay` in preferences fetched via `fetchPreferences()`) | `speak({...})` | `speakingId` | reads `user_preferences` — **CURRENT — SUPABASE** | none | none | Audio plays automatically for the newly completed message only | same audio-unavailable toasts as "Listen" |
| Study chat | Sign out (chat-page mini header) | `StudyChat.tsx` `handleSignOut()` | Click | `signOutCompletely()` (`lib/sign-out.ts`) — the SAME single sign-out path as `AppHeader.tsx`: best-effort backend runtime release, `supabase.auth.signOut({ scope: "local" })`, then all session-scoped state cleared | none | `usage_events` (event `auth_signout`) | none | Supabase session ended, language/AI session decisions cleared | Redirects to `/` | `toast.error(t("nav.signOutFailed"))` |

---

## 8. General Assistant (`/assistant`, `/assistant/$threadId`)

Files: `frontend/src/components/assistant/AssistantChat.tsx`, `frontend/src/routes/_authenticated/assistant.index.tsx`, `frontend/src/routes/_authenticated/assistant.$threadId.tsx`, `frontend/src/lib/assistant-data.ts`, `frontend/src/lib/storage-management.ts`, `frontend/src/lib/speech.ts`.

Assistant tables (`assistant_threads`, `assistant_messages`, `assistant_attachments`) are entirely separate from tutoring `threads`/`messages`. **The assistant never generates a reply in the frontend** — no backend call exists for assistant generation; assistant rows for the model's answer are, per the facts handoff, never fabricated client-side. This is **BACKEND GAP / FUTURE CODEX IMPLEMENTATION**.

| Screen | UI element | Component | User action | Frontend handler | Local state | Supabase | Backend/API | Persistence | Success UI | Failure UI |
|---|---|---|---|---|---|---|---|---|---|---|
| Assistant | "New chat" button | `AssistantChat.tsx` `handleNewChat()` | Click | `createAssistantThread()` (`lib/assistant-data.ts`) → `supabase.from("assistant_threads").insert({user_id, title:"New conversation"})` | `threads` | `assistant_threads` — **CURRENT — SUPABASE** | none | Supabase Postgres | `refreshThreads()`, navigates to new thread, `track({event_name:"assistant_thread_created"})` | `toast.error(t("assistant.createFailed"))`; `trackFailure("assistant_thread_create_failed", ...)` |
| Assistant | Thread list — click | `AssistantChat.tsx` | Click title | `navigate({to:"/assistant/$threadId", params:{threadId}})` | none | none | none | none | Navigates | n/a |
| Assistant | Thread list — Rename | `AssistantChat.tsx` `handleRename()` | Click pencil, edit inline, Enter/blur | `renameAssistantThread(id,title)` → `supabase.from("assistant_threads").update({title, updated_at})` | `renamingId`, `renameValue` | `assistant_threads` — **CURRENT — SUPABASE** | none | Supabase Postgres | `refreshThreads()` | `toast.error(t("assistant.renameFailed"))` |
| Assistant | Thread list — Delete | `AssistantChat.tsx` `handleDelete()` | Click trash, confirm `window.confirm` | `deleteAssistantThread(id)` → removes attachment objects from `chat-attachments` bucket, soft-deletes `assistant_attachments` rows (`deleted_at`), then deletes the `assistant_threads` row | none | `assistant_threads`, `assistant_attachments`, Storage bucket `chat-attachments` — **CURRENT — SUPABASE** | none | Supabase Postgres + Storage | `refreshThreads()`, `track({event_name:"assistant_thread_deleted"})`, `toast.success(t("assistant.deleteSuccess"))` | `toast.error(t("assistant.deleteFailed"))` |
| Assistant | Composer text field | `AssistantChat.tsx` `Textarea` | Type / Enter (no Shift) | `setText(e.target.value)`; Enter triggers `handleSend()` | `text: string` | none | none | none | n/a | n/a |
| Assistant | Attachment picker (paperclip) | `AssistantChat.tsx` `handlePickFiles()` | Click paperclip, choose files | `validateAttachment(file)` (`lib/assistant-data.ts`) per file: images/audio/video ≤ `MEDIA_MAX_BYTES` (1 MiB), else PDF/DOCX/DOC | `files: File[]` | none (validated client-side against the same rule the DB enforces) | none | none until Send | Accepted files appear as chips | `toast.error(...)` per rejected file (size or unsupported type) |
| Assistant | Attachment chip remove (×) | `AssistantChat.tsx` | Click × on a pending chip | `setFiles((current) => current.filter(...))` | `files` | none | none | none | Chip removed | n/a |
| Assistant | "Send" button | `AssistantChat.tsx` `handleSend()` | Click / icon button | `sendAssistantMessage({threadId, content, files})` (`lib/assistant-data.ts`): inserts `assistant_messages` row, uploads each file to `chat-attachments` bucket at `<uid>/<threadId>/...`, inserts `assistant_attachments` metadata row per file, bumps thread `updated_at`; auto-creates a thread first if none is active, and auto-renames "New conversation" threads from the first message via `deriveThreadTitle()` | `sending`, `text`, `files` | `assistant_messages`, `assistant_attachments`, Storage bucket `chat-attachments` — **CURRENT — SUPABASE** | **No backend call is made** — the assistant's reply is never generated; UI shows a static "response pending" notice — **FUTURE CODEX IMPLEMENTATION** | Supabase Postgres + Storage | Message + chips appear; `track({event_name:"assistant_message_send_started"})` then `assistant_message_saved`; pending notice `t("assistant.pendingNotice")` shown after a user message | `toast.error(t("assistant.sendFailed"))`; `trackFailure("assistant_message_failed", ...)`; upload failures also roll back the just-inserted attachment metadata row |
| Assistant | "Listen" (assistant message) | `AssistantChat.tsx` `handleToggleSpeech()` | Click | `speak({text: content, uiLanguage, onEnd})` (`lib/speech.ts`) | `speakingId` | none | none | none | Icon swaps to Stop | `toast.error(t("assistant.audio.unsupported"/"noVoice"))` |
| Assistant | "Stop" (while speaking) | `AssistantChat.tsx` | Click | `stopSpeaking()` | `speakingId=null` | none | none | none | Playback stops | n/a |

---

## 9. Statistics (`/stats`)

Files: `frontend/src/routes/_authenticated/stats.tsx`, `frontend/src/components/app/StatsOverviewPanel.tsx`. All **CURRENT — FRONTEND (local only)**: reads `useAppData()`/`localStorage`, no Supabase/backend calls other than the shared `AssessmentDialog`/`AssessmentActions` mutation paths already documented in §4.

| Screen | UI element | Component | User action | Frontend handler | Local state | Supabase | Backend/API | Persistence | Success UI | Failure UI |
|---|---|---|---|---|---|---|---|---|---|---|
| Statistics | Academic-year selector | shared `AcademicYearSelector.tsx` | see §1 | — | — | — | — | — | — | — |
| Statistics | Subject filter dropdown | `stats.tsx` | Choose from `Select` | `setSubject(v)` | `subject: string` | none | none | none | Table/KPIs recompute for the chosen subject | n/a |
| Statistics | "Add test" button (page header + empty state) | `stats.tsx` → `AssessmentDialog.tsx` | Fill, Save | `addAssessment(payload)` | dialog draft | none | none | `localStorage` | `toast.success(t("grades.toast.addedTitle"))` | Save disabled while invalid |
| Statistics | Test table — row actions | `AssessmentActions.tsx` (embedded per row) | Edit/duplicate/move/toggle/delete | same as §4 | — | none | none | `localStorage` | same toasts as §4 | n/a |
| Statistics | Overview panel (average, trend chart, strongest/focus subject) | `StatsOverviewPanel.tsx` | Passive | `summariseYear()`, `monthlySeries()` (`lib/grade-math.ts`) | derived | none | none | none | Renders computed values | n/a |

---

## 10. Notifications

Notifications are not a standalone route; they are the `NotificationCenter.tsx` popover documented in §1, backed entirely by `lib/notifications.ts` `buildNotifications()` (pure function over local planner `events`) and `useAppData()` read/write helpers (`markNotificationRead`, `markAllNotificationsRead`, `dismissNotification`). No table, bucket or backend call is involved anywhere in the notification feed — it is explicitly commented "Prototype only — nothing is delivered, scheduled or pushed anywhere" in `lib/notifications.ts`. **CURRENT — FRONTEND (local only)**.

---

## 11. Profile (`/profile`)

Files: `frontend/src/routes/_authenticated/profile.tsx`, `frontend/src/components/app/EditProfileDialog.tsx`, `frontend/src/lib/account-data.ts`.

| Screen | UI element | Component | User action | Frontend handler | Local state | Supabase | Backend/API | Persistence | Success UI | Failure UI |
|---|---|---|---|---|---|---|---|---|---|---|
| Profile | Page load — account fetch | `profile.tsx` `useEffect` | Passive | `supabase.auth.getUser()` + `fetchAccountProfile()` (`lib/account-data.ts`, `profiles` table) + `avatarSignedUrl()` (Storage `profile-avatars`) | `account`, `accountAvatar`, `accountEmail` | `profiles` table, Storage bucket `profile-avatars` — **CURRENT — SUPABASE** | none | Supabase Postgres/Storage (read-only here) | Displays sign-in email, full name, username, avatar | Silently falls back to local prototype `profile` fields on any error (caught, no toast) |
| Profile | Academic-year selector | shared | see §1 | — | — | — | — | — | — | — |
| Profile | "Edit profile" button | `profile.tsx` → `EditProfileDialog.tsx` | Click, edit fields, "Save changes" | `updateProfile(draft)` (`useAppData()`) — **note: this dialog only edits the local prototype `StudentProfile` (photo URL, name, DOB, school info, focus subject, interface language, username) — it does NOT call `updateAccountProfile()`, so it never touches the Supabase `profiles` row** | `draft: StudentProfile` | none | none | `localStorage` (`asa.data.v2`) | `toast.success(t("profile.editDialog.updated"))` | Save always succeeds client-side (no validation failure path) |
| Profile | Personal / School / Account detail rows | `profile.tsx` `Section`/`Row` | Passive display | mix of Supabase `account` (name/nationality/phone/address) and local `profile` (school info, class, focus subject) | — | `profiles` (read) | none | — | Renders "Not set" placeholder when empty (`t("profile.notSet")`) | n/a |
| Profile | Summary / Content / Storage cards | `profile.tsx` | Passive | derived counts from `useAppData()` | — | none | none | `localStorage` | Renders counts | n/a |
| Profile | "Manage" link (storage card) | `profile.tsx` | Click | Router `Link to="/settings"` | none | none | none | none | Navigates to Settings §12 | n/a |

---

## 12. Settings (`/settings`)

Files: `frontend/src/routes/_authenticated/settings.tsx`, `frontend/src/components/app/SettingsSections.tsx`, `frontend/src/lib/account-data.ts`, `frontend/src/lib/storage-management.ts`.

| Screen | UI element | Component | User action | Frontend handler | Local state | Supabase | Backend/API | Persistence | Success UI | Failure UI |
|---|---|---|---|---|---|---|---|---|---|---|
| Settings | Avatar — "Change picture" | `AccountSection` `handleAvatar()` | Choose image file | `uploadAvatar(file)` (`lib/account-data.ts`): validates image type & `AVATAR_MAX_BYTES` (2 MiB), uploads to `profile-avatars/<uid>/avatar-<ts>.<ext>`, calls `updateAccountProfile({photoPath})`, deletes the previous avatar object | none | `profiles` table + Storage bucket `profile-avatars` — **CURRENT — SUPABASE** | none | Supabase Postgres + Storage | `track({event_name:"settings_avatar_updated"})`, `toast.success(t("settings.account.avatarUpdated"))` | `trackFailure("settings_avatar_update_failed", ...)`, `toast.error(t("settings.account.avatarUpdateError"))` |
| Settings | Avatar — "Remove picture" | `AccountSection` `handleRemoveAvatar()` | Click | `removeAvatar()`: removes Storage object, `updateAccountProfile({photoPath:null})` | none | `profiles`, `profile-avatars` — **CURRENT — SUPABASE** | none | Supabase Postgres + Storage | `track({event_name:"settings_avatar_removed"})`, `toast.success(t("settings.account.avatarRemoved"))` | `trackFailure("settings_avatar_remove_failed", ...)`, `toast.error(t("settings.account.avatarRemoveError"))` |
| Settings | Username / Full name / Nationality / Phone / Address / Guardian fields | `AccountSection` `Input`s | Type | local `patch()` into `profile` state | `profile: AccountProfile` | none (until Save) | none | none | n/a | n/a |
| Settings | "Save profile" button | `AccountSection` `handleSaveProfile()` | Click | `updateAccountProfile({username, fullName, preferredName, nationality, contactPhone, contactDetails})` (`lib/account-data.ts`) | `saving: boolean` | `profiles` table — **CURRENT — SUPABASE** | none | Supabase Postgres | `track({event_name:"settings_profile_saved"})`, `toast.success(t("settings.account.profileSaved"))` | `trackFailure("settings_profile_save_failed", ...)`, `toast.error(t("settings.account.profileSaveError"))` |
| Settings | New email field + "Update" | `AccountSection` `handleEmailChange()` | Type + click | `supabase.auth.updateUser({email: newEmail})` | `newEmail` | Supabase Auth — **CURRENT — SUPABASE** | none | Supabase pending-email-change flow | `track({event_name:"settings_email_change_requested"})`, `toast.success(t("settings.account.email.sent"))` | `trackFailure("settings_email_change_failed", ...)`, `console.error`, `toast.error(t("settings.account.updateError"))` |
| Settings | New password / repeat password + "Update" | `AccountSection` `handlePasswordChange()` | Type + click | client match check, then `supabase.auth.updateUser({password})` | `password`, `confirmPassword` | Supabase Auth — **CURRENT — SUPABASE** | none | Supabase Auth | `track({event_name:"settings_password_changed"})`, `toast.success(t("settings.account.password.updated"))` | `toast.error(t("settings.account.password.mismatch"))` (client-side) or `trackFailure(...)` + `toast.error(t("settings.account.updateError"))` (server) |
| Settings | Qwen model selector | `PreferencesSections` `Select` | Choose model | `update({selected_qwen_model: value})` → `savePreferences()` (`lib/account-data.ts`) → `supabase.from("user_preferences").upsert({user_id, preferences}, {onConflict:"user_id"})` | `prefs: UserPreferences` (optimistic update, rolled back on failure) | `user_preferences.preferences.selected_qwen_model` — **CURRENT — SUPABASE**; consumption by the actual local model runtime is **BACKEND GAP** | none (preference storage only; not sent to `/api/chat`) | Supabase Postgres (JSONB) | `track({event_name:"settings_preference_saved", properties:{preference:"selected_qwen_model"}})` | Optimistic value reverted; `trackFailure("settings_preference_save_failed", ...)`, `toast.error(t("settings.preferences.saveError"))` |
| Settings | Switch — Exam reminders | `PreferencesSections` | Toggle | `update({exam_reminders: checked})` | see above | `user_preferences` — **CURRENT — SUPABASE** | none — reminders are not actually scheduled/sent anywhere (**FUTURE CODEX IMPLEMENTATION** if intended) | Supabase Postgres | toast/track as above | as above |
| Settings | Switch — Daily study summary | `PreferencesSections` | Toggle | `update({daily_study_summary: checked})` | — | `user_preferences` — **CURRENT — SUPABASE** | none — no summary is generated anywhere (**FUTURE CODEX IMPLEMENTATION**) | Supabase Postgres | as above | as above |
| Settings | Switch — Sound effects | `PreferencesSections` | Toggle | `update({sound_effects: checked})` | — | `user_preferences` — **CURRENT — SUPABASE** | none (no sound effects are wired up in the UI) | Supabase Postgres | as above | as above |
| Settings | Switch — Assistant audio enabled | `PreferencesSections` | Toggle | `update({assistant_audio_enabled: checked})` | — | `user_preferences` — **CURRENT — SUPABASE** | none (consumed client-side by `speech.ts` gating) | Supabase Postgres | as above | as above |
| Settings | Switch — Assistant audio autoplay | `PreferencesSections` | Toggle (disabled unless audio enabled) | `update({assistant_audio_autoplay: checked})` | — | `user_preferences` — **CURRENT — SUPABASE** | none | Supabase Postgres | as above | as above |
| Settings | Language (interface) | Not on this page — see §1 `LanguageMenu.tsx` | — | — | — | `user_preferences.preferences.app_language` | none | Supabase Postgres | — | — |
| Settings | Storage usage bar + kind/from/to filters | `StorageSection` | Passive load; change filters | `fetchStorageUsage()` → RPC `get_storage_usage_status()`; `listStorageItems()` (`lib/storage-management.ts`) reads `assistant_attachments`/materials rows defensively; `setKind`/`setFrom`/`setTo` filter client-side | `usage`, `items`, `kind`, `from`, `to` | RPC `get_storage_usage_status` (quota/used/remaining/percent/warning/emergency), tables backing `listStorageItems()` — **CURRENT — SUPABASE** | none | Supabase Postgres (read) | Progress bar + filtered list render; low-storage banner (`remaining_percent ≤ 10`) | `toast.error(t("settings.storage.loadError"))` |
| Settings | Storage — select items (checkboxes) | `StorageSection` | Click checkbox | `toggle(id)` | `selected: Set<string>` | none | none | none | Selection count updates | n/a |
| Settings | Storage — "Delete selected" | `StorageSection` `handleDelete()` | Confirm `window.confirm`, click | `deleteStorageItems(targets)` (`lib/storage-management.ts`) — removes Storage objects then reconciles metadata rows | `busy` | Storage buckets + attachment/material metadata tables — **CURRENT — SUPABASE** | none | Supabase Storage + Postgres | `toast.success(t("settings.storage.deleted"))`, list reloads | `toast.error(t("settings.storage.deleteError"))`, list still reloaded to reflect partial state |
| Settings | Storage — automatic emergency cleanup | `StorageSection` `useEffect` (`cleanupAttempted` ref) | Passive, triggered once when `usage.emergency_cleanup_needed` is true | `invokeEmergencyCleanup()` (`lib/storage-management.ts:199`) → Edge Function **storage-emergency-cleanup** | `cleanupAttempted` | Edge Function **storage-emergency-cleanup** — **CURRENT — SUPABASE** | none | Server-side deletion per the function's own policy | `toast.success(t("settings.storage.cleanupDone"))`, usage reloaded | `toast.error(t("settings.storage.cleanupError"))` |

---

## 13. Feedback (`/feedback`)

File: `frontend/src/routes/_authenticated/feedback.tsx`.

| Screen | UI element | Component | User action | Frontend handler | Local state | Supabase | Backend/API | Persistence | Success UI | Failure UI |
|---|---|---|---|---|---|---|---|---|---|---|
| Feedback | Category selector (Idea/Bug/General) | `feedback.tsx` | Choose from `Select` | `setCategory(v)` | `category: string` | none | none | none | n/a | n/a |
| Feedback | Message textarea | `feedback.tsx` | Type | `setMessage(e.target.value)`, `setSent(false)` | `message: string` | none | none | none | Live char-count `t("feedback.charCount", ...)`, "too short" hint below `MIN_LENGTH` (10) | n/a |
| Feedback | "Submit" button | `feedback.tsx` `handleSubmit()` | Click | Client length check (`MIN_LENGTH`/`MAX_LENGTH`), then `supabase.functions.invoke("feedback-submit", {body:{message, category, context:{route, user_agent, submitted_at}}})` | `sending`, `sent`, `error` | Edge Function **feedback-submit** → `feedback` table + `feedback-messages` Storage bucket — **CURRENT — SUPABASE** | none | Supabase Postgres (`feedback`) + Storage object | `track({event_name:"feedback_submitted", properties:{category}})`, `toast.success(t("feedback.success.toast"))`, inline `t("feedback.success.saved")` | `setError(t("feedback.error.tooShort", {min}))` (client) or `setError(t("feedback.error.submitFailedGeneric"))` + `console.error` + `trackFailure("feedback_submit_failed", ...)` (server) |

---

## 14. Help (`/help`)

File: `frontend/src/routes/_authenticated/help.tsx`. Entirely static content — no Supabase or backend calls.

| Screen | UI element | Component | User action | Frontend handler | Local state | Supabase | Backend/API | Persistence | Success UI | Failure UI |
|---|---|---|---|---|---|---|---|---|---|---|
| Help | 6 topic cards (Indexing, Grading, Plans, Calendar, Language, Audio) | `help.tsx` `TOPICS` | Passive read | static i18n text (`t(topic.title/body)`) | none | none | none | none | n/a | n/a |
| Help | 7 PDF guide links (one per `LANGUAGES` entry) | `help.tsx` `LANGUAGES.map` | Click a language tile | plain `<a href="/help-guides/alim-user-guide-<code>.pdf" target="_blank">` | none | none | none | static file served from `public/help-guides` | Opens PDF in new tab | Browser-level 404 if the static asset is missing (not handled in-app) |
| Help | Topics list | (same as topic cards above) | — | — | — | — | — | — | — | — |

---

## Notes on cross-cutting handlers

- **Telemetry** (`lib/telemetry.ts` `track`/`trackFailure`) is invoked from many rows above; it always calls `supabase.functions.invoke("activity-log", {body})`, which per the facts handoff writes to `usage_events` and an `activity-logs` Storage object — **CURRENT — SUPABASE**. It is fire-and-forget and never surfaces its own failures to the user.
- **`localizedMessage()` / `UiError`** (`lib/ui-error.ts`) is used in `AuthForm.tsx` to avoid leaking raw (English) Supabase error text into localized toasts; several other screens (`auth.update-password.tsx`, `SettingsSections.tsx` email/password) still show the raw `error.message` from Supabase in some paths, as noted per-row above.
- **Speech (`lib/speech.ts`)** is browser `speechSynthesis` only, ephemeral, never persisted; used identically by Study Chat (§7) and Assistant (§8) "Listen"/"Stop" controls.

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
