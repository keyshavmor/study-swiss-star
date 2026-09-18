# Assessment API Contract

Tags: **EXPECTED LOCAL BACKEND CONTRACT**, **FUTURE CODEX IMPLEMENTATION**

The frontend talks to exactly one abstraction, `AssessmentApi`
(`frontend/src/lib/assessment/api.ts`). In production it is bound to
`unavailableAssessmentApi`, which returns `{ ok: false, failure: "backend_unavailable" }`
for every call. A local Python backend implements the operations below behind an
authenticated server bridge that forwards the verified Supabase bearer JWT
server-to-server. No service-role key is ever used and the JWT is never
persisted or logged.

## Failure vocabulary

`backend_unavailable | unauthorized | invalid_request | rate_limited | server_error`

Any 404, connection error or timeout maps to `backend_unavailable`.

## Operations

| Operation | Request | Response |
| --- | --- | --- |
| `createGenerationJob(config)` | `AssessmentConfig` | `{ jobId, acceptedAt }` |
| `getGenerationStatus(jobId)` | `jobId` | `{ phase, questions?, attemptId?, failureReason?, expiresAt? }` |
| `cancelGeneration(jobId)` | `jobId` | `{ cancelled: boolean }` |
| `beginAssessment(attemptId)` | `attemptId` | `{ startedAt }` |
| `heartbeat(attemptId)` | `attemptId` | `{ alive: boolean }` |
| `submitAssessment(payload)` | attempt id, answers, timing, reason | `{ attemptId }` |
| `abandonAssessment({ jobId?, attemptId? })` | either reference | `{ cleaned: boolean }` |
| `getGradingStatus(attemptId)` | `attemptId` | `{ status, failureReason? }` |
| `getResult(attemptId)` | `attemptId` | `AssessmentResult` |

`phase` is one of `queued | generating | validating | ready | failed | cancelled | expired`.
The frontend renders only phases the backend reports — it never fakes progress
or percentages.

`status` (grading) is one of `submitted | grading | graded | grading_failed`.
The backend is authoritative for elapsed time and for time expiry.

## Content rules

- `questions` MUST validate against `publicQuestionSchema`. Answer keys,
  correct option ids, tolerances, canonical values, model answers and rubrics
  MUST NOT appear in that payload.
- Model answers, explanations, distractor explanations and rubric feedback are
  returned only by `getResult` after grading completes.
- Media is delivered as `AssessmentMedia` with signed, private object URLs plus
  caption, alt text, long description, credit and licence. No hotlinking and no
  browser-fetched internet resources.
- Web sources carry title, URL, publisher, retrieval date and image attribution.

## Lifecycle obligations

- `abandonAssessment` MUST delete the generated question set, answer keys and
  configuration, and MUST NOT persist the set as a completed attempt.
- Attempts without a heartbeat within the agreed TTL MUST be expired and cleaned
  up the same way.
- Only final submission creates a durable snapshot (questions, answers,
  provenance, timing, configuration, completion timestamp).

## Supabase persistence — FUTURE CODEX IMPLEMENTATION

Reuse and extend `quizzes`, `quiz_attempts`, `mock_exams`,
`mock_exam_attempts`, `grading_results` and `study_plans`; never duplicate them.
Persisted rows carry kind, subject, component, academic year, school level,
topic, difficulty, source scope, source document ids, learning goal ids,
duration, question blueprint, generated/started/submitted/graded timestamps,
model, score, status and provenance. Answer keys live in server-only storage
that is not readable by the client role. RLS stays enabled with per-user
isolation, no public buckets and no service-role key in any client path.

CORRECTION (verified 2026-09-16): these tables ARE present in the authoritative
production project — `quizzes`, `quiz_attempts`, `mock_exams`,
`mock_exam_attempts`, `grading_results`, `assessments` and `study_plans` all
exist with RLS and user ownership. An earlier version of this document claimed
they did not exist; that claim was wrong. The remaining backend work is to
REUSE and EXTEND those tables (columns / server-only answer-key storage), never
to create parallel assessment tables. All user-owned rows are additionally
subject to the per-user 50 MB quota guard
(`docs/contracts/USER_QUOTA_CONTRACT.md`).
