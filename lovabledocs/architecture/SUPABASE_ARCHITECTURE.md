# Supabase Architecture

Status: CURRENT — LIVE VERIFIED READ-ONLY 2026-09-20

Supabase project `ucacmeadsufiedxrgqit` provides Auth, the RLS-protected Data API, private Storage, Edge Functions, Vault, pg_net, and pg_cron. Browser code uses the publishable key plus the active session. TanStack server and FastAPI both verify the caller JWT; FastAPI's request-scoped store uses the same JWT so RLS remains authoritative.

Current frontend state ownership does not automatically follow table existence: assessments, planner events, school links, and related product state remain under browser key `asa.data.v2`. Chat, account/settings, feedback/telemetry, Assistant persistence, and Storage use Supabase according to their specific source modules.

The live runtime also exposes an authenticated-read-only `ai_model_catalog` and guarded
`get_ai_runtime_policy()` RPC. Vault-backed schedules invoke media retention every minute and global
storage-capacity cleanup every five minutes. The latter is a system policy, not a user preference.

The current inventory is 37 RLS-enabled public tables, seven private buckets,
seven Edge Functions, and 32 applied migrations. Twenty-three original
migration bodies are absent from Git, so clean-reset equivalence is not yet
claimed. See `docs/supabase/`, generated types, migrations, functions,
`supabase/tests/rls_isolation.sql`, and `supabase/tests/security_contract.sql`.

Data-rights deletion is a caller-bound two-stage operation. The authenticated
TanStack function first purges caller-owned local FastAPI data and proceeds to
the `delete-my-data` Edge Function only on success. Both boundaries independently
verify the same bearer identity; neither accepts a target user identifier.
