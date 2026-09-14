# Component Tree

Classification of every significant component in the existing frontend.

## Legend

| Tag | Meaning |
| --- | --- |
| 🟦 UI | Pure presentational, no data access |
| 🟪 LAYOUT | Layout / navigation shell |
| 🟨 LOCAL | Reads/writes `AppDataProvider` (localStorage / mock data) |
| 🟩 AUTH | Supabase auth / session |
| 🟧 EDITOR | Lovable project/auth integration (not AI generation) |
| 🟥 PY | Python-backend-connected or planned |
| 📊 GRADE | Grading / statistics |
| 📄 DOC | Material / document handling |

## Tree

```
__root.tsx                                 🟪 LAYOUT  providers: Query, Theme, AppData, AcademicYear, Toaster
├── routes/index.tsx                       🟦 UI      welcome + auth screen
│   ├── ThemeToggle.tsx                    🟦 UI
│   └── app/LiveClock.tsx                  🟦 UI      24h clock
├── routes/auth.tsx                        🟩 AUTH
│   └── AuthForm.tsx                       🟩 AUTH
└── _authenticated/route.tsx               🟩 AUTH    session gate → /auth
    ├── app/AppShell.tsx                   🟪 LAYOUT  (+ 🟥 PY: hosts BackendStatusBanner)
    │   ├── app/AppHeader.tsx              🟪 LAYOUT  🟨 LOCAL (profile, year) 🟥 PY (model chip)
    │   │   ├── app/Breadcrumbs.tsx        🟦 UI
    │   │   ├── app/AcademicYearSelector.tsx 🟨 LOCAL
    │   │   ├── app/LiveClock.tsx          🟦 UI
    │   │   ├── app/NotificationCenter.tsx 🟨 LOCAL
    │   │   └── ThemeToggle.tsx            🟦 UI
    │   ├── app/MobileNavigation.tsx       🟪 LAYOUT
    │   ├── app/DemoMode.tsx               🟨 LOCAL
    │   └── app/BackendStatusBanner.tsx    🟥 PY      (to be created)
    ├── home.tsx                           🟨 LOCAL
    │   ├── app/SchoolLinksSection.tsx     🟨 LOCAL
    │   │   └── app/SchoolLinkDialog.tsx   🟨 LOCAL
    │   ├── app/NotificationCenter.tsx     🟨 LOCAL
    │   └── app/States.tsx                 🟦 UI
    ├── school.index.tsx                   🟨 LOCAL 📊 GRADE (🟥 PY: GET /api/subjects)
    │   ├── app/SubjectCard.tsx            🟨 LOCAL 📊 GRADE
    │   ├── app/StatsOverviewPanel.tsx     📊 GRADE
    │   ├── app/GradeDisplay.tsx           📊 GRADE
    │   ├── app/Badges.tsx                 🟦 UI
    │   ├── app/AssessmentDialog.tsx       🟨 LOCAL 📊 GRADE
    │   └── app/TranscriptImportDialog.tsx 📄 DOC 🟨 LOCAL (🟥 PY: /api/import/document)
    ├── school.$subject.tsx                🟨 LOCAL 📊 GRADE 🟥 PY
    │   ├── app/GradeDisplay.tsx           📊 GRADE
    │   ├── app/MaterialsPanel.tsx         📄 DOC 🟨 LOCAL 🟥 PY
    │   ├── app/AssessmentActions.tsx      🟨 LOCAL
    │   ├── app/AssessmentDialog.tsx       🟨 LOCAL 📊 GRADE
    │   ├── (quiz / mock exam / grader / study-plan panels) 🟥 PY  (to be created)
    │   └── app/SourceSnippetList.tsx      🟥 PY      (implemented for chat; reusable here)
    ├── planner.tsx                        🟨 LOCAL (🟥 PY: study-plan generation)
    │   ├── app/Timetable.tsx              🟨 LOCAL
    │   ├── app/EventDialog.tsx            🟨 LOCAL
    │   └── app/EventDetailDialog.tsx      🟨 LOCAL
    ├── stats.tsx                          📊 GRADE 🟨 LOCAL
    │   ├── app/StatsOverviewPanel.tsx     📊 GRADE
    │   └── app/GradeDisplay.tsx           📊 GRADE
    ├── profile.tsx                        🟨 LOCAL
    │   └── app/EditProfileDialog.tsx      🟨 LOCAL
    ├── settings.tsx                       🟨 LOCAL (🟥 PY: model status, backend mode)
    ├── feedback.tsx                       🟦 UI → 🟥 PY (POST /api/feedback)
    ├── help.tsx                           🟦 UI
    ├── diagnostics.tsx                    🟨 LOCAL → 🟥 PY (health + model status)
    ├── chat.index.tsx                     🟩 AUTH (thread bootstrap)
    └── chat.$threadId.tsx                 🟥 PY
        └── StudyChat.tsx                  🟥 PY 🟩 AUTH
            ├── ThreadList.tsx             🟩 AUTH (Supabase threads)
            ├── ai-elements/conversation.tsx 🟦 UI
            ├── ai-elements/message.tsx      🟦 UI
            ├── ai-elements/prompt-input.tsx 🟦 UI
            ├── ai-elements/shimmer.tsx      🟦 UI
            └── app/SourceSnippetList.tsx    🟥 PY

components/ui/*                            🟦 UI      shadcn/Radix primitives, never data-aware
```

