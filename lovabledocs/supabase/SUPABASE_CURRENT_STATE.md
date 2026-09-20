# Supabase current state

Status: CURRENT — LIVE VERIFIED READ-ONLY 2026-09-20

Project `ucacmeadsufiedxrgqit` (`GymmiExamPrep`) is `ACTIVE_HEALTHY` in
`eu-central-2` on Postgres `17.6.1.166`. Prompt 07 made no live change.

## Inventory

- 32 applied migrations through
  `20260917223810_move_privileged_rpc_implementations_out_of_public`; see
  `supabase/LIVE_MIGRATION_HISTORY.md` for exact order and source gaps.
- 37 public tables, all RLS-enabled and each with at least one policy.
- Seven private Storage buckets with explicit size ceilings.
- Seven active Edge Functions. Their retrieved sources and JWT settings are in
  `supabase/functions` and `supabase/config.toml`.
- No public/storage views.
- Extensions include pg_cron 1.6.4, pg_net 0.20.4, pgcrypto, vector 0.8.2,
  Supabase Vault 0.3.1, uuid-ossp, and pg_stat_statements.
- Scheduled media-retention and emergency-capacity cleanup contracts remain
  present; secrets are Vault/environment managed.
- Live-generated production types are in
  `frontend/src/integrations/supabase/types.ts`.

The repository has exact SQL for nine of the 32 applied migrations. Twenty-three
original bodies were never committed and must not be fabricated. A new
undeployed forward migration hardens grants/function paths against the existing
32-entry baseline; clean-local reconstruction remains blocked pending recovery
or an approved baseline dump.

## Security findings

All public tables have RLS, but several sensitive tables retained broad `anon`
table grants that current policies denied. The pending forward migration revokes
all anonymous public-table privileges. Three private quota helpers inherited
PUBLIC execute and writable-schema search paths; direct Data API access was
blocked by absent private-schema USAGE, and the pending migration still removes
those latent privileges and tightens paths.

Security advisors:

- WARN: leaked-password protection disabled.
- WARN: insufficient MFA options.

Both require an owner-approved Auth/UX decision. Performance advisors report 20
unused indexes; none were dropped because current traffic is not representative.
See `SECURITY_AND_DATA_BOUNDARIES.md` for the full audit and operator runbook.
