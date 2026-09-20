# Verified Backend Architecture

Status: CURRENT — VERIFIED FROM SOURCE

Verified 2026-09-19 against authoritative frontend `main`
`f0910e6971f12efe0ad547b904f6e2a518b13856`, Prompt 06 target code, and
read-only Supabase evidence for project `ucacmeadsufiedxrgqit`.

The filename is retained for inbound links; the architecture is implemented, not hypothetical.

## Runtime

- `backend/app/main.py` exposes FastAPI on `127.0.0.1:8001`.
- `backend/app/auth.py` verifies the caller's real Supabase access token. Identity is the verified `sub`; `X-Student-Id` is optional context and must match.
- `frontend/src/routes/api/chat.ts` verifies the same token and checks thread ownership before calling the backend.
- `frontend/src/lib/context-backend.server.ts` forwards the bearer token and matching student ID only over the server-to-server hop.
- `backend/app/context/` owns intent analysis, exact prompt compilation, budgets, retrieval, memory, summaries, artifacts, working memory, embeddings, and optional web retrieval.
- `backend/app/context/store_supabase.py` is request scoped and uses a publishable key plus caller JWT, leaving RLS authoritative.
- `backend/app/assessment/` owns strict generation contracts, private keys, restart-safe lifecycle, timing, scoring, local-model subjective grading and caller-JWT public persistence.
- `frontend/src/lib/assessment-backend.server.ts` and authenticated TanStack server functions connect the existing assessment abstraction to loopback FastAPI without exposing the bearer token to a new browser destination.
- `backend/app/services/documents.py` bounds, signature-checks, deterministically chunks and embeds text/PDF/DOCX input. The Storage endpoint rejects traversal, downloads at most 50 MiB from private `user-materials` with the caller JWT, and deletes the temporary file in `finally`.
- `backend/app/services/llm.py` calls an OpenAI-compatible local model server.
- `backend/app/services/model_runtime.py` and platform/model modules manage the local Qwen/llama.cpp runtime on `127.0.0.1:8000`.
- `/health` is public loopback liveness; `/ready` is runtime readiness and all `/api/model/*` diagnostics require bearer authentication.
- Stable JSON error envelopes and `X-Request-Id` are provided by `backend/app/main.py`.

## Boundaries

Supabase Auth proves identity. Supabase Postgres and Storage retain per-user state. FastAPI compiles context and performs local inference. The browser never receives a service-role/secret key, and FastAPI uses no service-role key for normal user requests.

Subject chat is integrated with stable idempotency, double thread/identity checks,
explicit response language, truthful citations, local-model readiness, and a
backend safety interface. It intentionally returns `safety_unavailable` until
Prompt 07 wires the concrete moderator. General Assistant persistence exists in
`assistant_*` tables, but generation/attachment parsing remains deferred because
the current product defines no backend endpoint contract. The backend produces
no media, so descriptor generation has no active producer; the deployed cleanup
consumer is nevertheless live and enforces descriptor-first deletion.

Quiz and mock-exam generation, begin/heartbeat/submit/abandon, grading status and
result retrieval are integrated. FastAPI keeps answer keys in a private local
mode-0600 database and exposes only strict public questions. It verifies stored
snapshots and server timing, deterministically scores objective answers, bounds
local-model subjective awards, recomputes totals and persists sanitized records
through the caller JWT. The assessment path also fails closed until Prompt 07
wires the concrete moderator. Study Plan, Knowledge Profile AI refresh and
Subject Tools remain explicit product-contract gaps.
