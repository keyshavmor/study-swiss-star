# API and operation index

| Field | Value |
|---|---|
| Owner | Frontend/backend contract owners |
| Status | Endpoint-specific below |
| Canonical path | `docs/cross-system/API_INDEX.md` |
| Verified | frontend `f0910e6`; Prompt 03 backend contract tests; 2026-09-18 |

All private FastAPI calls must carry a verified Supabase bearer token. The
backend derives identity from `claims.sub`; `X-Student-Id` is only a cross-check.
Stable non-2xx errors contain bounded codes and request IDs, never secrets,
stacks, prompts, filesystem paths or provider bodies.

| Method/path or operation | Owner/caller | Status | Evidence/next proof |
|---|---|---|---|
| `POST /api/chat` | TanStack `/api/chat` → FastAPI | `CURRENT — LOCAL BACKEND`; exact caller bearer + verified-subject cross-check | Prompt 03 frontend/backend contract tests |
| `GET /health` | operator/backend tests | `CURRENT — LOCAL BACKEND`; liveness only | backend API tests and `backend/app/main.py` |
| `GET /ready` | operator/backend tests | `CURRENT — LOCAL BACKEND`; minimal model readiness, not system health | backend API tests |
| `GET /api/model/status` | model legacy fallback | `CURRENT — LOCAL BACKEND`, authenticated, one configured model only | backend auth/model tests |
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

Frontend request/response field detail lives in
`../contracts/FRONTEND_BACKEND_CONTRACT.md`,
`../../backend/docs/api/CONTRACT_V1.md`, the executable adapters/types, and
`tests/contracts/local-backend-v1.json`. Reserved future paths do not count as
implemented routes.
