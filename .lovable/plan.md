# AI-backed assessment system for the subject workspace

Build the full assessment experience (Quick Check, Practice, Quiz, Mock Exam, Results & Review, Knowledge Profile) inside the existing subject workspace, with typed contracts a future Python backend can implement. No AI generation/grading is implemented here, and nothing pretends to work.

## What I found first (affects the plan)

- The subject workspace (`school.$subject`) already has the modes Chat / Knowledge Analysis / Quiz Mode / Exam Mode / Study Plan / Statistics / Subject Tools, and everything except Chat and Statistics is placeholder.
- The live production database does **not** currently contain `quizzes`, `quiz_attempts`, `mock_exams`, `mock_exam_attempts` or `grading_results` — the generated types show only auth/compliance/assistant/peer/model tables. So the assessment tables are new work, and they must be applied to the production project outside this editor (see Open item at the end).
- Subjects, materials, learning goals and grading criteria are currently frontend model data, not database rows. Assessment setup will read from those existing sources rather than creating a second materials library.
- Maths/chemistry rendering libraries are not installed yet; only `react-markdown` is present.

## Phase 1 — Domain, contracts, state machine (no UI)

- `src/lib/assessment/` with Zod-validated types: `PublicQuestion` discriminated union (multiple choice single/multi, true-false, short answer, matching, essay, calculation) plus extension slots for numeric, expression, ordering, cloze, image-label, multi-part, stimulus groups.
- Strict separation: `PublicQuestion` never carries a correct answer, rubric or tolerance. A separate `AnswerKey` / `GradingRubric` type exists only for backend/server contracts.
- Structured content blocks (prose, inline/display maths, chemistry, table, image, diagram, code, quotation, poetry) with locale and italic/monospace metadata. No raw HTML rendering anywhere.
- `AssessmentMedia` type with purpose, provenance, captions, alt text, long description, credit/licence, dimensions.
- Assessment configuration types: difficulty (`easy|medium|advanced|very_advanced`), school level, academic year, subject/topic/learning goals, source scope (`materials|web|both` plus selected document/goal IDs), question mix, time allowance, cognitive-demand slot.
- Explicit lifecycle reducer: `setup → generation_requested → generating → ready → in_progress → submitting → submitted → grading → graded`, plus `abandoned`, `expired`, `generation_failed`, `grading_failed`. Invalid transitions are unrepresentable.
- One `assessmentApi` client abstraction with the future operations (create job, status, cancel, begin, heartbeat, submit, abandon, grading status, result). Unimplemented operations return a clearly typed `backend_unavailable` result — no invented URLs, no fake progress. A development-only mock adapter is used for visual review and is labelled as such.

## Phase 2 — Rendering and answer input

- `ScientificContentRenderer` as the single rendering path used by prompts, options, student answers, keys, explanations and results. Adds KaTeX for maths and mhchem-capable chemistry rendering.
- `MathAnswerInput` using a math field (MathLive) with keyboard-accessible entry, storing both canonical LaTeX and a display form; raw-LaTeX typing stays available as an option.
- Per-type answer editors: MCQ (radio/checkbox + option eliminator annotation), true/false, short answer, accessible non-drag matching, essay with word count and no durable draft persistence, calculation with workings and units.
- `AssessmentMediaView` with responsive sizing, click-to-enlarge, keyboard operation, required alt/long description when the image is essential.

## Phase 3 — Flows in the subject workspace

