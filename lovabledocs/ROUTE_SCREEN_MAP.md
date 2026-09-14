# Route & Screen Map

Every route in `frontend/src/routes/`, its data today, and its future Python-backend dependency.
Auth-gated routes live under `frontend/src/routes/_authenticated/` and are protected by
`frontend/src/routes/_authenticated/route.tsx`.

## Overview table

| URL | Route file | Screen | Auth | Frontend-only possible? |
| --- | --- | --- | --- | --- |
| `/` | `frontend/src/routes/index.tsx` | Welcome + sign in / sign up | No (redirects signed-in users to `/home`) | No (Supabase) |
| `/auth` | `frontend/src/routes/auth.tsx` | Redirect only (`/` when signed out, `/home` when signed in) | No | No (Supabase) |

| `/home` | `_authenticated/home.tsx` | Home dashboard | Yes | Yes (today) |
| `/chat` | `_authenticated/chat.index.tsx` | Chat redirect | Yes | No |
| `/chat/$threadId` | `_authenticated/chat.$threadId.tsx` | Study chat | Yes | No |
| `/school` | `_authenticated/school.index.tsx` | Subjects overview | Yes | Yes (today) |
| `/school/$subject` | `_authenticated/school.$subject.tsx` | Subject dashboard | Yes | Partly |
| `/planner` | `_authenticated/planner.tsx` | Weekly planner | Yes | Yes (except study-plan generation) |
| `/stats` | `_authenticated/stats.tsx` | Statistics | Yes | Yes |
| `/profile` | `_authenticated/profile.tsx` | Student profile | Yes | Yes |
| `/feedback` | `_authenticated/feedback.tsx` | Feedback | Yes | No (Edge Function `feedback-submit`) |
| `/help` | `_authenticated/help.tsx` | Help | Yes | Yes |
| `/settings` | `_authenticated/settings.tsx` | Settings | Yes | Partly |
| `POST /api/chat` | `frontend/src/routes/api/chat.ts` | Server route | Bearer | No |

## Detail

### `/` — Welcome + authentication
- **File:** `frontend/src/routes/index.tsx` · **Auth:** no; `beforeLoad` redirects signed-in users to `/home`
- **Purpose:** the single entry screen. Short welcome copy explaining the study assistant, plus the
  sign-in / sign-up form. The old "School"/"Planner" landing cards no longer live here — the
  post-login dashboard is `/home`.
- **Components:** `AuthForm.tsx`, `ThemeToggle`, `BrandLogos` (GitHub, LinkedIn, Spotify).
- **Data source:**
  - email + password → `supabase.auth.signInWithPassword`
  - username + password → Edge Function `username-login`, then `supabase.auth.setSession`
  - sign-up → Edge Function `username-availability` first (a taken name is reported clearly; if the
    check cannot run, the unique index in the database stays the final authority), then
    `supabase.auth.signUp` with a compulsory `options.data.username`
    (`^[a-z0-9._-]{3,30}$`, lowercased); the auth trigger creates `profiles.username`
  - password reset → `supabase.auth.resetPasswordForEmail` (always email-based; if the user typed a
    username we ask for the email rather than resolving it, to avoid account enumeration)
  - OAuth → `supabase.auth.signInWithOAuth` for `github`, `linkedin_oidc`, `spotify` with
    `redirectTo` = `${origin}/home`
- **Storage:** Supabase session in browser storage.
- **Frontend-only: no.**

### `/auth` — Legacy authentication URL
- **File:** `frontend/src/routes/auth.tsx` · **Auth:** no
- **Purpose:** kept only so old links keep working. It redirects to `/home` when a session exists
  and to `/` otherwise; there is no second auth implementation.


