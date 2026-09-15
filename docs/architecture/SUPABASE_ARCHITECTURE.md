# Supabase Architecture

Status: CURRENT — LIVE VERIFIED 2026-09-15

Supabase project `ucacmeadsufiedxrgqit` provides Auth, the RLS-protected Data API, private Storage, Edge Functions, Vault, pg_net, and pg_cron. Browser code uses the publishable key plus the active session. TanStack server and FastAPI both verify the caller JWT; FastAPI's request-scoped store uses the same JWT so RLS remains authoritative.

Current frontend state ownership does not automatically follow table existence: assessments, planner events, school links, and related product state remain under browser key `asa.data.v2`. Chat, account/settings, feedback/telemetry, Assistant persistence, and Storage use Supabase according to their specific source modules.

See `docs/supabase/`, generated types, migrations, functions, and `supabase/tests/rls_isolation.sql`.
