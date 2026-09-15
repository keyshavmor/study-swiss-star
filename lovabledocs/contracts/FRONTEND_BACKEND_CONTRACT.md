# Frontend–Backend Contract

Status: CURRENT — IMPLEMENTED 2026-09-15

## Subject chat

Browser `StudyChat` sends its Supabase access token to TanStack `POST /api/chat`. The route:

1. rejects a missing/malformed token with 401;
2. verifies it with `supabase.auth.getClaims(token)`;
3. derives `userId` from verified `sub`;
4. verifies `threads(id,user_id)`;
5. writes the user message;
6. computes response language from current message > UI language > English;
7. calls the server-only adapter with the verified token and identity;
8. emits the backend answer as an AI-SDK UI-message stream;
9. persists the assistant message on successful finish.

The adapter calls FastAPI `POST /api/chat` with:

- `Authorization: Bearer <verified caller token>`
- `X-Student-Id: <verified sub>`
- `Content-Type: application/json`

FastAPI independently verifies the token. A mismatched student header is 403. It never accepts a service-role token or header-only identity.

Request fields include `thread_id`, `user_message_id`, `question`, normalized subject, explicit seven-language `language`, academic year/grade, source/web flags, and `stream:false`.

Response fields are `thread_id`, `message_id`, `answer`, `sources`, `exam_tip`, `used_model`, `retrieval_summary`, `language`, and `created_at`. Failures are not replaced with fabricated replies.

Cancellation from the incoming request aborts the backend fetch; `ALIM_CONTEXT_BACKEND_TIMEOUT_MS` supplies the upper bound. Backend error status/code/request ID is preserved.

Source: `frontend/src/components/StudyChat.tsx`, `frontend/src/routes/api/chat.ts`, `frontend/src/lib/context-backend.server.ts`, `backend/app/main.py`, `backend/app/auth.py`.

## Other boundaries

- Document ingestion exists at FastAPI `/api/context/documents/text` and `/api/context/documents/storage`; current Materials UI has no secure binary upload-to-index action.
- General Assistant persists via live `assistant_*` tables. Generation and parsing remain explicitly deferred; no parallel context system is invented.
- Google Calendar is never sent to FastAPI.
