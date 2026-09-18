# API and operation index

| Field | Value |
|---|---|
| Owner | Frontend/backend contract owners |
| Status | Endpoint-specific below |
| Canonical path | `docs/cross-system/API_INDEX.md` |
| Verified | frontend `f0910e6`; target backend baseline `bff4ec7`; 2026-09-18 |

All private FastAPI calls must carry a verified Supabase bearer token. The
backend derives identity from `claims.sub`; `X-Student-Id` is only a cross-check.
Stable non-2xx errors contain bounded codes and request IDs, never secrets,
stacks, prompts, filesystem paths or provider bodies.

| Method/path or operation | Owner/caller | Status | Evidence/next proof |
|---|---|---|---|
| `POST /api/chat` | TanStack `/api/chat` → FastAPI | `CURRENT — LOCAL BACKEND`; integration has bearer-forwarding gap | `frontend/src/routes/api/chat.ts`, `backend/app/main.py`; Prompt 03 contract test |
| `GET /health` | operator/backend tests | `CURRENT — LOCAL BACKEND` | backend tests and `backend/app/main.py` |
| `GET /api/model/status` | model legacy fallback | `CURRENT — LOCAL BACKEND`, one configured model only | backend model tests |
| `POST /api/context/compile` | context tools | `CURRENT — LOCAL BACKEND` | backend context tests |
| `POST /api/context/events` | context tools | `CURRENT — LOCAL BACKEND` | backend context store tests |
| `GET/POST /api/context/artifacts` | context tools | `CURRENT — LOCAL BACKEND` | backend artifact tests |
| `POST /api/context/documents/text` | ingestion | `CURRENT — LOCAL BACKEND` | parser/ownership tests |
| `POST /api/context/documents/storage` | private Storage ingestion | `CURRENT — LOCAL BACKEND` | caller-token and owner-prefix tests |
| `POST /api/model/prepare` | model readiness functions | `EXPECTED LOCAL BACKEND CONTRACT` / `BACKEND GAP` | Prompt 04 |
| `GET /api/model/operation/{id}` | model readiness polling | `EXPECTED LOCAL BACKEND CONTRACT` / `BACKEND GAP` | Prompt 04 |
| `POST /api/system/capability` | capability panel | `EXPECTED LOCAL BACKEND CONTRACT` / `BACKEND GAP` | Prompt 04 |
| `POST /api/system/admission/check` | model/admission UX | `EXPECTED LOCAL BACKEND CONTRACT` / `BACKEND GAP` | Prompt 04 |
| `GET /api/system/health` | system health panel | `EXPECTED LOCAL BACKEND CONTRACT` / `BACKEND GAP` | Prompt 04 |
| heartbeat/release/recommendation operations | startup/settings/sign-out | `EXPECTED LOCAL BACKEND CONTRACT` / `BACKEND GAP` | Prompt 04 |
| `POST /api/safety/moderate` | chat/safety adapters | `EXPECTED LOCAL BACKEND CONTRACT` / `BACKEND GAP` | Prompt 05/07; fail closed |
| peer send and attachment scan | messaging UI | `EXPECTED LOCAL BACKEND CONTRACT` / `BACKEND GAP` | Prompt 07; no direct-write fallback |
| Assistant generation/parse | Assistant UI | `BACKEND GAP` | exact transport remains a product decision |
| assessment generation/attempt/grading operations | assessment adapter | `EXPECTED LOCAL BACKEND CONTRACT` / `BACKEND GAP` | Prompt 06; private answer material server-only |

Frontend request/response field detail remains in
`../contracts/FRONTEND_BACKEND_CONTRACT.md` as compatibility evidence and in
the executable adapters/types. Prompt 03 must freeze fixtures before changing
backend behavior.
