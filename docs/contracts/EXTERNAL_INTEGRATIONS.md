# External Integrations

Status: CURRENT — VERIFIED 2026-09-15

## Supabase

Auth, RLS Data API, private Storage, Edge Functions, Vault, and pg_cron. Browser and normal backend access use the publishable key; only tightly scoped trusted Edge Functions use service-role.

## Google Calendar

Frontend-only read integration. `supabase.auth.linkIdentity({provider:"google"})` requests only `calendar.readonly`. Provider token is held in `sessionStorage`; events are rendered as `readOnly` planner occurrences and are never mutated, persisted, logged, or sent to FastAPI.

## Local model

FastAPI calls a local OpenAI-compatible Qwen/llama.cpp endpoint, default `127.0.0.1:8000`. Model download/runtime behavior is backend-owned.

## Web retrieval

Optional, bounded backend retrieval selected by configuration. Retrieved text is labelled untrusted reference context.

There is no Apple-service integration and no Lovable AI Gateway fallback in chat.
