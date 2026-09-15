```
Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466
```

# Supabase Architecture — Alim / Gymi Genius

This document gives the architectural overview of the Supabase project (`ucacmeadsufiedxrgqit`) and how the
frontend reaches each layer. For exhaustive column-level and policy-level detail, see the authoritative
Supabase docs written in parallel:

- `docs/supabase/DATABASE_SCHEMA.md` — full table/column reference.
- `docs/supabase/RLS_AUTHORIZATION_MATRIX.md` — per-table/per-role policy matrix.
- `docs/supabase/STORAGE_ARCHITECTURE.md` — bucket policies and path conventions.

## Auth (CURRENT — SUPABASE, declared)

Supports: email/password (via `signInWithPassword`/`signUp`), username-based sign-in (Edge Function
`username-login` resolves username → email, then signs in), OAuth (`github`, `linkedin_oidc`, `spotify`),
and Google identity linking (`linkIdentity`, `calendar.readonly` scope) for Planner's Google Calendar card.
Reached from the frontend exclusively through `integrations/supabase/client.ts`.

## PostgreSQL (CURRENT — SUPABASE, declared)

Tables reached by the frontend (see `integrations/supabase/types.ts`): `feedback`, `usage_events`,
`profiles`, `user_preferences`, `media_retention_queue`, `documents`, `document_chunks`,
`assistant_threads`, `assistant_messages`, `assistant_attachments`, `threads`, `messages`. RPC:
`get_storage_usage_status()`. All are protected by RLS (see RLS_AUTHORIZATION_MATRIX.md); production RLS
claims are sourced from frontend code + `supabase/migrations` + `docs/archive/SUPABASE_SERVICES.md`, not
machine-verified against production in this pass.

## Storage (CURRENT — SUPABASE, declared)

Private buckets: `profile-avatars`, `user-materials`, `chat-attachments`, `feedback-messages`,
`activity-logs`, `assistant-descriptors` (descriptor target for `lib/media-retention.ts`
`DESCRIPTOR_BUCKET`). Path convention `<uid>/...` throughout.

## Edge Functions (CURRENT — SUPABASE, declared)

Invoked directly from frontend code:

| Function | Call site | Purpose |
|---|---|---|
| `username-login` | `components/AuthForm.tsx:94` | username → sign-in |
| `username-availability` | `components/AuthForm.tsx:121` | pre-signup availability check (failure must not be treated as taken) |
| `activity-log` | `lib/telemetry.ts:76` | writes `usage_events` row + `activity-logs` storage object |
| `feedback-submit` | `routes/_authenticated/feedback.tsx:64` | writes `feedback` row + `feedback-messages` storage object |
| `storage-emergency-cleanup` | `lib/storage-management.ts:199` | frees storage when quota nears limit |

## RLS layer (CURRENT — SUPABASE, declared / PREVIEW PROJECT ONLY for live evidence)

Preview-project evidence (a different Supabase project from production, schema differs — e.g.
`profiles` is keyed by `id` there vs `user_id` in production): `threads`, `messages`, `assistant_threads`,
`assistant_messages`, `assistant_attachments`, `user_preferences` each have a single `ALL` policy
`user_id = auth.uid()` `TO authenticated`; `profiles` has `ALL` `id = auth.uid()`. `storage.objects` has
per-bucket SELECT/INSERT/UPDATE/DELETE policies for `profile-avatars`, `chat-attachments`,
`user-materials` scoped to `(storage.foldername(name))[1] = auth.uid()::text` `TO authenticated`. Full
production-labelled matrix: `docs/supabase/RLS_AUTHORIZATION_MATRIX.md`.

## Retention infrastructure (CURRENT — SUPABASE, declared)

`media_retention_queue` (id, user_id, attachment_id, media_kind, storage_bucket, object_path,
descriptor_bucket, descriptor_path, source_url, source_path, status, created_at,
`delete_after` default `now() + 30 min`, deleted_at, error_code), driven by `lib/media-retention.ts` and
the `storage-emergency-cleanup` Edge Function.

## How the frontend reaches each layer

All access is mediated by `integrations/supabase/client.ts` (browser) or a request-scoped client created
in `frontend/src/routes/api/chat.ts` (server route, forwards the caller's bearer token — never a service
role key). There is no service-role key usage anywhere in `frontend/src`.

## Diagram

See `SUPABASE_ARCHITECTURE.mmd`.


## Added this pass — authenticated startup flow

Signed out → `/` → `/onboarding/language` (once, CURRENT SUPABASE flag
`language_onboarding_completed`) → `/onboarding/model` (every new browser session, CURRENT
FRONTEND sessionStorage gate `alim.ai_session.v1`) → `/home`. Guard: `_authenticated/route.tsx`.
Model preparation backend (`/api/model/prepare`, `/api/model/operation`) is EXPECTED LOCAL BACKEND
CONTRACT / BACKEND TODO FOR CODEX. Resource policy: 50/50/50 admission, 30/25/30 runtime floors —
CURRENT SUPABASE `get_ai_runtime_policy()`. Model catalog: CURRENT SUPABASE `ai_model_catalog`
(10 Qwen entries), hard-coded list is fallback only. The per-user `auto_storage_cleanup`
preference is REMOVED; storage cleanup is now the platform-wide 5-minute cron job described in
`docs/supabase/STORAGE_LIFECYCLES.md`. See `docs/sequences/POST_LOGIN_STARTUP.mmd`,
`LANGUAGE_ONBOARDING.mmd`, `MODEL_SELECTION_READINESS.mmd`, `MODEL_CACHED_SHARED_DOWNLOAD.mmd`,
`RESOURCE_BLOCKED_NON_AI.mmd`, `SETTINGS_MODEL_RETRY.mmd`, `MODEL_DOWNLOAD_DEDUPLICATION.mmd`,
`AI_SESSION_STATE_MACHINE.mmd`, `STORAGE_CAPACITY_CLEANUP.mmd`.
