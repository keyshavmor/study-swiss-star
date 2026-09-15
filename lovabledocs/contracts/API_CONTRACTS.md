# API Contracts

Status: CURRENT — VERIFIED 2026-09-15

## TanStack `POST /api/chat`

Bearer-authenticated subject-chat endpoint. Verifies claims/thread ownership, stores canonical transcript rows, invokes FastAPI, and returns AI-SDK UI-message streaming frames plus `data-context-metadata`.

## FastAPI

All `/api/*` endpoints require a verified Supabase bearer token. `X-Student-Id` is optional context and must match verified `sub`.

| Endpoint | Purpose |
|---|---|
| `GET /health` | API/store/model/runtime health |
| `GET /api/model/status` | model and embedding configuration/status |
| `POST /api/context/compile` | inspectable bounded context without inference |
| `POST /api/chat` | context/RAG/local-Qwen subject answer |
| `POST /api/context/events` | learning event |
| `POST /api/context/artifacts` | reusable context artifact |
| `POST /api/context/documents/text` | text chunk/embed/index |
| `POST /api/context/documents/storage` | private user-material download, parse, index, cleanup |

`POST /api/chat` supports only non-streaming FastAPI responses; TanStack converts the complete answer to the UI stream. Language accepts exactly `en|de|gsw|ru|es|fr|it`.

Errors use `{error:{code,message,retryable,request_id}}` and `X-Request-Id`.

## Supabase functions

See `docs/supabase/EDGE_FUNCTIONS.md` and exact `supabase/functions/` sources.
