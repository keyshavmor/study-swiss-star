> **DEPRECATED — ARCHIVED.** This document is historical and may contain
> statements that no longer match the implementation. Canonical replacement:
> `docs/frontend/UI_EVENT_TO_SYSTEM_MAP.md`.
> Do not use this file for backend implementation decisions.

# UI → Backend Mapping

The primary integration file. One row per user-facing action that needs AI, persistence or
backend intelligence. "Now" = current implementation in the repo. "Later" = target owner.

Legend for **Owner (later)**: `PY` = Python FastAPI, `SB` = Supabase, `LS` = localStorage /
`AppDataProvider`, `FE` = pure frontend computation.

---

## 1. Chat

| Field | Ask AI chat question |
| --- | --- |
| Route | `/chat/$threadId`, later also `/school/$subject` |
| Component | `frontend/src/components/StudyChat.tsx` (`PromptInput` → `chat.sendMessage`) |
| Action | Student submits a question |
| Now | `useChat` + `DefaultChatTransport` → authenticated TanStack `POST /api/chat` → local FastAPI Context Manager → preloaded Qwen runtime |
| Data source now | Supabase display transcript + local SQLite context memory |
| Owner later | **PY** (already owns prompt construction) |
| Endpoint | `POST /api/chat` (FastAPI) |
| Request | `thread_id, subject_id, component_subject_id, language, academic_year, grade_level, question, learning_goal_id, material_ids, top_k, include_sources, stream` |
| Response | `thread_id, message_id, answer, sources[], exam_tip, used_model, retrieval_summary, language, created_at` |
| Loading | `chat.status === "submitted" \| "streaming"` → existing `Shimmer` "Thinking…" + disabled composer |
| Error | Existing `onError` toast; a Python/model outage returns 503 and never changes model providers |
| Empty | Existing "Ready to study?" panel |
| Mock fallback | Not implemented |

| Field | Stream / display AI answer |
| --- | --- |
| Route | `/chat/$threadId` |
| Component | `ai-elements/message.tsx`, `ReactMarkdown` in `StudyChat.tsx` |
| Now | AI SDK UI message stream from `/api/chat` |
| Owner later | **PY** |
| Endpoint | Current Python call uses `stream:false`; TanStack converts the completed result into AI SDK UI stream parts |
| Request | as above | 
| Response | token deltas, then a final event with `sources`, `exam_tip`, `used_model` |
| Loading | token-by-token render; shimmer until first token |
| Error | partial answer kept, error toast, "Regenerate" affordance |
| Empty | n/a |
| Mock fallback | simulated chunked stream |
| Note | Start with `stream: false` (plain JSON) to unblock integration; add SSE second. |

| Field | Create chat thread |
| --- | --- |
| Route | `/chat`, `/chat/$threadId` |
| Component | `StudyChat.tsx` new-session dialog, `chat.index.tsx` auto-create |
| Now | `createThread` server fn → Supabase `threads` |
| Data source now | Supabase |
| Owner later | **SB in Stage 1** (unchanged); optionally PY in Stage 2 |
| Endpoint (if moved) | `POST /api/chat/threads` `{subject_id, component_subject_id, title}` |
| Response | `{thread_id, title, subject_id, created_at}` |
| Loading | dialog button disabled + spinner | Error: toast | Empty: n/a |
| Mock fallback | thread created in `localStorage` |

| Field | Load chat thread / list threads |
| --- | --- |
| Component | `ThreadList.tsx`, `StudyChat.tsx` `useQuery(["threads"])`, `useQuery(["messages", id])` |
| Now | `listThreads` / `listMessages` server fns → Supabase |
| Owner later | **SB in Stage 1** |
| Endpoint (if moved) | `GET /api/chat/threads`, `GET /api/chat/threads/{thread_id}/messages` |
| Loading | existing skeleton rows in `ThreadList` | Error: toast + retry | Empty: "No sessions yet." |
| Mock fallback | demo threads from `localStorage` |

