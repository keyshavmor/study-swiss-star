# Local backend contract foundation v1

| Field | Value |
|---|---|
| Owner | Backend API and frontend server adapters |
| Status | `CURRENT — LOCAL BACKEND` for implemented rows; future rows stay explicit gaps |
| Contract version | `2026-09-18` |
| Executable fixture | `tests/contracts/local-backend-v1.json` |
| Last verified | Prompt 04, 2026-09-18 |

## Transport and identity

The TanStack server—not browser code—calls FastAPI at the default loopback URL
`http://127.0.0.1:8001`. Every private request carries the already-verified
Supabase access token as `Authorization: Bearer …`. FastAPI verifies it again
against the configured Supabase project and derives identity only from
`claims.sub`. `X-Student-Id` is optional context and must equal that subject.

Ordinary user data access receives the same caller token plus the publishable
key, so grants and RLS remain authoritative. Neither a service-role key nor
client-supplied user ID substitutes for the caller JWT.

Every response includes `X-Request-Id` and `X-Alim-Contract-Version`. Request
IDs are backend-generated opaque correlation values. JWTs, prompts, raw
provider errors, stacks and filesystem paths never enter response errors or
logs.

## Implemented endpoints

| Method/path | Auth | Semantics |
|---|---|---|
| `GET /health` | public loopback | Process liveness only; HTTP 200 does not mean AI/model readiness |
| `GET /ready` | public loopback | Minimal model-runtime readiness; HTTP 503 and `not_ready` are truthful |
| `GET /api/model/status` | bearer | Legacy diagnostic; `model_id` query returns fail-closed preparation-compatible state without downloading |
| `POST /api/model/prepare` | bearer | Explicitly start/join registry-owned acquire/verify/load operation |
| `GET /api/model/operation/{operation_id}` | bearer | Poll an operation joined by this caller; foreign/missing IDs both return 404 |
| `POST /api/system/capability` | bearer | Measured local capability and catalogue-constrained advisory recommendation |
| `POST /api/system/model/recommendation` | bearer | Recompute the same catalogue-constrained advisory recommendation |
| `POST /api/system/admission/check` | bearer | Create/renew caller capacity lease from supplied current policy |
| `GET /api/system/health` | bearer | Resource/use health with no other-user identity |
| `POST /api/system/session/heartbeat` | bearer | Renew only the caller-owned lease |
| `POST /api/system/runtime/release` | bearer | Best-effort release of one/all caller leases |
| `POST /api/chat` | bearer | Bounded context plus one non-streaming local-model completion |
| `POST /api/context/compile` | bearer | Inspectable bounded context compilation |
| `POST /api/context/events` | bearer | User-scoped learning-event persistence |
| `POST /api/context/artifacts` | bearer | User-scoped reusable artifact persistence |
| `POST /api/context/documents/text` | bearer | Text parse/chunk/embed/index |
| `POST /api/context/documents/storage` | bearer | Owner-prefixed private Storage download, temporary parse, cleanup and indexing |

Missing safety/messaging/assessment routes retain
`EXPECTED LOCAL BACKEND CONTRACT` or `BACKEND GAP` status in the cross-system
index. A reserved path in the fixture does not prove an implementation.

## Model/system invariants

All model/system endpoints use the same bearer verifier and subject/header
cross-check as chat. The request may select only an allowlisted model ID; URLs,
paths, hashes, runtimes and flags come from the backend registry. The capability
catalogue is a caller-supplied constraint from the authenticated Supabase read,
not permission to invent mappings. Empty/unresolved input yields no fabricated
recommendation.

`POST /api/model/prepare` is the explicit acquisition action. Status and
capability probes never trigger a download. Progress is bytes-based or null.
Only state `ready` plus `can_continue_with_ai: true`, after checksum verification
and a live local runtime probe, unlocks AI. Preferences and files named like a
model do not. Operation state is persisted outside Git and transient states
become `operation_interrupted` after API restart.

Admission/heartbeat/release use caller-scoped TTL leases. A background sweeper
reclaims abandoned leases, and an idle runtime stop is attempted only through
the manager owned by this API process. Health reports aggregate counts and
model processes, never another user's identifier or content.

## Subject-chat request and response

The TanStack route first verifies the Supabase token and thread ownership. It
passes that exact token, verified subject, request cancellation signal and the
typed body to FastAPI. The backend body includes thread/user-message IDs,
question, normalized subject, seven-language code when known, academic year,
grade, source flags and `stream:false`.

FastAPI returns thread/message IDs, exact answer bytes, typed source snippets,
nullable exam tip, used model, retrieval summary, language and creation time.
FastAPI streaming is deliberately unsupported in v1. TanStack converts the one
successful response into AI-SDK UI stream parts and persists only those real
assistant bytes. No backend response means no fabricated answer.

The server adapter deadline defaults to 90,000 ms and is bounded to 100–300,000
ms. Caller cancellation and deadline abort both terminate the loopback fetch;
the local model client uses cancellable async HTTP. Mutating operations added
later require idempotency keys rather than blind retries.

## Error envelope

FastAPI non-2xx responses use:

```json
{
  "error": {
    "code": "bounded_snake_case",
    "message": "bounded public message",
    "retryable": false,
    "request_id": "req_opaque"
  }
}
```

Validation errors do not echo invalid input. Unexpected exceptions become
`internal_error`. Auth failures distinguish missing bearer, invalid bearer and
verified-subject/header mismatch without returning verification-provider
detail. The TanStack bridge preserves backend status, bounded code,
retryability and request ID. It uses explicit `request_cancelled`,
`context_backend_timeout`, `context_backend_unavailable` and
`invalid_response` states for transport failures.

## Network configuration

FastAPI binds to `127.0.0.1:8001` by default, validates explicit Host values,
and allows only `http://127.0.0.1:8080` and `http://localhost:8080` for
credentialed CORS. Wildcards and Lovable runtime origins fail startup
validation. Non-loopback/LAN settings require explicit opt-in and separate
operator hardening; they are not a supported default.
