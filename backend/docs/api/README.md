# Backend API documentation

| Field | Value |
|---|---|
| Owner | Backend API |
| Status | Endpoint-specific |
| Canonical path | `backend/docs/api/README.md` |
| Verified | target baseline `bff4ec7`, 2026-09-18 |

The canonical implemented/expected endpoint registry is
[`../../../docs/cross-system/API_INDEX.md`](../../../docs/cross-system/API_INDEX.md).
Executable schemas and handlers remain the final evidence in `backend/app` and
contract fixtures added by later prompts.

Private endpoints require `Authorization: Bearer <Supabase access token>`.
Identity is `claims.sub`; headers and body IDs are cross-checked context. Errors
use non-2xx status plus bounded machine codes/request IDs. Raw stacks, JWTs,
prompts, provider bodies and filesystem paths never belong in responses.

Mutating future operations require idempotency; long-running model/assessment
work requires operation IDs, cancellation, timeout and restart recovery. A
frontend type or documentation row alone does not prove an endpoint exists.
