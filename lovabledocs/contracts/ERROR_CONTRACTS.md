# Error Contracts

Status: CURRENT — IMPLEMENTED

FastAPI errors and handled exceptions return:

```json
{"error":{"code":"invalid_token","message":"Unauthorized","retryable":false,"request_id":"req_..."}}
```

Every FastAPI response has `X-Request-Id`. Authentication failures are 401, identity mismatch is 403, invalid requests are 400/422, missing owned resources are 404, upstream/runtime unavailability is 5xx, and timeouts are surfaced as backend-unavailable errors.

The server-only frontend adapter preserves backend status, code, and request ID. TanStack returns the structured envelope and never includes the caller token, Supabase errors, document content, prompts, or calendar content. Subject chat does not fabricate an assistant message after failure.

Source: `backend/app/main.py`, `frontend/src/lib/context-backend.server.ts`, `frontend/src/routes/api/chat.ts`.
