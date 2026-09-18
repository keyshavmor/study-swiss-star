# Frontend ↔ local-backend contract

| Field | Value |
|---|---|
| Owner | Frontend server adapters and backend API |
| Status | `CURRENT — FRONTEND` + `CURRENT — LOCAL BACKEND` for subject chat/context foundation |
| Contract version | `2026-09-18` |
| Verified | Prompt 03 focused/backend/E2E tests, 2026-09-18 |

## Boundary

The browser calls TanStack server routes/functions. Only those server adapters
call FastAPI at `http://127.0.0.1:8001` by default. A configured backend URL
must be loopback HTTP with no path, credentials, query or fragment. Lovable is
editor/build integration, never the runtime endpoint.

Every private local-backend call forwards the caller's verified Supabase access
token. FastAPI verifies the token independently, derives identity from
`claims.sub`, and rejects a conflicting `X-Student-Id`. Ordinary Supabase
persistence uses that caller token and the publishable key so RLS remains the
authorization boundary. No browser/service adapter uses a service-role key for
ordinary user operations.

## Subject chat

Browser `StudyChat` attaches its Supabase access token to TanStack
`POST /api/chat`. The route:

1. validates the bearer with `supabase.auth.getClaims(token)`;
2. derives the subject from verified `sub`;
3. verifies the requested thread through user-scoped Supabase access;
4. asks the local safety adapter for an allow verdict and otherwise fails
   closed (the safety endpoint remains a later backend gap);
5. stores the real user message;
6. calls `requestContextAnswer` with the exact token, subject cross-check,
   typed chat fields and incoming cancellation signal;
7. emits only the returned backend answer as AI-SDK text and metadata parts;
8. persists the real returned assistant bytes after successful completion.

FastAPI `POST /api/chat` accepts thread/user-message IDs, question, normalized
subject, optional supported language, academic year/grade, material/source
options and `stream:false`. It returns thread/message IDs, answer, sources,
nullable exam tip, used model, retrieval summary, language and creation time.
The backend route is non-streaming; the TanStack route wraps that one response
in the UI stream expected by the authoritative frontend.

The default subject-chat deadline is 90 seconds and its validated range is
100–300,000 ms. Caller cancellation and timeout abort the server-to-server
fetch. Timeout, cancellation, offline backend, invalid payload and backend
non-2xx states are distinct; none creates or stores a fabricated answer.

## Correlation, version and errors

Every FastAPI response includes `X-Request-Id` and
`X-Alim-Contract-Version: 2026-09-18`. Non-2xx bodies contain bounded
`error.code`, public `error.message`, `error.retryable` and `error.request_id`.
Validation never echoes the submitted value. Raw JWTs, prompts, stacks,
provider responses and filesystem paths are excluded.

The TanStack bridge preserves backend status/code/request ID, sanitizes bounded
messages and uses explicit transport codes: `request_cancelled` (499),
`context_backend_timeout` (504), `context_backend_unavailable` (503), and
`invalid_response` (502).

## Liveness and readiness

`GET /health` is public loopback process liveness only. `GET /ready` is a
separate minimal model-runtime readiness probe and returns 503 when not ready.
`GET /api/model/status` is authenticated legacy one-model status. Prompt 04
still owns the frontend's multi-model prepare/operation/capability/admission/
lease/health contracts; current liveness never fabricates those states.

## Other current and future boundaries

- Context compile/events/artifacts and text/private-Storage ingestion are
  authenticated current backend operations.
- Assistant generation/parsing, safety/moderated peer send, assessments and
  multi-model operations remain explicitly missing; their frontend unavailable
  states do not prove backend implementation.
- Google Calendar is not sent to FastAPI.

Executable evidence: `frontend/src/routes/api/chat.ts`,
`frontend/src/lib/context-backend.server.ts`, `backend/app/{auth,config,errors,
contracts,main}.py`, and `tests/contracts/local-backend-v1.json`.
