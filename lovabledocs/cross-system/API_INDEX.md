# API and operation index

| Field | Value |
|---|---|
| Owner | Frontend/backend contract owners |
| Status | Endpoint-specific below |
| Canonical path | `docs/cross-system/API_INDEX.md` |
| Verified | frontend `f0910e6`; Prompt 06 backend/adapter tests; 2026-09-19 |

All private FastAPI calls must carry a verified Supabase bearer token. The
backend derives identity from `claims.sub`; `X-Student-Id` is only a cross-check.
Stable non-2xx errors contain bounded codes and request IDs, never secrets,
stacks, prompts, filesystem paths or provider bodies.

| Method/path or operation | Owner/caller | Status | Evidence/next proof |
|---|---|---|---|
| `POST /api/chat` | TanStack `/api/chat` → FastAPI | `CURRENT — LOCAL BACKEND`; owned, safety-interface gated, model-probed, idempotent exact replay | Prompt 05 tests and `contracts/CHAT_ASSISTANT_RAG_CONTRACT.md` |
| `GET /health` | operator/backend tests | `CURRENT — LOCAL BACKEND`; liveness only | backend API tests and `backend/app/main.py` |
| `GET /ready` | operator/backend tests | `CURRENT — LOCAL BACKEND`; minimal model readiness, not system health | backend API tests |
| `GET /api/model/status` | model legacy fallback | `CURRENT — LOCAL BACKEND`; authenticated; optional model ID is fail-closed and never downloads | backend auth/model tests |
| `POST /api/context/compile` | context tools | `CURRENT — LOCAL BACKEND` | backend context tests |
| `POST /api/context/events` | context tools | `CURRENT — LOCAL BACKEND` | backend context store tests |
| `POST /api/context/artifacts` | context tools | `CURRENT — LOCAL BACKEND` | backend artifact tests |
| `POST /api/context/documents/text` | ingestion | `CURRENT — LOCAL BACKEND` | bounded deterministic parser tests |
| `POST /api/context/documents/storage` | private Storage ingestion | `CURRENT — LOCAL BACKEND` | caller-token, traversal, size and signature tests |
| `POST /api/model/prepare` | model readiness functions | `CURRENT — LOCAL BACKEND`; explicit acquire/verify/load or typed unresolved | Prompt 04 API/artifact tests |
| `GET /api/model/operation/{operation_id}` | model readiness polling | `CURRENT — LOCAL BACKEND`; caller/joiner scoped | Prompt 04 isolation/recovery tests |
| `POST /api/system/capability` | capability panel | `CURRENT — LOCAL BACKEND`; measured/null capability and constrained recommendation | Prompt 04 platform/API tests |
| `POST /api/system/admission/check` | model/admission UX | `CURRENT — LOCAL BACKEND`; caller TTL lease | Prompt 04 lease tests |
| `GET /api/system/health` | system health panel | `CURRENT — LOCAL BACKEND`; aggregate health, no other-user identity | Prompt 04 API tests |
| heartbeat/release/recommendation operations | startup/settings/sign-out | `CURRENT — LOCAL BACKEND` | Prompt 04 API/lease tests |
| `POST /api/safety/moderate` | chat/safety adapters | `EXPECTED LOCAL BACKEND CONTRACT` / `BACKEND GAP` | Prompt 05/07; fail closed |
| peer send and attachment scan | messaging UI | `EXPECTED LOCAL BACKEND CONTRACT` / `BACKEND GAP` | Prompt 07; no direct-write fallback |
| Assistant generation/parse | Assistant UI | `BACKEND GAP` | exact transport remains a product decision |
| `POST /api/assessments/generation` | assessment server adapter | `CURRENT — LOCAL BACKEND`; authenticated, idempotent, safety/model gated | Prompt 06 tests; private answer material server-only |
| generation status/cancel | assessment server adapter | `CURRENT — LOCAL BACKEND`; owner-scoped 404 and bounded lifecycle | Prompt 06 tests |
| attempt begin/heartbeat/submit/abandon | assessment server adapter | `CURRENT — LOCAL BACKEND`; server time, snapshot checks, exact replay | Prompt 06 tests |
| grading status/result | assessment server adapter | `CURRENT — LOCAL BACKEND`; deterministic/objective plus bounded local-model subjective grading | Prompt 06 tests |
| Study Plan, Knowledge Profile AI refresh, Subject Tools | no settled caller control | `EXPLICITLY UNSUPPORTED` | authoritative frontend remains placeholder/read-only |

Frontend request/response field detail lives in
`../contracts/FRONTEND_BACKEND_CONTRACT.md`,
`../../backend/docs/api/CONTRACT_V1.md`, the executable adapters/types, and
`tests/contracts/local-backend-v1.json`. Reserved future paths do not count as
implemented routes.
