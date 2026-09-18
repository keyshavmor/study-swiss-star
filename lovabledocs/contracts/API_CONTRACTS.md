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
| `POST /api/context/compile` | inspectable bounded context without inference |
| `POST /api/chat` | context/RAG/local-Qwen subject answer |
| `POST /api/context/events` | learning event |
| `POST /api/context/artifacts` | reusable context artifact |
| `POST /api/context/documents/text` | text chunk/embed/index |
| `POST /api/context/documents/storage` | private user-material download, parse, index, cleanup |

`POST /api/chat` supports only non-streaming FastAPI responses; TanStack converts the complete answer to the UI stream. Language accepts exactly `en|de|gsw|ru|es|fr|it`.

Errors use `{error:{code,message,retryable,request_id}}`. Every response carries
`X-Request-Id` and `X-Alim-Contract-Version`. See
[`../../backend/docs/api/CONTRACT_V1.md`](../../backend/docs/api/CONTRACT_V1.md)
and `tests/contracts/local-backend-v1.json` for the frozen foundation.

## Supabase functions

See `docs/supabase/EDGE_FUNCTIONS.md` and exact `supabase/functions/` sources.