- Mode rail relabelled: Chat, Quick Check, Knowledge Profile, Quiz Mode (Practice / Scored Quiz), Mock Exam, Study Plan, Statistics, Subject Tools. Internal mode identifiers stay backwards compatible.
- **Quick Check**: one-press "Give me a question" scoped to the active subject, with a compact optional settings popover (topic, difficulty, source scope). Uses the same question renderer.
- **Setup wizard** for Quiz and Mock Exam: subject/topic & goals → difficulty → source scope → question mix (live total) → time allowed → advanced → review → generate. Active subject preselected; school level, academic year and language shown read-only in review, never invented.
- **Generation waiting room**: "Preparing your assessment", up-to-10-minutes copy, timer-does-not-start note, cancel action, and only the phases the backend actually reports.
- **Ready screen** with an explicit "Begin" that starts the countdown.
- **Runner**: quiet, distraction-suppressed layout for Mock Exam (title, subject, progress, time remaining, timer show/hide, submit), Previous/Next, mark for review, question navigator with answered/unanswered/marked/current states, skip and return. No tutor, hints, correctness, XP or celebration during a Mock Exam.
- **Timer expiry**: lock editing, auto-submit, unanswered scores zero, move to submitted/grading. Server timestamps supported in the contract.
- **Submission review** drawer listing answered/unanswered/marked, "Unanswered questions receive 0 points.", confirmed "Submit assessment".
- **Quit assessment** with an explicit consequence warning, then stop timer, request cleanup, discard questions/answers, keep only the minimal incomplete record.
- **Grading pending** screen (submitted / grading / graded / grading_failed) with "you can safely leave" copy, wired to the existing notification system.
- **Results & Review**: analytical summary (points, percentage, Swiss grade when supplied, time, type and learning-goal breakdown, strengths/weaknesses) and per-question review with answer, points, model answer, explanation, sources and media. Follow-up actions ("practice incorrect", "quiz from weak topics", "add to study plan") are wired as UI only where no contract exists yet.
- **Knowledge Profile**: mastery foundation by subject/topic/goal/type/difficulty with honest uncertainty, never inferred from a single question, and kept separate from official school grades.

## Phase 4 — Persistence, grades, cleanup

- Ephemeral-before-submission rule enforced in code: no generated questions, answers or configuration in localStorage; cleanup on route change, sign-out and page hide (best-effort beacon), with heartbeat/TTL left to the backend.
- Completed attempts are snapshots (visible question content, media provenance, submitted answers, scoring configuration) so history stays reproducible.
- AI practice results integrate with the existing grades/statistics model with `includeInStats = false` by default; they never merge into teacher-entered averages.
- Migration SQL authored for `assessment_attempts`, `assessment_questions` (snapshot, no keys), `assessment_answers`, `assessment_grading_results` and a server-only answer-key/rubric table with no client SELECT, all with RLS scoped to the owner, explicit grants, and no public buckets or service-role keys in browser code.

## Phase 5 — i18n, telemetry, tests, docs

- All new strings added to the existing i18n system for all seven languages (gsw stays ß-free); key-completeness check kept green.
- Lifecycle telemetry events only (setup opened, generation requested/cancelled, ready, started, answered, skipped, marked, submitted, abandoned, grading completed/failed, results opened) — never question text, answers, essays or material content.
- Tests: schema validation, question-count totals, setup validation, state-machine transitions, skip behaviour, timer expiry, review state, quit behaviour, no answer-key leakage in public types, content-renderer boundaries, source selection, completed-vs-incomplete persistence, i18n completeness, key accessibility controls.
- Documentation refreshed (and mirrored byte-identically to `lovabledocs/`): UX flow, component architecture, state machine, data ownership, ephemeral vs durable lifecycle, tables/RLS, future backend contract, question/media/content schemas, answer-key boundary, cleanup, error states. New Mermaid diagrams for setup→generation→attempt→submission→grading→result, pre-submission abandonment/cleanup, and frontend/database/future-backend ownership. Backend pieces tagged FUTURE BACKEND / CODEX. Stale assessment docs replaced.
- Full run of format, typecheck, lint, i18n check, tests and production build.

## Technical notes

- New dependencies: KaTeX (with mhchem extension) and MathLive. Both are prebundled in the Vite dependency config to avoid the duplicate-React refresh problem seen earlier.
- The assessment API client is the only place future endpoint paths appear; every call is typed and fails closed as unavailable until the Python backend exists.
- No changes to the local Python backend, no Git commands, and no weakening of existing row-level security.

## Open item that needs you

The assessment tables do not exist in the production database and I cannot apply migrations to that project from this editor. I will author the migration SQL and ship the frontend against it; results/history will report "backend unavailable" until the SQL is applied there. Tell me if you would rather I hold the migration file for Codex or wire a temporary read-only path.