| Field | Save chat message |
| --- | --- |
| Now | `frontend/src/routes/api/chat.ts` inserts the user message before streaming and the assistant message in `onFinish` |
| Owner later | **SB (transcript) + PY (AI metadata)** — Python stores `sources`, `used_model`, `retrieval_summary` alongside `message_id` |
| Endpoint | implicit in `POST /api/chat`; no separate call |
| Risk | double-writes if both sides persist. Decide once — see `OPEN_QUESTIONS_FOR_BACKEND.md` Q1. |

| Field | Show RAG source snippets |
| --- | --- |
| Route | `/chat/$threadId`, `/school/$subject` |
| Component | `frontend/src/components/app/SourceSnippetList.tsx` under each assistant message |
| Now | Implemented using the `data-context-metadata` AI SDK part |
| Owner later | **PY** |
| Endpoint | `sources[]` on the `POST /api/chat` response |
| Response fields | `source_id, material_id, material_name, section, page, snippet, score, url` |
| Loading | collapsed placeholder while streaming | Error: hide the block, never break the answer | Empty: "No sources used for this answer." |
| Mock fallback | two fake snippets labelled "Demo source" |

---

## 2. Subjects & materials

| Field | Load subjects |
| --- | --- |
| Route | `/school`, `/stats` |
| Component | `school.index.tsx`, `SubjectCard.tsx` |
| Now | static `SUBJECTS` in `frontend/src/lib/mock/subjects.ts` + grades from `AppDataProvider` |
| Owner later | **FE for display, PY for index metadata** |
| Endpoint | `GET /api/subjects` |
| Response | `[{subject_id, display_name, language, components[], indexed_materials, learning_goal_count}]` |
| Loading | existing card skeletons | Error: fall back to the static list silently | Empty: never (static list) |
| Note | The 15-subject model stays frontend-owned; the backend must not be able to change it. |

| Field | Load subject details |
| --- | --- |
| Route | `/school/$subject` · Component `school.$subject.tsx` |
| Now | static metadata + local assessments |
| Owner later | **PY** for corpus/index info, **LS** for grades |
| Endpoint | `GET /api/subjects/{subject_id}` |
| Response | `subject_id, display_name, language, components[], materials_count, chunks_indexed, last_indexed_at` |
| Loading | header shows static data immediately, index info fills in | Error: hide index panel | Empty: "No indexed material yet." |

| Field | Load learning goals |
| --- | --- |
| Component | subject dashboard "Learning goals" panel (to be added) |
| Now | none / mock `Learning Goals` material section |
| Owner later | **PY** |
| Endpoint | `GET /api/subjects/{subject_id}/learning-goals?component_subject_id=` |
| Response | `[{learning_goal_id, title, description, topic, source_material_id, mastery_hint}]` |
| Loading | list skeleton | Error: inline retry | Empty: "No learning goals loaded for this subject." |

| Field | Load materials |
| --- | --- |
| Component | `app/MaterialsPanel.tsx` |
| Now | `AppDataProvider.materials` in `localStorage` (sections: Learning Material, Syllabus, Learning Goals, Grading Criteria, Online Sources, Archived) |
| Owner later | **PY** (indexed files) merged with **LS** (user links/notes) |
| Endpoint | `GET /api/subjects/{subject_id}/materials` |
| Response | `[{material_id, name, type, section, status, pages, chunks, added_at, url}]` |
| Loading | existing panel skeleton | Error: show local materials only + banner | Empty: existing empty state |

| Field | Import / upload material |
| --- | --- |
| Component | `app/TranscriptImportDialog.tsx` (transcript OCR sim) and MaterialsPanel add dialog |
| Now | simulated parse → local record |
| Owner later | **PY** |
| Endpoint | `POST /api/import/document` (multipart) |
| Request | `file`, `subject_id`, `component_subject_id`, `section`, `language` |
| Response | `{material_id, name, type, pages, chunks_indexed, status, warnings[]}` |
| Loading | progress states: Uploading → Parsing → Indexing | Error: keep the file listed as `Needs review` | Empty: n/a |
| Mock fallback | current simulated flow retained verbatim |

