# API Contracts

Status: CURRENT — VERIFIED 2026-09-18 (contract version `2026-09-18`)

## TanStack `POST /api/chat`

Bearer-authenticated subject-chat endpoint. Verifies claims/thread ownership, stores canonical transcript rows, invokes FastAPI, and returns AI-SDK UI-message streaming frames plus `data-context-metadata`.

## FastAPI

All `/api/*` endpoints require a verified Supabase bearer token. `X-Student-Id` is optional context and must match verified `sub`.

| Endpoint | Purpose |
|---|---|
| `GET /health` | public loopback process liveness only |
| `GET /ready` | public loopback minimal model-runtime readiness |
| `GET /api/model/status` | authenticated legacy model and embedding status |
| `POST /api/model/prepare` | explicit verified model acquisition/preparation |
| `GET /api/model/operation/{operation_id}` | caller-authorized model progress |
| `POST /api/system/capability` | measured host capability and constrained recommendation |
| `POST /api/system/model/recommendation` | catalogue-constrained recommendation |
| `POST /api/system/admission/check` | caller-scoped capacity lease |
| `GET /api/system/health` | privacy-filtered local resource/runtime health |
| `POST /api/system/session/heartbeat` | renew caller-owned lease |
| `POST /api/system/runtime/release` | release caller-owned lease/runtime reference |
| `POST /api/privacy/purge-local` | idempotent caller-owned local deletion stage |
| `POST /api/context/compile` | inspectable bounded context without inference |
| `POST /api/chat` | context/RAG/local-Qwen subject answer |
| `POST /api/assessments/generation` | create idempotent assessment generation |
| `GET /api/assessments/generation/{job_id}` | poll owned generation |
| `POST /api/assessments/generation/{job_id}/cancel` | cancel owned generation |
| `POST /api/assessments/attempts/{attempt_id}/begin` | server-authoritative attempt start |
| `POST /api/assessments/attempts/{attempt_id}/heartbeat` | owned attempt heartbeat |
| `POST /api/assessments/attempts/{attempt_id}/submit` | idempotent snapshot-checked submission |
| `POST /api/assessments/abandon` | delete owned ephemeral assessment state |
| `GET /api/assessments/attempts/{attempt_id}/grading` | poll owned grading |
| `GET /api/assessments/attempts/{attempt_id}/result` | read owned durable result |
| `POST /api/context/events` | learning event |
| `POST /api/context/artifacts` | reusable context artifact |
| `POST /api/context/documents/text` | text chunk/embed/index |
| `POST /api/context/documents/storage` | private user-material download, parse, index, cleanup |

`POST /api/chat` supports only non-streaming FastAPI responses; TanStack converts the complete answer to the UI stream. Language accepts exactly `en|de|gsw|ru|es|fr|it`.

Errors use `{error:{code,message,retryable,request_id}}`. Every response carries
`X-Request-Id` and `X-Alim-Contract-Version`. See
[`../../backend/docs/api/CONTRACT_V1.md`](../../backend/docs/api/CONTRACT_V1.md)
and `tests/contracts/local-backend-v1.json` for the exact 27-endpoint inventory.

## Supabase functions

See `docs/supabase/EDGE_FUNCTIONS.md` and exact `supabase/functions/` sources.
