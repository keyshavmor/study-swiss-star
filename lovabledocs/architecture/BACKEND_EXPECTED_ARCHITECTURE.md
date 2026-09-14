```
Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466
```

# Backend Expected Architecture — local Python backend

**Important**: the GitHub `backend/` tree exists in this repo, but per project rules it is **NOT
authoritative** for documenting backend behaviour — it may be stale or aspirational. This document derives
the expected shape of the local backend **only** from the frontend contract in
`frontend/src/lib/context-backend.server.ts` and `frontend/src/routes/api/chat.ts`. The `backend/app` tree
is listed below purely for engineering orientation.

## Visible (non-authoritative) backend tree

```
backend/app/
├── main.py
├── model_spec.py
├── platform.py
├── context/
│   ├── artifacts/manager.py
│   ├── memory/{conversation,episodic,student}.py
│   ├── retrieval/{base,common,dense,hybrid,reranker,sparse}.py
│   ├── tokenization/counter.py
│   ├── budget.py, compiler.py, config.py, intent.py, manager.py, models.py, store.py, text.py, web.py
└── services/
    ├── documents.py
    ├── llm.py
    └── model_runtime.py
```
Every box below is labelled EXPECTED BACKEND CONTRACT (visible at the frontend boundary) or BACKEND
IMPLEMENTATION UNKNOWN (everything else) — the tree above must not be read as confirmation of what any of
these files actually do.

## Contract-derived components

- **Chat endpoint** — `POST /api/chat` on `http://127.0.0.1:8001` (default,
  `ALIM_CONTEXT_BACKEND_URL`). Request headers: `Content-Type: application/json`,
  `X-Student-Id: <supabase user id>` (context only — **not** an authorization boundary). Request body:
  `{ thread_id, user_message_id, question, subject_id, language ("de"|"en"|"fr"), academic_year,
  grade_level, include_sources: true, allow_web: true, stream: false }`. Timeout
  `ALIM_CONTEXT_BACKEND_TIMEOUT_MS` (default 90000ms) via `AbortController`. — EXPECTED BACKEND CONTRACT.
- **Response contract** — `ContextChatResponse { thread_id, message_id, answer, sources[{source_id,
  material_id, material_name, section, page, chapter?, snippet, score, url}], exam_tip, used_model,
  retrieval_summary{chunks_considered, chunks_used, collections}, language, created_at }`, or an error
  envelope `{ error: { code, message } }` with codes `context_backend_error`, `invalid_response`,
  `context_backend_unavailable`. — EXPECTED BACKEND CONTRACT.
- **Context manager** — implied by the request needing subject/thread/academic-year context and by
  `retrieval_summary` in the response — BACKEND IMPLEMENTATION UNKNOWN.
- **Retrieval / RAG** — implied by `include_sources`, `sources[]`, `retrieval_summary.collections` —
  BACKEND IMPLEMENTATION UNKNOWN.
- **Document processing** — implied by `sources[].material_id/material_name/section/page/chapter` —
  BACKEND IMPLEMENTATION UNKNOWN.
- **Student memory** — no explicit field in the contract; only `thread_id`/`academic_year`/`grade_level`
  are passed — BACKEND IMPLEMENTATION UNKNOWN.
- **AI orchestration** — implied by `used_model` in the response — BACKEND IMPLEMENTATION UNKNOWN.
- **Local model interface** — implied by `used_model` and the separate local model runtime on `:8000` —
  BACKEND IMPLEMENTATION UNKNOWN.
- **Media processing** — no field in the contract references attachments; the frontend attachment flow
  (`assistant_attachments`) is not shown to reach this endpoint — BACKEND IMPLEMENTATION UNKNOWN.
- **Web retrieval** — implied only by the `allow_web: true` request flag — BACKEND IMPLEMENTATION UNKNOWN.

## Explicitly NOT implemented / UNKNOWN (per FACTS.md)

Response-language enforcement, audio/TTS generation, media descriptor generation, 30-minute retention
cleanup, quiz/exam/grading/study-plan endpoints, general Assistant generation and attachment parsing
(the frontend never fabricates `assistant_messages` assistant rows itself, implying a backend/Edge Function
must, but none is currently invoked from `frontend/src`).

## Diagram

See `BACKEND_EXPECTED_ARCHITECTURE.mmd`.
