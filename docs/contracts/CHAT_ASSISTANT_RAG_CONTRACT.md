# Chat, Assistant, materials, and RAG contract

| Field | Value |
|---|---|
| Owners | Frontend, local backend, Supabase |
| Status | Subject chat/RAG current; Assistant generation explicitly unresolved |
| Frontend authority | `study-swiss-star-frontend/main` at `f0910e6971f12efe0ad547b904f6e2a518b13856` |
| Implemented backend baseline | Prompt 05, 2026-09-19 |

## Subject-chat transaction

1. `StudyChat` issues an AI request only while the session AI gate contains a
   backend-confirmed ready model. It sends the selected model ID and UI
   language to TanStack `/api/chat` with the UI messages.
2. TanStack verifies the bearer with Supabase, derives `claims.sub`, reads the
   owned `threads` row, and calls local safety moderation. Anything except an
   explicit `allow` stops before message persistence or inference.
3. TanStack upserts the current user message using its AI-SDK message ID. A
   persistence failure stops the request.
4. The server adapter sends only to loopback FastAPI. It forwards the exact
   bearer, matching `X-Student-Id`, thread and user-message IDs, selected model,
   normalized subject, UI language, effective response language, academic
   scope, retrieval flags, and cancellation signal.
5. FastAPI independently verifies JWT/header identity, verifies the thread
   through caller-token RLS, and repeats the fail-closed safety check. Prompt 07
   owns the concrete moderator; absent/unavailable moderation returns 503.
6. FastAPI resolves the model only through its allowlisted registry, rejects an
   unresolved mapping, probes the local OpenAI-compatible runtime, and rejects
   a mismatch between selected and running model.
7. ContextManager reads only the verified user's messages, chunks, memories,
   learning events, summaries, artifacts, and working memory. It performs
   bounded sparse/dense fusion, deduplication, reranking, optional reference
   retrieval, and exact token budgeting.
8. Course, syllabus, and web excerpts are labelled `UNTRUSTED DATA`; content
   inside them is never treated as an instruction. The local model receives the
   bounded two-message prompt and no remote inference fallback exists.
9. FastAPI derives the assistant ID from verified user + thread + user-message
   ID, persists the exact answer and citation metadata under that stable ID,
   then returns it. TanStack uses that same ID in the AI-SDK stream and upserts
   the final parts. No failed request creates a canned answer.

## Idempotency and interruption

The semantic request body is hashed without storing the raw prompt in logs. A
retry with the same user-message ID and same body returns the persisted answer,
sources, model, language, retrieval summary, and creation time without another
model call. Reusing the ID with changed inputs returns 409
`idempotency_conflict`. Concurrent duplicates are serialized in the supported
single FastAPI process; Supabase's primary key/upsert remains the durable guard.

Browser cancellation aborts the TanStack-to-FastAPI request and async local
model call. If cancellation wins before completed persistence, no assistant
turn is stored. If the response was durably stored just before a disconnect,
the same idempotency key recovers it exactly.

## Response language

The frontend sends both `ui_language` and `language`. `language` is the
confidently detected current-message language when it is one of `en`, `de`,
`gsw`, `ru`, `es`, `fr`, `it`; otherwise it is the UI language. The backend
validates the enum and renders its full language name into the trusted system
instruction. Subject name is not used as a language heuristic. Speech synthesis
remains a browser concern and does not imply server-generated media.

## Sources and retrieval truth

Only context items actually selected into the bounded prompt may appear in
`sources`. Each source carries its stored chunk ID, document ID/name,
section/page/chapter, score, bounded snippet, and URL when applicable. Web
retrieval is optional reference context, never the model runtime. Empty or
failed retrieval yields an empty source list; the backend never invents a
citation.

## Material ingestion

`/api/context/documents/text` accepts bounded text and assigns a stable document
ID for exact repeated content. `/api/context/documents/storage` accepts only a
private `user-materials` path whose first segment exactly equals verified
`claims.sub`. Traversal, backslashes, unsafe filenames, symlinks, unsupported
extensions, MIME/signature mismatches, binary text, malformed DOCX, archive
bombs, excessive PDF pages, and excessive extracted text fail explicitly.

The download is capped at 50 MiB with or without `Content-Length`. Supported
parsers are UTF-8 text/Markdown, PDF, and DOCX. Chunk IDs are deterministic per
document and index, embeddings remain in the backend environment, writes use
caller-token RLS, and temporary files are deleted in `finally`. The current
MaterialsPanel is local metadata UI and does not claim this endpoint is wired.

## General Assistant decision boundary

The current Assistant UI owns separate `assistant_threads`,
`assistant_messages`, `assistant_attachments`, and private `chat-attachments`.
It stores user messages/files and truthfully leaves attachments `unparsed`.
There is no authoritative generation transport: unresolved question 2 still
requires a product choice between `/api/chat` with an explicit mode and a
separate endpoint. Therefore Prompt 05 does not fabricate replies, parse-state
success, or media. Browser speech remains authoritative until unresolved
question 3 decides whether server media belongs in the first release.

## Stable failures

Relevant codes include `invalid_token`, `student_id_mismatch`,
`thread_not_found`, `safety_unavailable`, `content_blocked`, `model_not_ready`,
`model_selection_mismatch`, `model_unavailable`, `idempotency_conflict`,
`context_budget_error`, `embedding_unavailable`, `supabase_unavailable`,
`material_too_large`, `forbidden_material`, `invalid_filename`, and
`unsupported_document`. Errors contain no JWT, prompt, private document,
provider body, stack, or local filesystem path.

## Executable evidence

- `tests/backend/test_api.py`
- `tests/backend/test_chat_rag_contract.py`
- `tests/backend/test_context_core.py`
- `tests/backend/test_context_integration.py`
- `tests/backend/test_supabase_security.py`
- `frontend/src/lib/context-backend.server.test.ts`

Real physical MacBook M4 behavior is not claimed by these tests. The contract
uses portable paths, temporary-file APIs, async HTTP and pure-Python retrieval;
the same API semantics apply to Ubuntu and Apple-silicon macOS. Native model
acceleration remains isolated in the Prompt 04 model-runtime environment.
