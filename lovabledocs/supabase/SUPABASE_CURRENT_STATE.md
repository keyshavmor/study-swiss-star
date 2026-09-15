# Supabase Current State

Status: CURRENT — LIVE VERIFIED 2026-09-15

Project `ucacmeadsufiedxrgqit` (`GymmiExamPrep`) is `ACTIVE_HEALTHY` in `eu-central-2` on Postgres 17.6.1.166.

## Applied history

The live project has 21 applied migrations through
`20260915105236_cover_media_retention_attachment_owner_fk`. The exact ordered inventory and source
availability are recorded in `supabase/LIVE_MIGRATION_HISTORY.md`.

Exact repository SQL exists through `20260914131340`. Later live SQL was originally applied outside the checked-in Supabase migration tree; it is not recreated under invented migration filenames. Current generated types, catalog-based docs, Drizzle source where present, and retrieved deployed function sources describe the resulting state. See `supabase/README.md`.

## Runtime inventory

- 28 public tables, all with RLS enabled and at least one policy. `ai_model_catalog` is the only
  global catalog: authenticated users have read-only access to its 10 model rows.
- Six private buckets: `activity-logs`, `assistant-descriptors`, `chat-attachments`, `feedback-messages`, `profile-avatars`, `user-materials`.
- Six active Edge Functions with exact current source checked into `supabase/functions/`.
- Two active Vault-authenticated pg_cron jobs: media retention every minute and global storage
  capacity cleanup every five minutes.
- Generated production types at `frontend/src/integrations/supabase/types.ts`.

This reconciliation applied `20260915105026` and `20260915105236`, removing unnecessary Data API
privileges, adding owner-bound retention constraints/FK, and covering all previously reported foreign
keys. It deployed exact v2 sources for `activity-log`, `feedback-submit`, and
`media-retention-cleanup`. Four unrelated migrations and `storage-emergency-cleanup` v2 arrived
concurrently; they were preserved and documented rather than overwritten.

## Advisor results

- Security: two warnings for authenticated execution of the intentionally `SECURITY DEFINER`
  `get_storage_usage_status()` and `get_ai_runtime_policy()` RPCs. Both have an empty search path,
  authenticated-only ACL, and an `auth.uid()` guard; they return bounded configuration/aggregate
  data from private tables.
- Performance: zero unindexed-foreign-key findings after the follow-up composite index migration.
- 29 unused-index informational findings were not acted on because a new/low-traffic project does
  not yet have representative index-use statistics.

Advisor remediation reference: https://supabase.com/docs/guides/database/database-linter
