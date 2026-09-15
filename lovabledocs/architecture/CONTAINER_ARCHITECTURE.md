# Container Architecture

Status: CURRENT — VERIFIED FROM CODE

| Container | Implemented responsibilities | Source |
|---|---|---|
| Browser application | Current routes/UI, seven-language i18n, local `asa.data.v2` state, Supabase session, read-only Calendar, Assistant persistence | `frontend/src` |
| TanStack server | Bearer verification, thread ownership, canonical message writes, local-backend adapter, AI-SDK stream envelope | `frontend/src/routes/api/chat.ts`, `frontend/src/lib/context-backend.server.ts` |
| Supabase | Auth, RLS Postgres, private Storage, Edge Functions, pg_cron/Vault | `supabase/` plus project `ucacmeadsufiedxrgqit` |
| FastAPI | JWT boundary, request IDs/errors, context compilation, chat, events, artifacts, document ingestion, health/model status | `backend/app/main.py` |
| Context subsystem | intent, budgets, retrieval, RAG, memories, conversation summaries, working memory, artifacts, web | `backend/app/context/` |
| Model runtime | local Qwen download/validation/autostart and OpenAI-compatible inference | `backend/app/services/`, `backend/app/model_*.py` |
