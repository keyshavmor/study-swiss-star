# State & Storage Ownership

Where each kind of data lives today, and where it should live once the Python backend exists.

## Ownership table

| Data type | Current file/module | Current owner | Current storage | Lifecycle today | Future owner | Stay in localStorage? | Move to Python? | Stay in Supabase? | Notes / risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Chat threads | `src/lib/chat.functions.ts` (`listThreads`, `createThread`, `deleteThread`) | Supabase | Postgres `threads` | Per user, permanent | Supabase (Stage 1) | No | Optional (Stage 2) | **Yes** | Moving them breaks cross-device history; only move if fully offline use is required |
| Chat messages | `src/routes/api/chat.ts`, `listMessages` | Supabase | Postgres `messages` | Permanent per thread | Supabase transcript + Python AI metadata | No | Partially | Yes | Risk: double-writes if both persist. Decide one writer |
| AI answer metadata (sources, model, retrieval) | — | none | — | — | **Python** | No | Yes | No | New; key `sources` by `message_id` |
| Subject list (15 subjects) | `src/lib/mock/subjects.ts` | Frontend | static module | Compile-time | **Frontend** | n/a | No | No | Backend must never redefine the list |
| Subject languages | `src/lib/mock/subjects.ts` | Frontend | static module | Compile-time | Frontend (sent as request context) | n/a | No | No | Mapped to `de/en/fr` at the API boundary |
| SPF combined info | `src/lib/mock/subjects.ts` + `grade-math.ts` (`summariseSubjectView`) | Frontend | static + derived | Runtime | **Frontend** for display, Python for corpus routing | n/a | No | No | Do not duplicate combining logic in Python |
| Assessments / grades | `src/lib/store/app-data.tsx`, `types.ts` | `AppDataProvider` | `localStorage` | Full CRUD, user-owned | localStorage (Stage 1–2) | **Yes** | No | Stage 3 optional | Risk: single-browser only, cleared with site data |
| Grade math results | `src/lib/grade-math.ts` | Frontend | derived, not stored | Recomputed each render | **Frontend** | n/a | No | No | Frontend stays source of truth for averages/rounding |
| Planner events | `src/lib/store/app-data.tsx` | `AppDataProvider` | `localStorage` | Full CRUD + recurrence | localStorage | **Yes** | No | Stage 3 optional | Recurrence expansion in `src/lib/date-utils.ts` stays local |
| Timetable events | same as planner (`category: "School class"`, recurring) | `AppDataProvider` | `localStorage` | Recurring series | localStorage | Yes | No | No | Used to compute availability for study plans |
| Materials (user-added) | `src/lib/store/app-data.tsx`, `MaterialsPanel` | `AppDataProvider` | `localStorage` | Full CRUD | localStorage | Yes | No | No | Merged with backend list, `origin: "local"` |
| Materials (indexed corpus) | — | none | — | — | **Python** (local files + Chroma) | No | **Yes** | No | Read-only in the UI, `origin: "backend"` |
| School links | `src/lib/store/app-data.tsx`, `SchoolLinksSection` | `AppDataProvider` | `localStorage` | Full CRUD | localStorage | Yes | No | No | No backend need |
| Student profile | `src/lib/store/app-data.tsx`, `EditProfileDialog` | `AppDataProvider` | `localStorage` | Editable | localStorage | Yes | No | Stage 3 optional | `grade_level` and language prefs are sent as request context |
| Demo data | `src/lib/store/demo-data.ts`, `app/DemoMode.tsx` | `AppDataProvider` | `localStorage` | Toggleable, resettable | localStorage | **Yes** | No | No | Must keep working with the backend offline |
| Academic year context | `src/lib/store/academic-year.tsx`, `src/lib/mock/academic.ts` | `AcademicYearProvider` | context + `localStorage` | Session-persistent | Frontend | Yes | No | No | Default 2026–27, Grade 11; sent on every AI request |
| Feedback | `_authenticated/feedback.tsx` | local form | none (toast only) | Ephemeral | **Python** | Queue only on failure | **Yes** | No | Risk: feedback is currently lost |
| AI quizzes | — | none | — | — | **Python** (history) + optional local cache | Cache only | **Yes** | No | Practice results may become local `Assessment` records |
| AI mock exams | — | none | — | — | **Python** | Cache only | **Yes** | No | Same as quizzes |
| Grading results | `grade-math.ts` computes locally today | Frontend | derived | Ephemeral | **Python** for evaluation, localStorage for kept records | Yes (as `Assessment`) | Yes (history) | No | Only saved to grades when the student confirms; `source: "AI practice assessment"` |
| Study plans | planner `generated: true` events | `AppDataProvider` | `localStorage` | Editable | Python generates, localStorage stores | **Yes** | Generation only | No | Never auto-insert without review |
| Source snippets | — | none | — | — | **Python** | No | **Yes** | No | Rendered by `SourceSnippetList` |
| Model / backend health | — | none | — | — | **Python** | No | **Yes** | No | Polled, never persisted |

## Staged migration path

### Stage 1 — Route AI to Python, change nothing else
- Keep the UI, design system, routes and the 15-subject model untouched.
- Keep all prototype data (grades, planner, materials, links, profile, demo mode) in `localStorage`.
- Keep Supabase auth and chat thread/message persistence exactly as-is.
- Add `pythonApiClient.ts`, `pythonApiTypes.ts`, `backendMode.ts`, `pythonChatAdapter.ts`.
- Point chat at `POST http://localhost:8001/api/chat` (non-streaming first).
- Add `GET /health` polling and `BackendStatusBanner`.
- Add `SourceSnippetList` under assistant answers.
- Keep the Lovable AI Gateway path intact but disabled unless `VITE_ENABLE_LOVABLE_AI_FALLBACK=true`.
- **Exit criteria:** chat answers come from Python with sources; app still fully usable offline.

### Stage 2 — Python owns AI artefacts
- Python stores AI outputs locally (SQLite/JSON): quiz history, mock exams, grading history,
  study plans, source snippets, feedback, and AI metadata keyed by `message_id`.
- Wire learning goals, indexed materials and document import to Python.
- Optionally mirror chat transcripts in Python for offline use, with Supabase still authoritative.
- **Exit criteria:** every AI feature works with the network to Lovable Cloud disabled, except sign-in.

### Stage 3 — Cloud role decided
- Keep Supabase for authentication, chat persistence, cross-device sync and multi-user storage; or
- Optionally sync prototype data (grades, planner, materials, profile) to Supabase for backup and
  device switching, with `localStorage` as the offline cache.
- Only then consider removing the Lovable AI Gateway code path.

## Risks to track

| Risk | Mitigation |
| --- | --- |
| `localStorage` loss wipes all grades and planner data | Add export/import JSON in `/settings` before Stage 3 |
| Double persistence of chat messages (Supabase + Python) | Single writer; the other side stores metadata keyed by `message_id` |
| Grade math diverging between TS and Python | Python returns exact `swiss_grade` + `grade_formula`; the frontend owns rounding and colours |
| Subject IDs drifting | IDs are frozen in `SUBJECT_MODEL_AND_LANGUAGE_RULES.md`; backend validates and 404s unknown IDs |
| Backend offline degrading the whole app | All non-AI screens must work without the backend; enforced by the manual test checklist |
