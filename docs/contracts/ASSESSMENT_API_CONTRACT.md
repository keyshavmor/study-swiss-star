# Assessment API contract

Tags: **CURRENT — FRONTEND**, **CURRENT — LOCAL BACKEND**, **CURRENT — SUPABASE**

The frontend talks to the `AssessmentApi` abstraction in
`frontend/src/lib/assessment/api.ts`. Production binds it to
`productionAssessmentApi`; development may visibly replace it with the labelled
preview adapter. Authenticated TanStack server functions forward the verified
Supabase bearer JWT to loopback FastAPI. No service-role key is used and the JWT
is neither persisted nor logged.

## Failure vocabulary

The frontend normalizes failures to:

`backend_unavailable | not_implemented | invalid_payload | cancelled`

Transport/auth/server failures map to `backend_unavailable`; bounded 400/409/
415/422 responses map to `invalid_payload`. FastAPI's error envelope retains
the more precise bounded code and request ID without exposing private content.

## Operations and routes

| Frontend operation | Loopback FastAPI route | Response |
|---|---|---|
| `createGenerationJob(config, { modelId })` | `POST /api/assessments/generation` | `{ jobId, phase }` |
| `getGenerationStatus(jobId)` | `GET /api/assessments/generation/{jobId}` | state/phase; ready adds public questions and attempt ID |
| `cancelGeneration(jobId)` | `POST /api/assessments/generation/{jobId}/cancel` | `{ cancelled }` |
| `beginAssessment(attemptId)` | `POST /api/assessments/attempts/{attemptId}/begin` | authoritative `{ startedAt }` |
| `heartbeat(attemptId)` | `POST /api/assessments/attempts/{attemptId}/heartbeat` | `{ alive }` |
| `submitAssessment(payload)` | `POST /api/assessments/attempts/{attemptId}/submit` | `{ attemptId }` |
| `abandonAssessment(reference)` | `POST /api/assessments/abandon` | `{ cleaned }` |
| `getGradingStatus(attemptId)` | `GET /api/assessments/attempts/{attemptId}/grading` | submitted/grading/graded/grading_failed |
| `getResult(attemptId)` | `GET /api/assessments/attempts/{attemptId}/result` | strict `AssessmentResult` |

Generation state is `queued | generating | validating | ready | failed |
cancelled | expired`. The frontend displays only backend-reported phases. The
backend owns start time, deadline and elapsed time; client timestamps and scores
are never authority.

## Answer-key and content boundary

- Public questions validate against `publicQuestionSchema`. Correct option IDs,
  canonical values, tolerances, private rubrics and answer keys never appear.
- Model answers, explanations and rubric feedback appear only in a validated
  result after grading. Correct keys remain server-only even then.
- Prompt 06 deliberately rejects generated media. A future signed private-media
  contract may use `AssessmentMedia`; no hotlink or invented URL is accepted.
- Every public source reference is replaced with metadata from an actually
  selected context item; the model cannot inject an arbitrary URL or source ID.

## Lifecycle, idempotency and cleanup

- A generation key is scoped to verified user plus semantic config/model
  fingerprint. Exact retries join/replay one job; changed input conflicts.
- `beginAssessment` is idempotent and creates the server start/deadline.
  Heartbeats refresh only an owned active attempt. A timed submission receives
  only a 30-second transport grace after the server deadline.
- Submission verifies the stored config/question snapshot, validates answer
  type/IDs/options, and persists one semantic fingerprint. Exact retries replay;
  changed-body or changed-key reuse conflicts.
- `abandonAssessment` cancels owned inference and deletes local questions,
  keys/configuration. It cannot delete submitted/grading/graded work.
- Ready jobs expire after two hours. In-progress attempts with no heartbeat for
  five minutes expire and their private question/key material is cleared.
- No Supabase row exists before submission. A browser close therefore leaves
  only TTL-governed private local state, not an orphan public assessment row.

## Generation and grading

Setup is revalidated server-side: exact enums, 1–60 questions, per-type caps,
required mock-exam timing, unique material/learning-goal IDs and bounded text.
Safety must explicitly allow before inference. The selected local model mapping
and live endpoint are checked for generation and again for subjective grading.

Retrieval is bounded by material IDs and `materials | web | both`. Every
question must cite an available source. Retrieved/student/model content remains
untrusted data. Model output is strict JSON under versioned prompts, with at most
two repair attempts, a closed rich-content vocabulary and no generated media.

Multiple-choice, true/false, matching and calculation scores are deterministic.
Short-answer and essay awards may use the local model, but question IDs and
point bounds are validated and the server recomputes all totals and percentages.
No Swiss grade is invented without a settled grading policy.

## Supabase persistence

FastAPI uses the caller JWT plus publishable key and explicit `user_id`
filters. After final submission and successful grading, it writes sanitized
questions to `quizzes`/`mock_exams`, server start state to the corresponding
attempt table, and final answers/result to the attempt plus `grading_results`.
Writes are read back or returned as a representation before local state
advances; a failed sequence is marked honestly and performs best-effort cleanup.

Answer keys/rubrics live only in the local mode-0600 assessment database under
the ignored app-data boundary. They never enter exposed tables, logs, telemetry
or browser payloads. No Prompt 06 migration or live Supabase write was made;
Prompt 07 remains responsible for schema/RLS reconciliation and two-user live
proof.

## Explicit unsupported states

Study Plan, AI-refreshed Knowledge Profile and Subject Tools remain authoritative
frontend “coming next”/empty placeholders with no generation control. Prompt 06
does not invent routes, persistence or results for them. The non-AI subject
workspace remains usable when assessment AI is blocked or unavailable.
