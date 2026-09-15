# Supabase Current State

Status: CURRENT — LIVE VERIFIED 2026-09-15

Project `ucacmeadsufiedxrgqit` (`GymmiExamPrep`) is `ACTIVE_HEALTHY` in `eu-central-2` on Postgres 17.6.1.166.

## Applied history

The live migration versions are:

`20260801092601`, `20260801092611`, `20260801092624`, `20260914122222`, `20260914123458`, `20260914131010`, `20260914131340`, `20260914175145`, `20260914193052`, `20260914193520`, `20260914204525`, `20260914204626`, `20260914204647`, `20260914211937`, and `20260914212346`.

Exact repository SQL exists through `20260914131340`. Later live SQL was originally applied outside the checked-in Supabase migration tree; it is not recreated under invented migration filenames. Current generated types, catalog-based docs, Drizzle source where present, and retrieved deployed function sources describe the resulting state. See `supabase/README.md`.

## Runtime inventory

- 27 public tables, all with RLS enabled and at least one policy.
- Six private buckets: `activity-logs`, `assistant-descriptors`, `chat-attachments`, `feedback-messages`, `profile-avatars`, `user-materials`.
- Six active Edge Functions with source checked into `supabase/functions/`.
- One active pg_cron job every minute invoking `media-retention-cleanup` using a Vault-held header secret.
- Generated production types at `frontend/src/integrations/supabase/types.ts`.

No production schema, RLS, Storage, migration-history, function, or scheduler mutation was made by
the reconciliation. A reviewed but unapplied forward migration addresses excessive grants and four
missing FK indexes. Source-level telemetry sanitizer hardening is also pending deployment approval.

## Advisor results

- Security: one warning for authenticated execution of the `SECURITY DEFINER`
  `get_storage_usage_status()` RPC. Review confirmed it rejects missing `auth.uid()`, fixes
  `search_path` to empty, and exposes only aggregate quota usage; definer rights are intentional
  because callers cannot read the private policy table or raw Storage catalog.
- Performance: four missing covering indexes on Assistant/media-retention foreign keys; fixed in
  the pending `20260915115245_reconcile_least_privilege_fk_and_retention.sql` source.
- 25 unused-index informational findings were not acted on because a new/low-traffic project does
  not yet have representative index-use statistics.

Advisor remediation reference: https://supabase.com/docs/guides/database/database-linter
