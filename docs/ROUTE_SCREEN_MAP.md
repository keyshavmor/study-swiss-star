# Route & Screen Map

Every route in `src/routes/`, its data today, and its future Python-backend dependency.
Auth-gated routes live under `src/routes/_authenticated/` and are protected by
`src/routes/_authenticated/route.tsx`.

## Overview table

| URL | Route file | Screen | Auth | Frontend-only possible? |
| --- | --- | --- | --- | --- |
| `/` | `src/routes/index.tsx` | Title screen | No | Yes |
| `/auth` | `src/routes/auth.tsx` | Sign in / sign up | No | No (Supabase) |
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
| `POST /api/chat` | `src/routes/api/chat.ts` | Server route | Bearer | No |

## Detail

### `/` — Title screen
- **File:** `src/routes/index.tsx` · **Auth:** no
- **Purpose:** entry screen with "School" and "Planner" cards, theme toggle.
- **Components:** `ThemeToggle`, `LiveClock`, `Button`, `Card`.
- **Data source / storage:** static JSX; theme in `localStorage`.
- **Future backend:** none. **Endpoints:** none. **Can stay frontend-only: yes.**

### `/auth` — Sign in / sign up
- **File:** `src/routes/auth.tsx` · **Auth:** no (redirects when signed in)
- **Components:** `AuthForm.tsx`, `Input`, `Button`.
- **Data source:** `supabase.auth.signInWithPassword` / `signUp` / Google OAuth.
- **Storage:** Supabase session in browser storage.
- **Future backend:** none in Stage 1. Python backend trusts a locally-signed-in user; optional
  `X-Student-Id` header. **Endpoints:** none. **Frontend-only: no.**

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
- **File:** `_authenticated/chat.$threadId.tsx` → `src/components/StudyChat.tsx`
- **Components:** `StudyChat`, `ThreadList`, `ai-elements/conversation|message|prompt-input|shimmer`, `ReactMarkdown`, `ThemeToggle`.
- **Data source today:** `listThreads`, `listMessages`, `createThread`, `deleteThread` server
  functions; streaming via `useChat` → `POST /api/chat` → Lovable AI Gateway.
- **Storage today:** Supabase `threads` / `messages`.
- **Future backend:** **primary integration target.** `POST /api/chat` on FastAPI with RAG,
  sources and exam tips; optional thread endpoints.
- **Proposed endpoints:** `POST /api/chat`, `GET /api/chat/threads`, `GET /api/chat/threads/{id}/messages`.
- **Frontend-only: no.**

### `/school` — Subjects overview
- **File:** `_authenticated/school.index.tsx`
- **Purpose:** 15 top-level subject cards, sort/filter, yearly average, failing-subject alerts.
- **Components:** `SubjectCard`, `StatsOverviewPanel`, `GradeDisplay`, `Badges`, `AcademicYearSelector`, `AssessmentDialog`, `TranscriptImportDialog`, `DemoMode`.
- **Data source:** `SUBJECTS` in `src/lib/mock/subjects.ts` + assessments from `AppDataProvider`,
  aggregated by `src/lib/grade-math.ts` (`summariseSubjectView`, `summariseYear`).
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
- **Data source / storage:** `AppDataProvider` events + recurrence expansion in `src/lib/date-utils.ts`; `localStorage`.
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
- **File:** `src/routes/api/chat.ts`
- **Auth:** `Authorization: Bearer <supabase access token>`, validated with `auth.getClaims`.
- **Today:** verifies thread ownership, inserts the user message, streams from Lovable AI Gateway
  (`openai/gpt-5.6-sol`), inserts the assistant message in `onFinish`.
- **Future:** either (a) becomes a thin proxy to `POST http://localhost:8001/api/chat`, or
  (b) is bypassed entirely by `pythonChatAdapter.ts` calling FastAPI directly. Keep the file as the
  Lovable AI fallback path, enabled only by `VITE_ENABLE_LOVABLE_AI_FALLBACK`.
