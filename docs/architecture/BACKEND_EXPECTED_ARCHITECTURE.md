# Verified Backend Architecture

Status: CURRENT — VERIFIED FROM SOURCE

Verified 2026-09-15 against frontend `main` `e4bf042a826d94b94175530f95ff7e11a5ccdc76`, backend branch start `91ddfe1f7aef1f9f8d2e4b3088abcc203865395d`, and live Supabase project `ucacmeadsufiedxrgqit`.

The filename is retained for inbound links; the architecture is implemented, not hypothetical.

## Runtime

- `backend/app/main.py` exposes FastAPI on `127.0.0.1:8001`.
- `backend/app/auth.py` verifies the caller's real Supabase access token. Identity is the verified `sub`; `X-Student-Id` is optional context and must match.
- `frontend/src/routes/api/chat.ts` verifies the same token and checks thread ownership before calling the backend.
- `frontend/src/lib/context-backend.server.ts` forwards the bearer token and matching student ID only over the server-to-server hop.
- `backend/app/context/` owns intent analysis, exact prompt compilation, budgets, retrieval, memory, summaries, artifacts, working memory, embeddings, and optional web retrieval.
- `backend/app/context/store_supabase.py` is request scoped and uses a publishable key plus caller JWT, leaving RLS authoritative.
- `backend/app/services/documents.py` chunks and embeds text/PDF/DOCX input. The Storage endpoint downloads a private `user-materials` object with the caller JWT and deletes the temporary file in `finally`.
- `backend/app/services/llm.py` calls an OpenAI-compatible local model server.
- `backend/app/services/model_runtime.py` and platform/model modules manage the local Qwen/llama.cpp runtime on `127.0.0.1:8000`.
- `/health` and `/api/model/status` expose operational state without credentials.
- Stable JSON error envelopes and `X-Request-Id` are provided by `backend/app/main.py`.

## Boundaries

Supabase Auth proves identity. Supabase Postgres and Storage retain per-user state. FastAPI compiles context and performs local inference. The browser never receives a service-role/secret key, and FastAPI uses no service-role key for normal user requests.

Subject chat is integrated end to end. General Assistant persistence exists in `assistant_*` tables, but generation/attachment parsing remains deferred because the current product defines no backend endpoint contract. The backend produces no media, so descriptor generation has no active producer; the deployed cleanup consumer is nevertheless live and enforces descriptor-first deletion.
