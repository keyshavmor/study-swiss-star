# State & Storage Ownership

Where each kind of data lives today, and where it should live once the Python backend exists.

## Ownership table

| Data type | Current file/module | Current owner | Current storage | Lifecycle today | Future owner | Stay in localStorage? | Move to Python? | Stay in Supabase? | Notes / risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Chat threads | `frontend/src/lib/chat.functions.ts` (`listThreads`, `createThread`, `deleteThread`) | Supabase | Postgres `threads` | Per user, permanent | Supabase (Stage 1) | No | Optional (Stage 2) | **Yes** | Moving them breaks cross-device history; only move if fully offline use is required |
| Chat messages | `frontend/src/routes/api/chat.ts`, `listMessages` | Supabase | Postgres `messages` | Permanent display transcript | Supabase display transcript + Python context mirror | No | Context mirror | Yes | TanStack is the only Supabase writer; Python's mirror supports compaction/retrieval |
| AI answer metadata (sources, model, retrieval) | Python response + AI SDK data part | Python/UI message | SQLite context + Supabase message `parts` | Per answer | **Python** | No | Yes | Yes, inside message parts | Restored with the stored UI message |
| Context memories and summaries | `backend/app/context/*` | Python | Local SQLite | Persistent/expiry by type | **Python** | No | Yes | No | Student, episodic, conversation, working, and artifact memory are separate tables |
| Subject list (15 subjects) | `frontend/src/lib/mock/subjects.ts` | Frontend | static module | Compile-time | **Frontend** | n/a | No | No | Backend must never redefine the list |
| Subject languages | `frontend/src/lib/mock/subjects.ts` | Frontend | static module | Compile-time | Frontend (sent as request context) | n/a | No | No | Mapped to `de/en/fr` at the API boundary |
| SPF combined info | `frontend/src/lib/mock/subjects.ts` + `grade-math.ts` (`summariseSubjectView`) | Frontend | static + derived | Runtime | **Frontend** for display, Python for corpus routing | n/a | No | No | Do not duplicate combining logic in Python |
| Assessments / grades | `frontend/src/lib/store/app-data.tsx`, `types.ts` | `AppDataProvider` | `localStorage` | Full CRUD, user-owned | localStorage (Stage 1–2) | **Yes** | No | Stage 3 optional | Risk: single-browser only, cleared with site data |
| Grade math results | `frontend/src/lib/grade-math.ts` | Frontend | derived, not stored | Recomputed each render | **Frontend** | n/a | No | No | Frontend stays source of truth for averages/rounding |
| Planner events | `frontend/src/lib/store/app-data.tsx` | `AppDataProvider` | `localStorage` | Full CRUD + recurrence | localStorage | **Yes** | No | Stage 3 optional | Recurrence expansion in `frontend/src/lib/date-utils.ts` stays local |
| Timetable events | same as planner (`category: "School class"`, recurring) | `AppDataProvider` | `localStorage` | Recurring series | localStorage | Yes | No | No | Used to compute availability for study plans |
| Materials (user-added) | `frontend/src/lib/store/app-data.tsx`, `MaterialsPanel` | `AppDataProvider` | `localStorage` | Full CRUD | localStorage | Yes | No | No | Merged with backend list, `origin: "local"` |
| Materials (indexed corpus) | `backend/app/services/documents.py` | Python | Local SQLite chunks + cached embeddings | Persistent | **Python** | No | **Yes** | No | Text ingestion API is live; PDF/DOCX parser service is optional-dependency based |
| School links | `frontend/src/lib/store/app-data.tsx`, `SchoolLinksSection` | `AppDataProvider` | `localStorage` | Full CRUD | localStorage | Yes | No | No | No backend need |
| Student profile | `frontend/src/lib/store/app-data.tsx`, `EditProfileDialog` | `AppDataProvider` | `localStorage` | Editable | localStorage | Yes | No | Stage 3 optional | `grade_level` and language prefs are sent as request context |
| Academic year context | `frontend/src/lib/store/academic-year.tsx`, `frontend/src/lib/mock/academic.ts` | `AcademicYearProvider` | context + `localStorage` | Session-persistent | Frontend | Yes | No | No | Default 2026–27, Grade 11; sent on every AI request |
| Feedback | `_authenticated/feedback.tsx` | controlled form | `public.feedback` + private `feedback-messages` bucket via `feedback-submit` | Persistent | **Supabase** | No | No | No | Form clears only after a confirmed save |
| Activity / error events | `frontend/src/lib/telemetry.ts` | none (fire-and-forget) | `public.usage_events` + private `activity-logs` bucket via `activity-log` | Persistent | **Supabase** | No | No | No | Sanitized, bounded payloads; never tokens, form or chat content |
| Google Calendar provider token | `frontend/src/lib/google-calendar.ts` | module + `sessionStorage` | `sessionStorage` only | Cleared on sign-out/disconnect | Google | No | No | No | Never stored in the database, `localStorage` or telemetry |
| Google Calendar events | `GoogleCalendarCard`, planner views | render-time merge only | not persisted | Per session | Google Calendar v3 | No | No | No | Read-only; never merged into editable planner state |
| AI quizzes | — | none | — | — | **Python** (history) + optional local cache | Cache only | **Yes** | No | Practice results may become local `Assessment` records |
| AI mock exams | — | none | — | — | **Python** | Cache only | **Yes** | No | Same as quizzes |
| Grading results | `grade-math.ts` computes locally today | Frontend | derived | Ephemeral | **Python** for evaluation, localStorage for kept records | Yes (as `Assessment`) | Yes (history) | No | Only saved to grades when the student confirms; `source: "AI practice assessment"` |
| Study plans | planner `generated: true` events | `AppDataProvider` | `localStorage` | Editable | Python generates, localStorage stores | **Yes** | Generation only | No | Never auto-insert without review |
| Source snippets | FastAPI chat response | Python | Compiled response + Supabase UI message parts | Per answer | **Python** | No | **Yes** | In message parts | Rendered by `SourceSnippetList` |
| Model / backend health | — | none | — | — | **Python** | No | **Yes** | No | Polled, never persisted |
| Web result cache | `backend/app/context/web.py` | Python | `app-data/context/alim-context.db` | 24-hour TTL by default | **Python** | No | Yes | No | Query, URL, provider, fetch time; internet disclosure is user/config controlled |
| Qwen model weights | `models/Qwen3.8-27B/` | Local runtime | GGUF | Operator-managed | **llama.cpp** | No | No | No | Ignored by Git; validated before every managed startup |
| App language | `frontend/src/lib/i18n/provider.tsx` | `I18nProvider` | Supabase `user_preferences.preferences.app_language` (authoritative) + `localStorage alim.app_language` (flash-prevention cache only) | Persistent | Supabase | Cache only | No | **Yes** | Signed-out welcome screen reads the localStorage cache only |
| Assistant audio playback | `frontend/src/lib/speech.ts` | browser Web Speech API | not persisted | Ephemeral per message | n/a | No | No | No | Never uploaded or stored; graceful unavailable state |
| Media retention queue (assistant output media) | `frontend/src/lib/media-retention.ts` | Supabase | `public.media_retention_queue` + private `assistant-descriptors` bucket | Descriptor first, original deletable after 30 min | **Python (future)** for descriptor generation/cleanup | No | Yes (future) | Yes | Never applies to ordinary user study uploads |

