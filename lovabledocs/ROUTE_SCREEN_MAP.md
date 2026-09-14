# Route & Screen Map

Every route in `frontend/src/routes/`, its data today, and its future Python-backend dependency.
Auth-gated routes live under `frontend/src/routes/_authenticated/` and are protected by
`frontend/src/routes/_authenticated/route.tsx`.

## Overview table

| URL | Route file | Screen | Auth | Frontend-only possible? |
| --- | --- | --- | --- | --- |
| `/` | `frontend/src/routes/index.tsx` | Title screen | No | Yes |
| `/auth` | `frontend/src/routes/auth.tsx` | Sign in / sign up | No | No (Supabase) |
| `/home` | `_authenticated/home.tsx` | Home dashboard | Yes | Yes (today) |
| `/chat` | `_authenticated/chat.index.tsx` | Chat redirect | Yes | No |
| `/chat/$threadId` | `_authenticated/chat.$threadId.tsx` | Study chat | Yes | No |
| `/school` | `_authenticated/school.index.tsx` | Subjects overview | Yes | Yes (today) |
| `/school/$subject` | `_authenticated/school.$subject.tsx` | Subject dashboard | Yes | Partly |
| `/planner` | `_authenticated/planner.tsx` | Weekly planner | Yes | Yes (except study-plan generation) |
| `/stats` | `_authenticated/stats.tsx` | Statistics | Yes | Yes |
| `/profile` | `_authenticated/profile.tsx` | Student profile | Yes | Yes |
| `/feedback` | `_authenticated/feedback.tsx` | Feedback | Yes | No (should persist) |
| `/help` | `_authenticated/help.tsx` | Help | Yes | Yes |
| `/settings` | `_authenticated/settings.tsx` | Settings | Yes | Partly |
| `/diagnostics` | `_authenticated/diagnostics.tsx` | Diagnostics | Yes | No (needs health) |
| `POST /api/chat` | `frontend/src/routes/api/chat.ts` | Server route | Bearer | No |

## Detail

### `/` — Title screen
- **File:** `frontend/src/routes/index.tsx` · **Auth:** no
- **Purpose:** entry screen with "School" and "Planner" cards, theme toggle.
- **Components:** `ThemeToggle`, `LiveClock`, `Button`, `Card`.
- **Data source / storage:** static JSX; theme in `localStorage`.
- **Future backend:** none. **Endpoints:** none. **Can stay frontend-only: yes.**

### `/auth` — Sign in / sign up
- **File:** `frontend/src/routes/auth.tsx` · **Auth:** no (redirects when signed in)
- **Components:** `AuthForm.tsx`, `Input`, `Button`.
- **Data source:** `supabase.auth.signInWithPassword` / `signUp` / Google, Apple, Azure OAuth.
- **Storage:** Supabase session in browser storage.
- **Backend boundary:** TanStack forwards the access token; FastAPI validates it and derives the
  user UUID from verified `sub`. **Endpoints:** none. **Frontend-only: no.**

### `/home` — Home dashboard
- **File:** `_authenticated/home.tsx`
- **Purpose:** greeting, live clock, next exam, study time today, school links, notifications.
- **Components:** `AppShell`, `AppHeader`, `LiveClock`, `SchoolLinksSection`, `NotificationCenter`, `States`.
- **Data source:** `AppDataProvider` (assessments, events, links, profile) + `AcademicYearProvider`.
- **Storage:** Supabase tables through `AppDataProvider`; UUID-scoped cache for resilience.
- **Future backend:** optional — `GET /health`, `GET /api/model/status` for the status banner.
- **Endpoints:** `GET /health`, `GET /api/model/status`. **Frontend-only: yes** apart from the banner.

### `/chat` — Chat entry
- **File:** `_authenticated/chat.index.tsx`
- **Purpose:** redirects to the newest thread, or creates "General study session".
- **Data source:** `listThreads` / `createThread` server functions (Supabase).
- **Backend:** Supabase remains the permanent thread/message owner. **Frontend-only: no.**

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
- **Storage:** static subject module + Supabase `assessments`.
- **Future backend:** optional `GET /api/subjects` to align subject metadata/materials counts with
  what the RAG index actually contains. Grades persist in Supabase; grade math stays frontend-local.