---

## 3. AI study tools

| Field | Generate quiz |
| --- | --- |
| Route | `/school/$subject` · Component: subject tools panel |
| Now | not implemented / mock |
| Owner later | **PY** |
| Endpoint | `POST /api/quiz/generate` |
| Request | `subject_id, component_subject_id, language, academic_year, grade_level, learning_goal_ids[], material_ids[], question_count, difficulty, question_types[]` |
| Response | `quiz_id, subject_id, language, questions[], generated_at, used_model, sources[]` |
| Loading | full-panel shimmer + "Generating quiz…" (can take 10–60 s → 120 s timeout) | Error: retry with lower `question_count` | Empty: "Add material to this subject first." |
| Mock fallback | 5 canned questions |

| Field | Generate mock exam |
| --- | --- |
| Endpoint | `POST /api/mock-exam/generate` |
| Request | `subject_id, component_subject_id, language, duration_minutes, total_points, topics[], material_ids[]` |
| Response | `exam_id, title, duration_minutes, total_points, questions[] (with points, rubric), sources[]` |
| Loading | long-running shimmer + cancel | Error: toast + retry | Empty: as above |
| Mock fallback | canned 3-question exam |

| Field | Grade student answer |
| --- | --- |
| Component | grader panel on `/school/$subject`; result may be saved as an `Assessment` |
| Now | frontend-only `pointsToGrade` in `frontend/src/lib/grade-math.ts` |
| Owner later | **PY** for evaluation, **FE** for display rounding |
| Endpoint | `POST /api/grade` |
| Request | `subject_id, component_subject_id, language, question, student_answer, max_points, rubric_id, exam_id, question_id` |
| Response | `points_awarded, max_points, swiss_grade, grade_formula, strengths[], missing_points[], improvement_advice, rubric_used, sources[]` |
| Loading | button spinner + "Marking…" | Error: toast, answer preserved | Empty: submit disabled while the answer is blank |
| Mock fallback | deterministic 70% score |
| Rule | Backend computes `points_awarded / max_points * 5 + 1`; frontend applies 0.5 rounding for display and colours < 4.0 in `#C96A00`. |

| Field | Generate study plan |
| --- | --- |
| Route | `/planner` (and subject dashboard) · Component: `EventDialog` / planner generation action |
| Now | locally generated sessions flagged `generated: true` on `PlannerEvent` |
| Owner later | **PY** proposes, **LS** stores |
| Endpoint | `POST /api/study-plan/generate` |
| Request | `subject_ids[], language, academic_year, grade_level, exam_dates[], available_slots[], daily_minutes_max, start_date, end_date` |
| Response | `plan_id, items[] {date, start, end, subject_id, component_subject_id, topic, learning_goal_id, minutes, rationale}` |
| Loading | panel shimmer | Error: toast, planner untouched | Empty: "Add exams or availability first." |
| Rule | Never auto-write to the planner — always show a review step, then insert via `AppDataProvider` so items stay fully editable/deletable. |

---

## 4. Feedback, health, status

| Field | Save feedback |
| --- | --- |
| Route | `/feedback` |
| Now | implemented against Supabase |
| Owner | **Supabase Edge Function `feedback-submit`** |
| Call | `supabase.functions.invoke("feedback-submit", { message, category, context })` |
| Request | `message` (10–4000 chars), `category` (idea/bug/general), `context` (route, user agent, timestamp) |
| Effect | row in `public.feedback` + text mirror in the private `feedback-messages` bucket |
| Loading | submit spinner | Error: draft stays in the textarea | Empty: submit disabled while empty |
| Telemetry | `feedback_submitted` / `feedback_submit_failed` — never the message text |

