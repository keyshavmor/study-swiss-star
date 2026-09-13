# Backend Integration TODO

Ordered checklist for the next development phase. Nothing here is done yet.

## Phase 0 — Audit

- [ ] Audit Lovable AI Gateway usage: `src/lib/ai-gateway.server.ts`, `src/routes/api/chat.ts`
      (model `openai/gpt-5.6-sol`, `streamText`, `toUIMessageStreamResponse`).
- [ ] Audit Supabase chat dependency: `src/lib/chat.functions.ts` (`listThreads`, `listMessages`,
      `createThread`, `deleteThread`), `requireSupabaseAuth`, `src/start.ts` bearer middleware.
- [ ] List every file involved in chat: `StudyChat.tsx`, `ThreadList.tsx`, `ai-elements/*`,
      `chat.index.tsx`, `chat.$threadId.tsx`, `chat.functions.ts`, `api/chat.ts`, `ai-gateway.server.ts`.
- [ ] Confirm the frozen contract: 15 subjects, SPF combined rules, language map, Swiss grade math.

## Phase 1 — Plumbing (no visible change)

- [ ] Create `src/lib/backendMode.ts` (default mode `lovable` so nothing breaks).
- [ ] Create `src/lib/pythonApiTypes.ts` mirroring `docs/FRONTEND_DATA_MODEL.md`.
- [ ] Create `src/lib/pythonApiClient.ts` (timeouts, `APIError` parsing, typed helpers).
- [ ] Add `.env.local` and document it in `README.md`.
- [ ] Verify: typecheck and build pass with the app behaving exactly as before.

## Phase 2 — Health and status

- [ ] Add `getHealth` / `getModelStatus` queries (`retry: false`, 60 s interval).
- [ ] Create `src/components/app/BackendStatusBanner.tsx` and mount it in `AppShell`.
- [ ] Add a `useBackendOnline()` hook to disable AI actions with tooltips.
- [ ] Show backend + model status rows in `/diagnostics` and `/settings`.
- [ ] Verify: banner appears when the backend is stopped and clears on Retry when restarted.

## Phase 3 — Chat on Python

- [ ] Create `src/lib/pythonChatAdapter.ts` (non-streaming first).
- [ ] Swap the `transport` in `StudyChat.tsx` based on `backendMode`; keep everything else identical.
- [ ] Send subject context: `subject_id`, `component_subject_id`, `language`, `academic_year`,
      `grade_level`, `learning_goal_id`, `material_ids`, `top_k`, `include_sources`.
- [ ] Preserve the existing chat thread UI: sidebar, new-session dialog, empty state, shimmer, toasts.
- [ ] Decide thread persistence: Supabase (default), Python, or localStorage — record the decision
      in `STATE_AND_STORAGE.md` and ensure only one writer.
- [ ] Create `src/components/app/SourceSnippetList.tsx` and render it under assistant messages.
- [ ] Add the exam-tip callout.
- [ ] Upgrade to SSE streaming once the JSON path is stable.
- [ ] Verify: a German SPF-Chemistry question returns a German answer with sources.

## Phase 4 — Subject data

- [ ] Wire `GET /api/subjects` into `/school` as enrichment only (static list stays authoritative).
- [ ] Wire `GET /api/subjects/{id}` into the subject dashboard index panel.
- [ ] Wire `GET /api/subjects/{id}/learning-goals` (respecting `component_subject_id` for SPF).
- [ ] Wire `GET /api/subjects/{id}/materials` and merge into `MaterialsPanel` with `origin`.
- [ ] Wire `POST /api/import/document` for uploads; keep the review step in
      `TranscriptImportDialog`.
- [ ] Verify: SPF switch changes goals/materials without changing the combined header average.

## Phase 5 — AI study tools

- [ ] Wire `POST /api/quiz/generate` + quiz runner UI; optional save as practice assessment.
- [ ] Wire `POST /api/mock-exam/generate` + exam view with per-question points.
- [ ] Wire `POST /api/grade`; display exact grade, apply `roundToHalf` for rounded displays,
      colour grades < 4.0 in `#C96A00`.
- [ ] Wire `POST /api/study-plan/generate` with a mandatory review step before inserting
      `PlannerEvent`s (`generated: true`, fully editable).
- [ ] Verify: generated planner items can be edited, moved, duplicated and deleted like any other.

## Phase 6 — Feedback and polish

- [ ] Wire `POST /api/feedback` from `/feedback` and from 👍/👎 on answers.
- [ ] Queue failed feedback in `localStorage` and retry when health recovers.
- [ ] Keep mock/demo mode working end-to-end (`VITE_USE_MOCK_AI=true`, `DemoMode` toggle).
- [ ] Add loading, error, offline and empty states everywhere via `app/States.tsx`.

## Manual frontend test checklist

- [ ] Backend **off**: `/school`, `/stats`, `/planner`, `/profile`, `/settings`, `/help` fully work.
- [ ] Backend **off**: amber banner shown; AI buttons disabled with tooltips; no blank screens.
- [ ] Backend **on**: banner hidden; `/diagnostics` shows healthy backend + model.
- [ ] Chat: send a question in each language (de / en / fr B1) and confirm the answer language.
- [ ] Chat: sources render, collapse and link correctly; empty sources render nothing.
- [ ] Chat: thread create, switch, delete still work; history reloads on refresh.
- [ ] School: exactly 15 cards; SPF appears once; SPF average = mean of component averages.
- [ ] SPF dashboard: Bio ↔ Chem switch scopes goals/materials; header average unchanged.
- [ ] Grades: failing grades (< 4.0) are orange `#C96A00`; averages round to 0.5.
- [ ] Grading: `points/max*5+1` matches the backend `grade_formula` string.
- [ ] Planner: generated study plan requires review; items stay editable.
- [ ] Demo mode on/off leaves no orphaned data.
- [ ] Light and dark mode both correct on every new component.
- [ ] Mobile viewport: banner, sources and new panels do not break layout.

## Documentation

- [ ] Update `README.md` with the local Python backend setup section.
- [ ] Keep `docs/API_EXPECTATIONS.md` in sync with the real FastAPI implementation.
- [ ] Record resolved decisions from `OPEN_QUESTIONS_FOR_BACKEND.md`.

## Hard constraints

- [ ] **Do not** remove Supabase or auth until explicitly requested.
- [ ] **Do not** remove Lovable AI Gateway until Python chat is confirmed working.
- [ ] **Do not** edit `routeTree.gen.ts` or auto-generated Supabase files.
- [ ] **Do not** change the 15-subject model, SPF logic, or the design system.
- [ ] **Do not** break localStorage demo/prototype mode.
- [ ] **Do not** put secrets in `VITE_*` variables.
- [ ] **Do not** implement RAG or LLM logic in TypeScript.