## Major component detail

### `AuthForm.tsx` — 🟩 AUTH
- **Purpose:** email/password sign-in and sign-up, password reset, and GitHub / LinkedIn / Spotify OAuth; redirect after auth.
- **Props:** none (route-level).
- **Data source:** `supabase.auth` from `frontend/src/integrations/supabase/client.ts`.
- **Future backend:** none. Python never sees credentials.
- **Integration notes:** do not modify. If local demo without auth is required, add a separate
  guest path — never weaken the `_authenticated` gate.

### `StudyChat.tsx` — 🟥 PY
- **Purpose:** full chat shell: sidebar, thread dialog, transcript, composer, sign out.
- **Props:** `{ threadId?: string }`.
- **Data source:** `listThreads`/`listMessages`/`createThread`/`deleteThread` server fns (Supabase);
  `useChat` + `DefaultChatTransport({ api: "/api/chat" })` with a custom `fetch` that attaches the
  Supabase bearer token.
- **Current backend:** the existing transport calls the authenticated TanStack route. That route
  proxies to Python and passes thread, subject, academic-year and grade-level context; the response
  carries `data-context-metadata` for sources/model/retrieval details.
- **Integration notes:** the single highest-value edit point. Keep `Conversation`, `Message`,
  `PromptInput`, `Shimmer`, markdown rendering and empty state exactly as they are.

### `ThreadList.tsx` — 🟩 AUTH
- **Purpose:** sidebar thread list with active highlight and delete.
- **Props:** `{ threads: Thread[]; activeThreadId?: string; onDelete: (id) => void; isLoading: boolean }`.
- **Data source:** threads passed down from `StudyChat` (Supabase).
- **Future backend:** unchanged in Stage 1; only the fetcher changes if threads move to Python.
- **Integration notes:** `Thread` currently has `{id, title, subject, updated_at}` — map
  `subject → subject_id` in the client rather than changing this component.

### `ai-elements/*` — 🟦 UI
- `conversation.tsx` (scroll container + scroll button), `message.tsx` (bubble + role styling),
  `prompt-input.tsx` (textarea, submit with `status`), `shimmer.tsx` (loading text).
- **Data source:** props only, transport-agnostic.
- **Future backend:** none — they work identically with Python responses.
- **Integration notes:** render `SourceSnippetList` as a sibling below `MessageContent`; do not
  modify these primitives.

### `app/AppShell.tsx` — 🟪 LAYOUT
- **Purpose:** page frame: header, mobile nav, demo banner, content slot.
- **Props:** `{ title, breadcrumbs?, actions?, children }`.
- **Data source:** context providers only.
- **Future backend:** hosts `BackendStatusBanner`.
- **Integration notes:** single mount point for the health banner — add it once here, not per route.

