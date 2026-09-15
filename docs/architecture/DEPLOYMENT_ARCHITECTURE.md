# Deployment Architecture

Status: CURRENT — VERIFIED 2026-09-15

| Layer | Location | Contract |
|---|---|---|
| Browser/TanStack application | web deployment or local development | Uses browser publishable key; server route requires the user's bearer token |
| Supabase | managed `eu-central-2`, project `ucacmeadsufiedxrgqit`, Postgres 17 | Live Auth, RLS, Storage, functions, and pg_cron |
| FastAPI | local AI machine, default `127.0.0.1:8001` | Receives verified caller JWT; never normal-user service role |
| Qwen/llama.cpp | same local AI machine, default `127.0.0.1:8000` | OpenAI-compatible local-only inference |
| Embeddings/web | configured backend providers | Backend-owned and bounded; deterministic embedding fallback is available |

See `backend/.env.example` and `frontend/.env.example`. Do not expose FastAPI broadly without a TLS/authenticated transport layer; bearer tokens cross the TanStack-to-FastAPI boundary.