### `/home` — Home dashboard
- **File:** `_authenticated/home.tsx`
- **Purpose:** greeting, live clock, next exam, study time today, school links, notifications.
- **Components:** `AppShell`, `AppHeader`, `LiveClock`, `SchoolLinksSection`, `NotificationCenter`, `States`.
- **Data source:** `AppDataProvider` (assessments, events, links, profile) + `AcademicYearProvider`.
- **Storage:** `localStorage`.
- **Future backend:** optional — `GET /health`, `GET /api/model/status` for the status banner.
- **Endpoints:** `GET /health`, `GET /api/model/status`. **Frontend-only: yes** apart from the banner.

### `/chat` — Chat entry
- **File:** `_authenticated/chat.index.tsx`
- **Purpose:** redirects to the newest thread, or creates "General study session".
- **Data source:** `listThreads` / `createThread` server functions (Supabase).
- **Future backend:** if thread persistence moves to Python, replace with
  `GET /api/chat/threads` + `POST /api/chat/threads`. **Frontend-only: no.**

### `/chat/$threadId` — Study chat
- **File:** `_authenticated/chat.$threadId.tsx` → `frontend/src/components/StudyChat.tsx`
- **Components:** `StudyChat`, `ThreadList`, `ai-elements/conversation|message|prompt-input|shimmer`, `ReactMarkdown`, `ThemeToggle`.
- **Data source today:** `listThreads`, `listMessages`, `createThread`, `deleteThread` server
  functions; `useChat` → authenticated `POST /api/chat` → local Python Context Manager by default.
- **Storage today:** Supabase `threads` / `messages`.
- **Current backend:** FastAPI `POST /api/chat` with compiled context and source provenance;
  optional thread endpoints remain future work.
- **Proposed endpoints:** `POST /api/chat`, `GET /api/chat/threads`, `GET /api/chat/threads/{id}/messages`.
- **Frontend-only: no.**

### `/school` — Subjects overview
- **File:** `_authenticated/school.index.tsx`
- **Purpose:** 15 top-level subject cards, sort/filter, yearly average, failing-subject alerts.
- **Components:** `SubjectCard`, `StatsOverviewPanel`, `GradeDisplay`, `Badges`, `AcademicYearSelector`, `AssessmentDialog`, `TranscriptImportDialog`, `DemoMode`.
- **Data source:** `SUBJECTS` in `frontend/src/lib/mock/subjects.ts` + assessments from `AppDataProvider`,
  aggregated by `frontend/src/lib/grade-math.ts` (`summariseSubjectView`, `summariseYear`).
- **Storage:** static module + `localStorage`.
- **Future backend:** optional `GET /api/subjects` to align subject metadata/materials counts with
  what the RAG index actually contains. Grades stay local.
- **Endpoints:** `GET /api/subjects`. **Frontend-only: yes** (recommended for Stage 1).

### `/school/$subject` — Subject dashboard
- **File:** `_authenticated/school.$subject.tsx`
- **Purpose:** per-subject workspace: grades, materials, learning goals, quiz / mock exam /
  grader / study-plan tools; SPF Bio ↔ Chem segmented switch.
- **Components:** `GradeDisplay`, `MaterialsPanel`, `AssessmentDialog`, `AssessmentActions`, `Breadcrumbs`, `States`, `Badges`.
- **Data source:** `SUBJECTS`, `AppDataProvider` assessments + materials.
- **Storage:** `localStorage`.
- **Future backend:** heavy — subject detail, learning goals, indexed materials, quiz, mock exam,
  grading, subject-scoped chat.
- **Endpoints:** `GET /api/subjects/{subject_id}`, `.../learning-goals`, `.../materials`,
  `POST /api/quiz/generate`, `POST /api/mock-exam/generate`, `POST /api/grade`, `POST /api/chat`,
  `POST /api/import/document`. **Frontend-only: partly** (grades yes, AI tools no).

