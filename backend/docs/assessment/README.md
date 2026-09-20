# Assessment backend

| Field | Value |
|---|---|
| Owner | Local backend assessment boundary |
| Status | `CURRENT — LOCAL BACKEND`; Prompt 07 safety dependency remains fail-closed |
| Frontend authority | `f0910e6971f12efe0ad547b904f6e2a518b13856` |
| Last verified | Prompt 06, 2026-09-19 |

`backend/app/assessment/` implements the existing frontend `AssessmentApi`
without changing its UX. Authenticated TanStack server functions call loopback
FastAPI and forward the verified Supabase JWT. The API independently derives the
owner from that JWT; `X-Student-Id` is only a matching cross-check.

## Ownership of state

| State/data | Owner |
|---|---|
| Configuration, generation phase, attempt/deadline, private keys/rubrics | local SQLite (`ALIM_ASSESSMENT_DB`), directory `0700`, file `0600` |
| Visible questions | strict public payload; sanitized durable copy only after final submission |
| Answers, score and graded result | server-calculated and persisted through caller JWT/RLS |
| Selected sources/model/prompt version | bounded generation input plus provenance metadata |

The local repository converts interrupted generation/grading into an honest
failure after restart. Ready jobs expire after two hours. An in-progress attempt
without a heartbeat for five minutes expires and loses private question/key
material. Cancellation and abandon remove unsubmitted temporary state. Submitted
or graded work cannot be abandoned.

Pre-submission work is local-only: generation, ready, begin and heartbeat do not
create Supabase rows. After final submission and grading, the backend writes the
sanitized assessment root, server start, answers and result through the caller
JWT, verifies each durable write, and marks failures honestly.

## Generation and grading

Configuration is strict and server-revalidated. Context retrieval respects the
selected materials and source scope, treats all retrieved/model content as
untrusted data, and replaces model source claims with actual selected source
metadata. The selected registry model must be prepared and live. Generation and
subjective grading accept only versioned strict JSON, make at most two repair
attempts and never synthesize fallback AI output.

Multiple choice, true/false, matching and calculation are scored
deterministically. Short answer and essay can use the local model; awarded points
and rubric criteria are checked against private server data. FastAPI recomputes
question totals and percentages. No Swiss grade is emitted because no grading
policy is settled.

## Security and unsupported controls

Answer keys never enter exposed Supabase tables, browser payloads, logs or
telemetry. Foreign and missing IDs both return 404. Submission checks the stored
configuration/question snapshot and answer IDs/types/options. Exact idempotent
retries replay; changed bodies conflict. Generated media is rejected because no
private signed-media contract exists.

Safety is deliberately fail-closed until Prompt 07 supplies the moderator.
Study Plan, AI-refreshed Knowledge Profile and Subject Tools remain frontend
placeholders/read-only views without a settled action contract; no backend route
or result is invented for them.

Use the [cross-system contract](../../../docs/contracts/ASSESSMENT_API_CONTRACT.md)
for operation shapes and [API v1 contract](../api/CONTRACT_V1.md) for transport
invariants. Tests are in `tests/backend/test_assessment_api.py`,
`tests/backend/test_supabase_security.py`, and
`frontend/src/lib/assessment-backend.server.test.ts`.