## Staged migration path

### Stage 1 — Route chat context to Python (implemented)
- Keep the UI, design system, routes and the 15-subject model untouched.
- Keep all prototype data (grades, planner, materials, links, profile) in `localStorage`. There is no demo mode; `DemoMode.tsx` and the `demoMode` store flag were removed.
- Keep Supabase auth and chat thread/message persistence exactly as-is.
- `context-backend.server.ts` keeps the existing authenticated chat route and proxies to Python.
- `SourceSnippetList` renders provenance returned with assistant data parts.
- The authenticated frontend route always proxies AI requests to FastAPI and local Qwen; it returns 503 when that backend is unavailable.
- Health polling/banner remains to be implemented.

### Stage 2 — Python owns additional AI artefacts (partly implemented)
- Python stores context artifacts, source chunks, memories, events, and conversation summaries in
  SQLite. Quiz history, mock exams, grading history, study plans, and feedback remain future work.
- Wire learning goals, indexed materials and document import to Python.
- Optionally mirror chat transcripts in Python for offline use, with Supabase still authoritative.
- **Exit criteria:** every AI feature works without a cloud-generation service; sign-in and Supabase persistence remain separate network dependencies.

### Stage 3 — Storage cloud role decided
- Keep Supabase for authentication, chat persistence, cross-device sync and multi-user storage; or
- Optionally sync prototype data (grades, planner, materials, profile) to Supabase for backup and
  device switching, with `localStorage` as the offline cache.

## Risks to track

| Risk | Mitigation |
| --- | --- |
| `localStorage` loss wipes all grades and planner data | Add export/import JSON in `/settings` before Stage 3 |
| Double persistence of chat messages (Supabase + Python) | Single writer; the other side stores metadata keyed by `message_id` |
| Grade math diverging between TS and Python | Python returns exact `swiss_grade` + `grade_formula`; the frontend owns rounding and colours |
| Subject IDs drifting | IDs are frozen in `SUBJECT_MODEL_AND_LANGUAGE_RULES.md`; backend validates and 404s unknown IDs |
| Backend offline degrading the whole app | All non-AI screens must work without the backend; enforced by the manual test checklist |

## Supabase-backed state (implemented)

| State | Location |
| --- | --- |
| Account profile, avatar path, contact details, nationality | `profiles` |
| Model choice + preference switches | `user_preferences.preferences` |
| General assistant threads/messages | `assistant_threads`, `assistant_messages` |
| Assistant attachment metadata | `assistant_attachments` |
| Avatar images | private `profile-avatars` bucket |
| Assistant attachments | private `chat-attachments` bucket |
| Study materials | private `user-materials` bucket + `documents` |

Grades, planner items and materials list still live in
`localStorage` via `src/lib/store/app-data.tsx`; that migration is separate
work. Storage deletion always goes through the Storage API first and only then
reconciles metadata; `storage.objects` is never written directly, and paths are
verified to start with the signed-in user's id.