### `/planner` — Weekly planner
- **File:** `_authenticated/planner.tsx`
- **Components:** `Timetable`, `EventDialog`, `EventDetailDialog`, `States`, conflict panel.
- **Data source / storage:** `AppDataProvider` events + recurrence expansion in `frontend/src/lib/date-utils.ts`; `localStorage`.
- **Future backend:** AI study-plan generation only.
- **Endpoints:** `POST /api/study-plan/generate`. **Frontend-only: yes** except generation.

### `/stats` — Statistics
- **File:** `_authenticated/stats.tsx`
- **Components:** `StatsOverviewPanel`, `GradeDisplay`, SPF three-way toggle.
- **Data source:** derived from assessments via `grade-math.ts`. **Storage:** `localStorage`.
- **Future backend:** none required. **Frontend-only: yes.**

### `/profile` — Profile
- **File:** `_authenticated/profile.tsx` · **Components:** `EditProfileDialog`, `AcademicYearSelector`, `Badges`.
- **Data source / storage:** `AppDataProvider.profile`; `localStorage`.
- **Future backend:** optional profile sync; profile fields (grade level, languages) are sent as
  chat/quiz request context. **Frontend-only: yes.**

### `/feedback` — Feedback
- **File:** `_authenticated/feedback.tsx`
- **Data source:** authenticated `supabase.functions.invoke("feedback-submit", { message, category,
  context })`. The function writes the row to `public.feedback` and a text mirror to the private
  Storage bucket `feedback-messages` at `<user_id>/<YYYY-MM-DD>/<uuid>.txt`.
- **Behaviour:** controlled textarea (10–4000 chars), optional category (idea / bug / general),
  loading, success and error states; the form clears only after a confirmed save. Telemetry records
  `feedback_submitted` / `feedback_submit_failed` — never the message text.
- **Frontend-only: no.**


### `/help` — Help
- **File:** `_authenticated/help.tsx` · static content plus five downloadable A4 PDF user
  guides, one per supported language, served from
  `frontend/public/help-guides/alim-user-guide-{en,de,ru,es,fr}.pdf`. There is no
  "Contact support" CTA. **Frontend-only: yes.**

### `/settings` — Settings
- **File:** `_authenticated/settings.tsx`
- **Data source:** theme, demo mode, academic year, data reset.
- **Future backend:** surface backend mode, base URL, model status (read-only).
- **Endpoints:** `GET /api/model/status`. **Frontend-only: partly.**

The `/diagnostics` route has been removed entirely — there is no environment/state
inspection screen in the frontend. Backend connectivity checks belong in
`/settings` and the `BackendStatusBanner` instead.

### `POST /api/chat` — server route
- **File:** `frontend/src/routes/api/chat.ts`
- **Auth:** `Authorization: Bearer <supabase access token>`, validated with `auth.getClaims`.
- **Today:** verifies thread ownership, inserts the user message, and proxies
  only the current question and identifiers to `POST http://127.0.0.1:8001/api/chat`. It converts
  the response to an AI SDK UI stream, including source metadata, and inserts the assistant message.
- **Failure policy:** returns 503 when the local Qwen backend is unavailable; there is no cloud AI
  fallback.

## `/auth/update-password` (public)

- **Purpose:** set a new password after following the recovery email link.
- **Data source:** `supabase.auth.updateUser({ password })`.

## `/assistant` and `/assistant/$threadId` (protected)

- **Purpose:** general-purpose AI chat, separate from subject tutoring.
- **Data source:** `assistant_threads`, `assistant_messages`,
  `assistant_attachments`, plus the private `chat-attachments` bucket.
- **Note:** assistant replies are produced by the local Python backend once that
  endpoint exists; the frontend only persists user messages and attachments.

## `/settings` (protected, rebuilt)

- **Sections:** Account, Local model, Preferences, Storage.
- **Data source:** `profiles`, `user_preferences`, Supabase Auth,
  `profile-avatars`, `get_storage_usage_status()`, `storage-emergency-cleanup`,
  `assistant_attachments`, `documents`.
