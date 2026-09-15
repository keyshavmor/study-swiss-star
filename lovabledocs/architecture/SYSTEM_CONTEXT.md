# System Context

Status: CURRENT — VERIFIED 2026-09-15

Alim combines three authorities:

1. The TanStack/React application owns visible routes, local product state, internationalization, Google Calendar rendering, and the Assistant UI.
2. Live Supabase project `ucacmeadsufiedxrgqit` owns authentication, Postgres/RLS, private Storage, Edge Functions, and the retention schedule.
3. The local FastAPI service owns secure context/RAG/memory/document processing and Qwen inference.

The subject-chat path is browser → TanStack `/api/chat` → verified Supabase ownership → FastAPI `/api/chat` → request-scoped Supabase context → local Qwen. Both server hops use the caller access token; `X-Student-Id` never proves identity.

Google Calendar remains browser-only: Supabase links the Google identity, the provider token exists only in `sessionStorage`, and the Calendar API is read-only. Calendar content and provider tokens never enter FastAPI or telemetry.

General Assistant threads/messages/attachments are production-backed, but assistant generation is not yet connected. No reply is fabricated. The backend currently produces no assistant media.
