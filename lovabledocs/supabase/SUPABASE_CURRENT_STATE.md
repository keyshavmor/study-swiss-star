Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# Supabase current state

## Project identity

- Production Supabase project ref: `ucacmeadsufiedxrgqit`.
- The production project is **not reachable from this sandbox's tooling**. Nothing in this
  documentation set was obtained by querying it directly.
- The sandbox/preview backend used to gather live-policy evidence is a **different** Supabase
  project with a schema that differs from production in at least one place (`public.profiles` is
  keyed by `id` in the preview project, by `user_id` in production per
  `frontend/src/integrations/supabase/types.ts` and `frontend/src/lib/account-data.ts`).

## What is verifiable vs. what is declared

| Claim category | Source | Label used in these docs |
| --- | --- | --- |
| Table shapes, columns, RPC signature | `frontend/src/integrations/supabase/types.ts` (hand-maintained to match the live schema) | CURRENT — SUPABASE (declared from frontend types and migration sources; not machine-verified this pass) |
| `threads`/`messages` DDL, RLS, indexes, triggers | `supabase/migrations/*.sql` | CURRENT — SUPABASE (declared from frontend types and migration sources; not machine-verified this pass) |
| Edge Function contracts, bucket list, admin model | `docs/SUPABASE_SERVICES.md` + frontend call sites | CURRENT — SUPABASE (declared from frontend types and migration sources; not machine-verified this pass) |
| RLS policy text for `threads`, `messages`, `assistant_*`, `user_preferences`, `profiles`, and per-bucket `storage.objects` policies | Preview Supabase project (a different project than production) | PREVIEW-ONLY — observed on the preview project; production is expected but not confirmed to match |
| Local Python backend behaviour | Not in this repo | BACKEND IMPLEMENTATION UNKNOWN / BACKEND TODO FOR CODEX |

**Explicit verification caveat:** every schema, RLS, bucket, and RPC claim about the production
project `ucacmeadsufiedxrgqit` in this documentation set is *declared* from frontend TypeScript
types, `supabase/migrations/*.sql`, and pre-existing docs — it has not been machine-verified against
the live project in this pass. Where preview-project evidence is used to describe likely RLS shape,
it is labelled PREVIEW-ONLY and must not be read as a production guarantee.

## Inventory summary

### Tables (`public` schema, all referenced from `frontend/src/integrations/supabase/types.ts`)

feedback, usage_events, profiles, user_preferences, media_retention_queue, documents,
document_chunks, assistant_threads, assistant_messages, assistant_attachments, messages, threads.

### Storage buckets (all private)

profile-avatars, user-materials, chat-attachments, feedback-messages, activity-logs,
assistant-descriptors.

### RPC functions

- `get_storage_usage_status()` → `StorageUsageStatus[]` (quota/used/remaining/percent/warning/emergency
  flags for a 1 GiB per-user quota). See `frontend/src/lib/storage-management.ts:58-63`.

### Edge Functions invoked from the frontend

username-login, username-availability, activity-log, feedback-submit, storage-emergency-cleanup.
See `docs/supabase/EDGE_FUNCTIONS.md` for full contracts. All are implemented and deployed
externally to this repository (not in `supabase/functions/` here) — CURRENT — EXTERNAL INTEGRATION.

### Other documents in this set

- `DATABASE_SCHEMA.md` / `DATABASE_ERD.mmd` — full table inventory.
- `AUTHENTICATION.md` / `AUTH_STATE_MACHINE.mmd` — auth flows and states.
- `RLS_AUTHORIZATION_MATRIX.md` — access matrices.
- `STORAGE_ARCHITECTURE.md` / `.mmd` and `STORAGE_LIFECYCLES.md` / `.mmd` — buckets and the
  30-minute assistant-media retention lifecycle.
- `EDGE_FUNCTIONS.md` — per-function contracts.
- `USER_PREFERENCES_CONTRACT.md` — `user_preferences.preferences` keys.
