# Backend API documentation

| Field | Value |
|---|---|
| Owner | Backend API |
| Status | Endpoint-specific |
| Canonical path | `backend/docs/api/README.md` |
| Verified | Prompt 05 chat/RAG contract, 2026-09-19 |

The canonical implemented/expected endpoint registry is
[`../../../docs/cross-system/API_INDEX.md`](../../../docs/cross-system/API_INDEX.md).
Executable schemas and handlers remain the final evidence in `backend/app`, the
[versioned contract foundation](CONTRACT_V1.md), and its executable JSON
fixture.

Private endpoints require `Authorization: Bearer <Supabase access token>`.
Identity is `claims.sub`; headers and body IDs are cross-checked context. Errors
use non-2xx status plus bounded machine codes/request IDs. Raw stacks, JWTs,
prompts, provider bodies and filesystem paths never belong in responses.

`GET /health` is process liveness. `GET /ready` is model-dependent readiness;
they are intentionally separate. Private endpoints, including legacy
`/api/model/status`, share one central bearer authenticator. The response
contract version is `2026-09-18` and every response carries a backend-generated
request ID.

Chat uses its required user-message ID for exact durable replay. Other mutating
operations require explicit idempotency; long-running model/assessment work
requires operation IDs, cancellation, timeout and restart recovery. A frontend
type or documentation row alone does not prove an endpoint exists.
