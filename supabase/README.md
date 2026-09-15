# Supabase source and deployment authority

Project `ucacmeadsufiedxrgqit` owns authentication, Postgres/RLS, private Storage, durable user
state, tutoring transcripts/context, Assistant history, telemetry, and media-retention scheduling.
FastAPI performs tutoring AI computation locally.

- `migrations/` contains the exact historical SQL available in Git through
  `20260914131340_cover_composite_foreign_keys.sql`.
- `LIVE_MIGRATION_HISTORY.md` records every live migration and explicitly identifies later SQL
  whose original source is not available in either authoritative clone.
- `functions/` contains source fetched from each deployed Edge Function on 2026-09-15, plus the
  reviewed telemetry-key hardening made during reconciliation.
- `config.toml` records each live function's `verify_jwt` mode.
- `tests/rls_isolation.sql` is a local-database, rollback-only isolation test. Never run it against
  the linked production project.

The live Supabase migration table is the deployment-history authority. Drizzle files are retained
for application development but are not a complete production migration history. Never use
`supabase db reset --linked`, never expose a secret/service-role key to the browser, and do not
invent replacement SQL for unavailable historical migrations.

See [`../docs/supabase/SUPABASE_CURRENT_STATE.md`](../docs/supabase/SUPABASE_CURRENT_STATE.md) and
[`../docs/supabase/RLS_AUTHORIZATION_MATRIX.md`](../docs/supabase/RLS_AUTHORIZATION_MATRIX.md).
