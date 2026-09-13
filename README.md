# Alim's Study Assistant

AI-powered study platform for Swiss Gymnasium students (ages 15–16). The repository contains a
TanStack Start/React frontend, Supabase authentication and transcript storage, and a local Python
context backend that retrieves and budgets the information sent to a local LLM.

---

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [Data & Storage](#data--storage)
  - [Design System](#design-system)
- [Project Structure](#project-structure)
- [Directory & File Tree](#directory--file-tree)
- [Key Conventions](#key-conventions)
- [Running Locally](#running-locally)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [License](#license)

---

## Overview

The app is split into two main layers:

1. **Authenticated Study Assistant**
   - Threaded AI chat compiled by the local Python Context Manager and served by a local
     OpenAI-compatible model.
   - The Lovable AI Gateway remains an explicit legacy/fallback mode.
   - Persistent cloud storage for chat threads and messages via Supabase, scoped to the signed-in user.
   - Google / Email authentication via `@lovable.dev/cloud-auth-js`.

2. **Polished UI Prototype**
   - Local-only interactive mock data for grades, planner, subjects, materials, and profile.
   - Full CRUD for tests, planner events, school links, and materials.
   - Swiss Gymnasium grading engine (6-point scale, rounded to 0.5).
   - 24-hour weekly timetable, planner views, academic stats, and school subject dashboard.
   - Academic year 2026–27 · Grade 11 is the default context.

### School Subjects

The School dashboard shows exactly **15 top-level subjects** for the Swiss Gymnasium curriculum:

Mathematics, Physics, English, History, French, German, Biology, Chemistry, **SPF Biology & Chemistry**, Philosophy, Political Education, Pedagogics and Psychology, Economics, Art, Sport.

SPF Biology & Chemistry is a combined subject: its displayed grade is the average of the underlying SPF Biology and SPF Chemistry components, and it counts as **one** subject in the yearly average. The combined card shows both component averages underneath the main grade.

- **German-language subjects**: German, Biology, Chemistry, SPF Biology & Chemistry, Philosophy, Political Education, Pedagogics and Psychology, Economics, Art, Sport.
- **English-language subjects**: Mathematics, Physics, English, History.
- **French-language subject**: French (Simple French · B1 level).

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start v1 (full-stack React, SSR/SSG) |
| Build Tool | Vite 8 |
| Language | TypeScript 5.8 |
| UI | React 19, Tailwind CSS v4, Radix UI primitives |
| Routing | TanStack Router (file-based) |
| State (server) | TanStack Query + `createServerFn` |
| State (client) | React Context + `localStorage` |
| Backend | Python 3.11+ / FastAPI + TanStack server route |
| Auth | Supabase Auth + `@lovable.dev/cloud-auth-js` |
| AI | Local OpenAI-compatible model; optional Lovable fallback |
| Context storage | Local SQLite |
| Charts | `recharts` |
| Markdown | `react-markdown` |
| Icons | `lucide-react` |

---

## Architecture

### Frontend

The UI is organized around file-based routes under `src/routes/`. Each route file defines its own URL, layout, loader, and meta tags. Shared providers are mounted in the root route (`src/routes/__root.tsx`), which wraps every page in:

- `QueryClientProvider` — TanStack Query cache.
- `ThemeProvider` — light/dark mode and theme toggle.
- `AppDataProvider` — local editable state for the prototype.
- `AcademicYearProvider` — global year/grade context.

Reusable UI lives in `src/components/`:

- `src/components/app/*` — app-specific components (shell, chat, planner, grades, etc.).
- `src/components/ui/*` — shadcn/Radix UI primitives (buttons, dialogs, inputs, etc.).
- `src/components/ai-elements/*` — lower-level AI chat primitives (conversation, message, prompt input, shimmer).

### Backend

TanStack Start uses two backend patterns:

1. **Server Functions** (`createServerFn`)
   - Used for app-internal logic.
   - `src/lib/chat.functions.ts` — CRUD for threads and messages (protected by `requireSupabaseAuth`).

2. **Server Routes** (`createFileRoute` with a `server` block)
   - Used for raw HTTP endpoints.
   - `src/routes/api/chat.ts` — authenticated chat gateway. It persists the current user message,
     forwards only that current request and identifiers to the local Context Manager, converts the
     completed answer to the AI SDK UI stream, and persists the assistant response. The legacy
     Lovable provider is retained behind configuration.

3. **Local Python service** (`backend/app`)
   - `ContextManager` performs intent analysis, hybrid retrieval, reranking, deduplication,
     memory selection, conversation compaction, token budgeting, and final prompt compilation.
   - FastAPI exposes the compiled path on `http://127.0.0.1:8001` and calls the configured local
     OpenAI-compatible model.

### Data & Storage

- **Chat data (persistent)** — `threads` and `messages` tables in Supabase. Row Level Security (RLS) ensures users can only access their own rows.
- **Context data (local)** — document chunks, cached embeddings, student/episodic/conversation
  memory, summaries, working memory, and artifacts live in `.local/alim-context.db` by default.
- **Prototype data (local)** — assessments, planner events, materials, school links, and profile. Stored in `localStorage` via `AppDataProvider` and editable by the user. No backend or cloud sync for these.
- **Demo mode** — A global toggle (`DemoMode`) populates the local state with sample data so the app looks realistic without a backend.

### Swiss Grading Engine

The grade logic is implemented in `src/lib/grade-math.ts` and `src/lib/mock/grades.ts`:

- Swiss 6-point scale: 1 (lowest) to 6 (highest), passing at 4.0.
- Teacher-entered grades can override point-based grades.
- Averages are rounded to the nearest 0.5.
- Failing grades (< 4.0) are rendered in the warning orange `#C96A00`.
- Combined subject summaries (SPF Biology & Chemistry) average the component subject averages and appear as one contribution in the yearly average.

### Design System

The visual direction is a calm, premium, pre-Liquid-Glass Apple aesthetic:

- Light background: `#F7F8FA`
- Dark background: `#0D0E12`
- Primary purple accent: `#6558D9`
- Failing-grade warning: `#C96A00`
- Solid neutral surfaces (no glassmorphism).
- Helvetica Neue / system sans-serif stack.
- 14 px border radius, generous padding, very subtle shadows.
- Custom tokens defined in `src/styles.css` via Tailwind v4 `@theme` and CSS variables.

---

## Project Structure

```
.
├── src/
│   ├── components/          # React components
│   │   ├── ai-elements/     # Low-level AI chat primitives
│   │   ├── app/             # App-specific feature components
│   │   └── ui/              # shadcn/Radix UI primitives
│   ├── hooks/               # Custom React hooks
│   ├── integrations/        # Third-party integrations (Supabase, Lovable AI)
│   ├── lib/                 # Utility libraries, mock data, state, grade math
│   ├── routes/              # TanStack Start file-based routes
│   ├── router.tsx           # Router factory
│   ├── server.ts            # SSR error wrapper
│   ├── start.ts             # TanStack Start app config + middleware
│   └── styles.css           # Global design tokens and Tailwind imports
├── backend/                 # Local Python Context Manager, FastAPI facade, and tests
├── docs/                    # Current architecture and integration documentation
├── lovabledocs/             # Mirror of docs/ for the Lovable editor
├── supabase/                # Supabase configuration
├── public/                  # Static assets
├── package.json             # Dependencies and scripts
├── vite.config.ts           # Vite / TanStack Start config
├── tsconfig.json            # TypeScript configuration
├── eslint.config.js         # ESLint config
└── README.md                # This file
```

---

## Directory & File Tree

### `src/components/`

| Path | Purpose |
|------|---------|
| `AuthForm.tsx` | Sign-in / sign-up form for Google and email auth |
| `StudyChat.tsx` | Main AI chat interface using `useChat` |
| `ThemeToggle.tsx` | Sun/moon light/dark mode toggle |
| `ThreadList.tsx` | Sidebar list of chat threads with CRUD actions |
| `ai-elements/conversation.tsx` | Conversation container wrapper |
| `ai-elements/message.tsx` | Individual AI message rendering |
| `ai-elements/prompt-input.tsx` | Chat input field |
| `ai-elements/shimmer.tsx` | Loading shimmer for streaming responses |
| `app/AcademicYearSelector.tsx` | Global academic year switcher |
| `app/AppHeader.tsx` | Top navigation bar with notifications, clock, and profile |
| `app/AppShell.tsx` | Page layout wrapper with header, sidebar, and mobile nav |
| `app/AssessmentActions.tsx` | Dropdown actions for a grade/test record (move, duplicate, delete) |
| `app/AssessmentDialog.tsx` | Add/Edit test or grade dialog |
| `app/Badges.tsx` | Reusable badges (Demo, Failing, Locked, etc.) |
| `app/Breadcrumbs.tsx` | `PageNav`, `BackLink`, and breadcrumb trails |
| `app/DemoMode.tsx` | Demo mode banner and toggle |
| `app/EditProfileDialog.tsx` | Student profile editor |
| `app/EventDetailDialog.tsx` | Detail view for a planner occurrence |
| `app/EventDialog.tsx` | Add/Edit planner event form with recurrence and scope |
| `app/GradeDisplay.tsx` | Exact/rounded average + performance line chart |
| `app/LiveClock.tsx` | Global 24-hour live clock |
| `app/MaterialsPanel.tsx` | Subject materials list panel |
| `app/MobileNavigation.tsx` | Bottom navigation for mobile |
| `app/NotificationCenter.tsx` | Header bell + notification feed |
| `app/SchoolLinkDialog.tsx` | Add/Edit school link dialog |
| `app/SchoolLinksSection.tsx` | School links tile grid for Home |
| `app/States.tsx` | Empty states and loading states |
| `app/StatsOverviewPanel.tsx` | Academic summary side panel |
| `app/SubjectCard.tsx` | Subject card with grade history, sparkline, and SPF breakdown |
| `app/Timetable.tsx` | 24-hour weekly drag-and-drop timetable |
| `app/TranscriptImportDialog.tsx` | Simulated transcript OCR import flow |

### `src/components/ui/`

Standard shadcn/ui primitives built on Radix UI. Notable files:

| Path | Purpose |
|------|---------|
| `button.tsx` | Primary button variants with custom sizing |
| `dialog.tsx` | Modal/dialog primitives |
| `dropdown-menu.tsx` | Dropdown menu primitives |
| `form.tsx` | `react-hook-form` integration helpers |
| `input.tsx`, `textarea.tsx` | Form inputs |
| `select.tsx` | Select dropdowns |
| `sonner.tsx` | Toast notifications |
| `tabs.tsx` | Tab groups |
| `calendar.tsx` | Date picker calendar |
| `badge.tsx` | Badge variants |
| `chart.tsx` | Recharts wrapper helpers |
| `slider.tsx` | Slider inputs |
| `switch.tsx` | Toggle switches |
| `toggle-group.tsx` | Segmented toggle controls |

### `src/hooks/`

| Path | Purpose |
|------|---------|
| `use-mobile.tsx` | Mobile breakpoint detection |
| `use-theme.tsx` | Light/dark theme provider and hook |

### `src/integrations/`

| Path | Purpose |
|------|---------|
| `lovable/index.ts` | Lovable AI integration helpers |
| `supabase/auth-attacher.ts` | Client-side bearer-token middleware for server functions |
| `supabase/auth-middleware.ts` | `requireSupabaseAuth` server middleware |
| `supabase/client.server.ts` | Server-side Supabase client factory |
| `supabase/client.ts` | Browser Supabase client (auto-generated) |
| `supabase/types.ts` | Supabase generated types (auto-generated) |

### `src/lib/`

| Path | Purpose |
|------|---------|
| `ai-gateway.server.ts` | Lovable AI Gateway provider factory |
| `chat.functions.ts` | Server functions for thread/message CRUD |
| `context-backend.server.ts` | Server-only local Python API client and mode selection |
| `context-backend.types.ts` | Shared context-response/source types |
| `date-utils.ts` | ISO date string helpers (timezone-safe) |
| `error-capture.ts` | Error capture utilities |
| `error-page.ts` | SSR-friendly error HTML page |
| `grade-math.ts` | Swiss grade math (averages, rounding, combined subject logic) |
| `lovable-error-reporting.ts` | Lovable error reporting integration |
| `mock/academic.ts` | Academic years and grade levels |
| `mock/grades.ts` | Seed grade records and rounding helpers |
| `mock/materials.ts` | Subject modes and material mock data |
| `mock/subjects.ts` | Swiss Gymnasium subject list, language mapping, and SPF combined subject |
| `notifications.ts` | Build notification feed from planner events |
| `store/academic-year.tsx` | Global academic year context |
| `store/app-data.tsx` | Editable local state provider |
| `store/demo-data.ts` | Demo data seed generator |
| `store/types.ts` | Data models (Assessment, PlannerEvent, Material, SchoolLink, etc.) |
| `utils.ts` | `cn()` helper and small utilities |

### `src/routes/`

TanStack Start file-based routes.

| Path | URL | Purpose |
|------|-----|---------|
| `__root.tsx` | `/*` | Root layout with providers, auth listener, error boundaries |
| `index.tsx` | `/` | Marketing/title screen with entry cards |
| `auth.tsx` | `/auth` | Sign-in / sign-up page |
| `_authenticated/route.tsx` | `/_authenticated/*` | Protected layout; redirects to `/auth` if not signed in |
| `_authenticated/chat.index.tsx` | `/chat` | Redirects to a new or existing thread |
| `_authenticated/chat.$threadId.tsx` | `/chat/:threadId` | Specific AI chat thread |
| `_authenticated/diagnostics.tsx` | `/diagnostics` | Diagnostics page |
| `_authenticated/feedback.tsx` | `/feedback` | Feedback page |
| `_authenticated/help.tsx` | `/help` | Help page |
| `_authenticated/home.tsx` | `/home` | Main dashboard after login |
| `_authenticated/planner.tsx` | `/planner` | Weekly planner with timetable, month, and list views |
| `_authenticated/profile.tsx` | `/profile` | Student profile and academic summary |
| `_authenticated/school.index.tsx` | `/school` | School subjects overview with grades, filters, and sorting |
| `_authenticated/school.$subject.tsx` | `/school/:subject` | Subject-specific dashboard with study modes and SPF component switch |
| `_authenticated/settings.tsx` | `/settings` | Settings page |
| `_authenticated/stats.tsx` | `/stats` | Academic statistics and records |
| `api/chat.ts` | `/api/chat` | Authenticated local-context chat gateway and optional cloud fallback |

### Root config files

| File | Purpose |
|------|---------|
| `vite.config.ts` | TanStack Start / Vite configuration |
| `tsconfig.json` | TypeScript compiler options |
| `eslint.config.js` | Lint rules |
| `package.json` | Dependencies and npm/bun scripts |
| `bunfig.toml` | Bun configuration |
| `components.json` | shadcn/ui configuration |
| `src/server.ts` | SSR entry point wrapper for error handling |
| `src/start.ts` | TanStack Start app instance and middleware |
| `src/router.tsx` | Router factory with QueryClient |
| `src/routeTree.gen.ts` | Auto-generated route tree (do not edit) |

---

## Key Conventions

- **File-based routing** — every `.tsx` file in `src/routes/` becomes a URL. Layout routes start with `_` and render `<Outlet />`.
- **Server functions** — declared in `src/lib/*.functions.ts` using `createServerFn` from `@tanstack/react-start`. They are thin wrappers; heavy logic lives in imported helpers.
- **Auth protection** — server functions that touch user data use `requireSupabaseAuth`. Public routes that need auth wrap children in `_authenticated/route.tsx`.
- **Local state** — the UI prototype stores data in `localStorage` via `AppDataProvider` so it is editable without a backend.
- **Design tokens** — all colors, spacing, radii, and shadows are defined as semantic CSS variables in `src/styles.css`.
- **No server-only imports in client code** — server-only helpers are named `*.server.ts`; shared
  type declarations live in non-server modules.
- **One context boundary** — only Python's `ContextCompiler` constructs model messages. The
  frontend route does not forward the complete UI transcript to the local model.
- **Combined subjects** — `SCHOOL_SUBJECTS` in `src/lib/mock/subjects.ts` is the canonical top-level list; individual SPF Biology and SPF Chemistry are components, not top-level cards.

---

## Running Locally

The app is a standard TanStack Start project. It can be run with Bun or Node.js (npm/pnpm).

### Prerequisites

- Bun 1.2+ or Node.js 22+
- Python 3.11+ and `uv`
- A local OpenAI-compatible model endpoint (Ollama is the default)
- A Lovable Cloud / Supabase project for the chat feature

### Steps

```bash
# Clone the repository
git clone <this-repository-url>
cd <repository-name>

# Install dependencies
bun install
# or
npm install

# Install and start the local context backend (second terminal)
cd backend
uv sync --extra dev --extra documents
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8001

# Start the frontend from the repository root
cd ..
bun run dev
# or
npm run dev
```

The frontend is available at `http://localhost:8080`; FastAPI documentation is at
`http://127.0.0.1:8001/docs`. School, Planner, Stats, and Profile remain usable from local state
when the Python service or model is offline.

---

## Environment Variables

Supabase variables are managed by Lovable; `ALIM_*` values belong to the local server/backend
environment. Do not commit real secrets.

| Variable | Required for | Description |
|----------|--------------|-------------|
| `SUPABASE_URL` | Chat, Auth | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Chat, Auth | Supabase anon/publishable key |
| `LOVABLE_API_KEY` | Optional fallback | Lovable AI Gateway key |
| `VITE_SUPABASE_URL` | Auth client | Public Supabase URL for the browser |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Auth client | Public Supabase key for the browser |
| `ALIM_AI_BACKEND` | Frontend server | `context` (default) or `lovable` |
| `ALIM_CONTEXT_BACKEND_URL` | Frontend server | Python API URL; default `http://127.0.0.1:8001` |
| `ALIM_ENABLE_LOVABLE_FALLBACK` | Frontend server | Opt-in cloud fallback (`false` by default) |
| `ALIM_CONTEXT_DB` | Python backend | Local SQLite path; default `.local/alim-context.db` |
| `ALIM_LLM_BASE_URL` | Python backend | Local OpenAI-compatible base URL |
| `ALIM_LLM_MODEL` | Python backend | Local model identifier |
| `ALIM_EMBEDDING_MODEL` | Python backend | Optional local embedding model; hashing fallback when unset |

The Supabase client configuration and auth middleware are auto-generated by the Lovable platform; do not edit them manually.

See [`docs/CONTEXT_MANAGER.md`](docs/CONTEXT_MANAGER.md) and `backend/.env.example` for the full
retrieval, memory, budget, and local model configuration.

---

## Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `bun run dev` | Start Vite dev server |
| `build` | `bun run build` | Production build |
| `build:dev` | `bun run build:dev` | Development build |
| `preview` | `bun run preview` | Preview production build |
| `lint` | `bun run lint` | Run ESLint |
| `format` | `bun run format` | Format code with Prettier |
| Python tests | `PYTHONPATH=backend python3 -m unittest discover -s backend/tests -v` | Run context unit/integration tests |

---

## License

This project is private and owned by its creator. It was built with [Lovable](https://lovable.dev).
