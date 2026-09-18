# Backend architecture

| Field | Value |
|---|---|
| Owner | Backend |
| Status | `CURRENT — LOCAL BACKEND` with explicit gaps |
| Canonical path | `backend/docs/architecture/SYSTEM.md` |
| Verified | Prompt 04 system/model runtime, 2026-09-18 |

FastAPI binds to `127.0.0.1:8001`. It verifies the caller's Supabase JWT,
derives `claims.sub`, rejects a mismatched `X-Student-Id`, reads/writes ordinary
user data through the caller token and RLS, compiles bounded context, retrieves
local/reference material, and calls an OpenAI-compatible local model process at
`127.0.0.1:8000/v1`.

Implemented modules cover authentication, context configuration/budgeting,
compiler, sparse/dense/hybrid retrieval, reranking, memory, summaries, events,
artifacts, working memory, documents, Supabase/SQLite adapters, model runtime,
platform detection, reviewed model registry, atomic artifact storage, measured
capability/admission, durable operations, leases and orchestration.
Authentication, public error envelopes,
request IDs, contract-version headers, CORS/Host validation and network
configuration are centralized modules rather than route-specific conventions.
SQLite is a deliberately constructed test adapter, not canonical user
persistence.

The model process, model data cache, FastAPI process, frontend process,
Supabase services and
documentation tooling are separate environments/process owners. The current
legacy setup script partially coordinates services but is not the final
centralized launcher contract.

`GET /health` proves only that the API process can answer. `GET /ready`
separately probes the current local model dependency. Private system endpoints
measure hardware and manage caller-scoped leases. Model preparation resolves an
exact server-owned mapping, verifies staged bytes, starts/joins one shared local
operation and marks `ready` only after the loopback runtime answers for the
expected alias. Nine enabled catalogue IDs deliberately remain typed unresolved
rather than being guessed or substituted.

Backend trust boundaries and required security tests are linked from
[`../../../docs/cross-system/SECURITY_AND_DATA_BOUNDARIES.md`](../../../docs/cross-system/SECURITY_AND_DATA_BOUNDARIES.md).
