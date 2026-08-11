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
| Component | `src/components/StudyChat.tsx` (`PromptInput` → `chat.sendMessage`) |
| Action | Student submits a question |
| Now | `useChat` + `DefaultChatTransport` → `POST /api/chat` → Lovable AI Gateway `openai/gpt-5.6-sol` |
| Data source now | Supabase `messages`, Lovable AI Gateway |
| Owner later | **PY** |
| Endpoint | `POST /api/chat` (FastAPI) |
| Request | `thread_id, subject_id, component_subject_id, language, academic_year, grade_level, question, learning_goal_id, material_ids, top_k, include_sources, stream` |
| Response | `thread_id, message_id, answer, sources[], exam_tip, used_model, retrieval_summary, language, created_at` |
| Loading | `chat.status === "submitted" \| "streaming"` → existing `Shimmer` "Thinking…" + disabled composer |
| Error | `onError` toast (existing) + inline retry on last message; 503 shows `BackendStatusBanner` |
| Empty | Existing "Ready to study?" panel |
| Mock fallback | `VITE_USE_MOCK_AI=true` returns a canned answer + two fake sources after ~600ms |

| Field | Stream / display AI answer |
| --- | --- |
| Route | `/chat/$threadId` |
| Component | `ai-elements/message.tsx`, `ReactMarkdown` in `StudyChat.tsx` |
| Now | AI SDK UI message stream from `/api/chat` |
| Owner later | **PY** |
| Endpoint | `POST /api/chat` with `stream: true` (SSE / `text/event-stream`) |
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
| Now | `src/routes/api/chat.ts` inserts the user message before streaming and the assistant message in `onFinish` |
| Owner later | **SB (transcript) + PY (AI metadata)** — Python stores `sources`, `used_model`, `retrieval_summary` alongside `message_id` |
| Endpoint | implicit in `POST /api/chat`; no separate call |
| Risk | double-writes if both sides persist. Decide once — see `OPEN_QUESTIONS_FOR_BACKEND.md` Q1. |

| Field | Show RAG source snippets |
| --- | --- |
| Route | `/chat/$threadId`, `/school/$subject` |
| Component | new `src/components/app/SourceSnippetList.tsx` under each assistant message |
| Now | **does not exist** |
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
| Now | static `SUBJECTS` in `src/lib/mock/subjects.ts` + grades from `AppDataProvider` |
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
| Now | frontend-only `pointsToGrade` in `src/lib/grade-math.ts` |
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
| Route | `/feedback` (plus 👍/👎 on chat answers) |
| Now | local form + toast |
| Owner later | **PY** |
| Endpoint | `POST /api/feedback` |
| Request | `category, rating, message, route, thread_id, message_id, subject_id, language, app_version` |
| Response | `{feedback_id, created_at}` |
| Loading | submit spinner | Error: keep the draft locally and retry later | Empty: submit disabled while empty |
| Mock fallback | stored in `localStorage` queue |

| Field | Load backend/model health |
| --- | --- |
| Route | app-wide (`AppShell`), `/settings`, `/diagnostics` |
| Now | does not exist |
| Owner later | **PY** |
| Endpoint | `GET /health`, `GET /api/model/status` |
| Response | `{status, version, uptime_s, vector_store, subjects_indexed}` / `{provider, model, endpoint, reachable, latency_ms, mode}` |
| Loading | banner hidden while the first check is in flight | Error: treat as offline | Empty: n/a |
| Poll | on app start + every 60 s while an AI screen is open |

| Field | Backend-unavailable banner |
| --- | --- |
| Component | new `src/components/app/BackendStatusBanner.tsx` in `AppShell` |
| Behaviour | Non-blocking amber bar: "Study AI backend offline — grades, planner and materials still work." Includes Retry. Disables AI-only actions; never blocks localStorage features. |

| Field | Local / remote model status |
| --- | --- |
| Component | `/settings` + `/diagnostics` rows, optional small chip in the chat header |
| Endpoint | `GET /api/model/status` |
| Display | `Ollama · llama3.1:8b · local · 42 ms` or `vLLM · remote GPU · 210 ms`; shows `used_model` from the last answer for provenance. |

---

## 5. Stays in Supabase for now

| Piece | Stage 1 decision |
| --- | --- |
| Authentication and session | **Stays in Supabase.** Do not touch. |
| Chat threads / messages | **Stays in Supabase**, unless it blocks fully-offline local use. |
| Prototype data (grades, planner, materials, links, profile, demo mode) | **Stays in `localStorage`.** |
| AI inference, RAG, sources, quizzes, exams, grading, study plans, feedback | **Moves to Python** in Stage 1/2. |