### `app/AppHeader.tsx` — 🟪 LAYOUT / 🟨 LOCAL
- **Purpose:** title, breadcrumbs, academic-year selector, clock, notifications, theme toggle.
- **Data source:** `AppDataProvider`, `AcademicYearProvider`.
- **Future backend:** optional compact model-status chip.

### `app/SubjectCard.tsx` — 🟨 LOCAL / 📊 GRADE
- **Purpose:** one of the 15 subject cards: average, latest grade, trend, sparkline, expandable
  grade history, SPF component breakdown, next exam, material status.
- **Props:** subject metadata + derived summary (`CombinedSummary` from `grade-math.ts`).
- **Data source:** `SUBJECTS` + assessments from `AppDataProvider`.
- **Future backend:** optional indexed-material count from `GET /api/subjects`.
- **Integration notes:** must keep showing SPF as exactly one card with both component averages.

### `app/MaterialsPanel.tsx` — 📄 DOC / 🟨 LOCAL / 🟥 PY
- **Purpose:** sectioned material list (Learning Material, Syllabus, Learning Goals, Grading
  Criteria, Online Sources, Archived) with CRUD.
- **Data source:** `AppDataProvider.materials`.
- **Future backend:** merge `GET /api/subjects/{id}/materials`; add upload via
  `POST /api/import/document`.
- **Integration notes:** discriminate with `origin: "local" | "backend"`; backend items are
  read-only and show index status/chunk counts.

### `app/GradeDisplay.tsx` — 📊 GRADE
- **Purpose:** exact vs rounded average, performance line chart, failing colouring.
- **Data source:** derived from `Assessment[]` via `grade-math.ts`.
- **Future backend:** none — the frontend stays the source of truth for rounding and colours.
- **Integration notes:** reuse for AI grading results so display rules stay consistent.

### `app/StatsOverviewPanel.tsx` — 📊 GRADE
- **Purpose:** yearly metrics, trend charts, subject ranking; SPF counted once.
- **Data source:** `summariseYear` over local assessments.
- **Future backend:** none.

### `app/Timetable.tsx` — 🟨 LOCAL
- **Purpose:** 24-hour weekly grid with categories, conflicts, travel time.
- **Data source:** `AppDataProvider` events + `date-utils.occurrencesInRange`.
- **Future backend:** supplies `available_slots` to `POST /api/study-plan/generate`.

### `app/TranscriptImportDialog.tsx` — 📄 DOC / 🟨 LOCAL
- **Purpose:** simulated OCR → review → confirm import of transcript grades.
- **Data source:** simulated parse, writes `Assessment` records with `importedFrom`.
- **Future backend:** real parsing via `POST /api/import/document` with a transcript mode.
- **Integration notes:** keep the review step; never write grades without confirmation.

### `app/DemoMode.tsx` — 🟨 LOCAL
- **Purpose:** demo-data toggle + banner, seeded from `frontend/src/lib/store/demo-data.ts`.
- **Future backend:** must keep working with the backend offline; also gates mock AI answers.

### `app/States.tsx` — 🟦 UI
- **Purpose:** shared loading / empty / error presentational states.
- **Integration notes:** reuse for every Python-backed panel so loading and error styling stays
  consistent; add an "offline" variant rather than inventing new one-off states.

### `app/NotificationCenter.tsx` — 🟨 LOCAL
- **Purpose:** clickable notifications derived from upcoming exams/deadlines, read tracking.
- **Data source:** `AppDataProvider`.
- **Future backend:** optional — backend could suggest study reminders in Stage 2.

## Assistant and settings components

```
src/components/assistant/AssistantChat.tsx     general assistant workspace
  ├── conversation sidebar (new / rename / delete)
  ├── message history + attachment chips
  └── composer (text + file picker, client-side size validation)

src/components/app/SettingsSections.tsx
  ├── AccountSection        profiles + Supabase Auth + profile-avatars
  ├── PreferencesSections   local Qwen model + preference switches
  └── StorageSection        usage RPC, filters, multi-select deletion
```

Data access helpers: `src/lib/assistant-data.ts`, `src/lib/account-data.ts`,
`src/lib/storage-management.ts`.
