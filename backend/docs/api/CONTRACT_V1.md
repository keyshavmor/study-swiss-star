# Local backend contract foundation v1

| Field | Value |
|---|---|
| Owner | Backend API and frontend server adapters |
| Status | `CURRENT — LOCAL BACKEND` for implemented rows; future rows stay explicit gaps |
| Contract version | `2026-09-18` |
| Executable fixture | `tests/contracts/local-backend-v1.json` |
| Last verified | Prompt 03, 2026-09-18 |

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
| `GET /api/model/status` | bearer | Legacy one-model diagnostic; not the Prompt 04 multi-model contract |
| `POST /api/chat` | bearer | Bounded context plus one non-streaming local-model completion |
| `POST /api/context/compile` | bearer | Inspectable bounded context compilation |
| `POST /api/context/events` | bearer | User-scoped learning-event persistence |
| `POST /api/context/artifacts` | bearer | User-scoped reusable artifact persistence |
| `POST /api/context/documents/text` | bearer | Text parse/chunk/embed/index |
| `POST /api/context/documents/storage` | bearer | Owner-prefixed private Storage download, temporary parse, cleanup and indexing |

Missing model/system/safety/messaging/assessment routes retain
`EXPECTED LOCAL BACKEND CONTRACT` or `BACKEND GAP` status in the cross-system
index. A reserved path in the fixture does not prove an implementation.

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