- **Endpoints:** `GET /api/subjects`. **Frontend-only: yes** except persistent data hydration.

### `/school/$subject` — Subject dashboard
- **File:** `_authenticated/school.$subject.tsx`
- **Purpose:** per-subject workspace: grades, materials, learning goals, quiz / mock exam /
  grader / study-plan tools; SPF Bio ↔ Chem segmented switch.
- **Components:** `GradeDisplay`, `MaterialsPanel`, `AssessmentDialog`, `AssessmentActions`, `Breadcrumbs`, `States`, `Badges`.
- **Data source:** `SUBJECTS`, `AppDataProvider` assessments + materials.
- **Storage:** private Supabase Storage plus `documents`, `document_chunks`, and `assessments`.
- **Future backend:** heavy — subject detail, learning goals, indexed materials, quiz, mock exam,
  grading, subject-scoped chat.
- **Endpoints:** `GET /api/subjects/{subject_id}`, `.../learning-goals`, `.../materials`,
  `POST /api/quiz/generate`, `POST /api/mock-exam/generate`, `POST /api/grade`, `POST /api/chat`,
  `POST /api/import/document`. **Frontend-only: partly** (grades yes, AI tools no).

### `/planner` — Weekly planner
- **File:** `_authenticated/planner.tsx`
- **Components:** `Timetable`, `EventDialog`, `EventDetailDialog`, `States`, conflict panel.
- **Data source / storage:** Supabase-backed `AppDataProvider` events; recurrence expansion remains in `date-utils.ts`.
- **Future backend:** AI study-plan generation only.
- **Endpoints:** `POST /api/study-plan/generate`. **Frontend-only: yes** except generation.

### `/stats` — Statistics
- **File:** `_authenticated/stats.tsx`
- **Components:** `StatsOverviewPanel`, `GradeDisplay`, SPF three-way toggle.
- **Data source:** derived from Supabase-backed assessments via `grade-math.ts`.
- **Future backend:** none required. **Frontend-only: yes.**

### `/profile` — Profile
- **File:** `_authenticated/profile.tsx` · **Components:** `EditProfileDialog`, `AcademicYearSelector`, `Badges`.
- **Data source / storage:** `AppDataProvider.profile`; canonical `profiles` row with UUID cache.
- **Backend:** profile synchronization is implemented; profile fields (grade level, languages) are sent as
  chat/quiz request context. **Frontend-only: yes.**

### `/feedback` — Feedback
- **File:** `_authenticated/feedback.tsx`
- **Data source today:** local form, toast only.
- **Future backend:** `POST /api/feedback` so feedback can tune retrieval/prompts.
- **Frontend-only: no** (should persist).

### `/help` — Help
- **File:** `_authenticated/help.tsx` · static content. **Frontend-only: yes.**

### `/settings` — Settings
- **File:** `_authenticated/settings.tsx`
- **Data source:** theme, demo mode, academic year, data reset.
- **Future backend:** surface backend mode, base URL, model status (read-only).
- **Endpoints:** `GET /api/model/status`. **Frontend-only: partly.**

### `/diagnostics` — Diagnostics
- **File:** `_authenticated/diagnostics.tsx`
- **Purpose:** environment/state inspection; the natural home for backend connectivity checks.
- **Endpoints:** `GET /health`, `GET /api/model/status`. **Frontend-only: no.**

### `POST /api/chat` — server route
- **File:** `frontend/src/routes/api/chat.ts`
- **Auth:** `Authorization: Bearer <supabase access token>`, validated with `auth.getClaims`.
- **Today:** verifies thread ownership, inserts the user message, and proxies
  only the current question and identifiers to `POST http://127.0.0.1:8001/api/chat`. It converts
  the response to an AI SDK UI stream, including source metadata, and inserts the assistant message.
- **Failure policy:** returns 503 when the local Qwen backend is unavailable; there is no cloud AI
  fallback.