| Field | Activity and error logging |
| --- | --- |
| Route | app-wide |
| Owner | **Supabase Edge Function `activity-log`** |
| Call | `supabase.functions.invoke("activity-log", { event_name, feature?, subject?, properties? })` via `frontend/src/lib/telemetry.ts` |
| Effect | row in `public.usage_events` (`user_id` nullable, timestamp `occurred_at`) + object in the private `activity-logs` bucket |
| Rules | fire-and-forget, never blocks the UI; sensitive keys dropped, strings capped; failures send only `error_name`/`error_status`/`error_code`, never a raw error message; anonymous only for `auth_signin_failed` / `oauth_signin_failed` |
| Coverage | page views, global errors, auth (sign-in/sign-up/OAuth/sign-out), planner create/update/duplicate/delete/move/series changes, Google Calendar connect/sync/disconnect, feedback, settings & profile & preference saves, assistant/chat send/complete/fail (status only) |

| Field | Load backend/model health |
| --- | --- |
| Route | app-wide (`AppShell`), `/settings` |
| Now | does not exist |
| Owner later | **PY** |
| Endpoint | `GET /health`, `GET /api/model/status` |
| Response | `{status, version, uptime_s, vector_store, subjects_indexed}` / `{provider, model, endpoint, reachable, latency_ms, mode}` |
| Loading | banner hidden while the first check is in flight | Error: treat as offline | Empty: n/a |
| Poll | on app start + every 60 s while an AI screen is open |

| Field | Backend-unavailable banner |
| --- | --- |
| Component | new `frontend/src/components/app/BackendStatusBanner.tsx` in `AppShell` |
| Behaviour | Non-blocking amber bar: "Study AI backend offline — grades, planner and materials still work." Includes Retry. Disables AI-only actions; never blocks localStorage features. |

| Field | Local / remote model status |
| --- | --- |
| Component | `/settings` row, optional small chip in the chat header |
| Endpoint | `GET /api/model/status` |
| Display | `llama.cpp · Qwen/Qwen3.8-27B · local · preloaded · 42 ms`; shows `used_model` from the last answer for provenance. |

---

## 5. Stays in Supabase for now

| Piece | Stage 1 decision |
| --- | --- |
| Authentication and session | **Stays in Supabase.** Do not touch. |
| Chat threads / messages | **Stays in Supabase**, unless it blocks fully-offline local use. |
| Prototype data (grades, planner, materials, links, profile) | **Stays in `localStorage`.** No demo mode exists. |
| AI inference, RAG, sources, quizzes, exams, grading, study plans, feedback | **Moves to Python** in Stage 1/2. |

## Assistant, settings and storage mapping

| UI surface | Backend touchpoint | Owner |
| --- | --- | --- |
| Auth card | Supabase Auth (email/password, reset, GitHub/LinkedIn/Spotify) | Supabase |
| `/settings` Account | `profiles`, Supabase Auth, `profile-avatars` | Supabase |
| `/settings` Local model | `user_preferences.preferences.selected_qwen_model` | Supabase (execution: Python) |
| `/settings` Storage | `get_storage_usage_status()`, Storage API, `storage-emergency-cleanup` | Supabase |
| `/assistant` history | `assistant_threads`, `assistant_messages` | Supabase |
| `/assistant` attachments | `chat-attachments` bucket + `assistant_attachments` | Supabase (parsing: Python, future) |
| `/assistant` replies | not connected yet | Python backend (future) |
| Language selector (header flag menu) | `user_preferences.preferences.app_language` | Supabase (consumption: frontend `I18nProvider`) |
| Listen/Stop on assistant messages | browser Web Speech API only, ephemeral | Frontend (`frontend/src/lib/speech.ts`) — never backend |
| Media retention enqueue (assistant output media) | `public.media_retention_queue` insert via `frontend/src/lib/media-retention.ts` | Supabase row; descriptor generation/upload, cleanup and descriptor-based retrieval are FUTURE BACKEND / CODEX |
