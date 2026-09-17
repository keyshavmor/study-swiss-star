```
Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
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


## Authenticated startup flow — CURRENT (2026-09-17)

Signed out → `/` (sign in / sign up; authentication NEVER waits on the local AI
backend) → **`/onboarding/language` — MANDATORY once per browser
session**: select a language (persists `user_preferences.preferences.app_language`
as the durable default) or explicitly skip → **`/onboarding/model` — MANDATORY
once per browser session**: system capability probe, recommendation, model
selection and prepare/poll; the app can be entered only after an explicit backend
`ready` confirmation (AI-ready) or an explicit "Continue without AI" (non-AI) →
`/onboarding/compliance` if compliance onboarding is still required (durable,
once, CURRENT SUPABASE `account_compliance`) → `/home`.

- Session gates: `alim.language_session.v1` and `alim.ai_session.v1`
  (`sessionStorage`). They survive a refresh and are cleared on sign-out.
- `language_onboarding_completed` is LEGACY compatibility metadata only — it is
  NOT a gate. `selected_qwen_model` is a durable PREFERENCE and never means the
  model is ready. Runtime/model/GPU readiness is never stored in Supabase.
- Route order is enforced: opening `/onboarding/model` by hand with no language
  decision redirects to `/onboarding/language`, and product routes stay blocked
  until both decisions exist (`startupRedirectFor`, `_authenticated/route.tsx`).
- There is NO mandatory system-admission screen between language and model;
  capability, admission and recommendation data are shown on the model screen.
  `/onboarding/system-admission` remains an optional diagnostics surface.
- Model preparation (`/api/system/capability`, `/api/model/prepare`,
  `/api/model/operation`, `/api/system/release`) is REQUIRED FUTURE BACKEND
  (BACKEND TODO FOR CODEX). Unreachable / 404 / timeout / unparsable ⇒
  `backend_unavailable`, shown truthfully; no values are fabricated.
- Resource policy: 50/50/50 admission, 30/25/30 runtime floors — CURRENT SUPABASE
  `get_ai_runtime_policy()`. Model catalogue: CURRENT SUPABASE `ai_model_catalog`,
  hard-coded list is fallback only.
- AI-dependent actions (chat, quiz/exam generation, grading) are centrally guarded
  (`AiFeatureGate` / `useAiBlocked`): without an AI-ready session no request is
  issued and one localized red notice offers retry model setup, Settings, or
  continuing with non-AI features. Non-AI features stay fully usable.
- The per-user `auto_storage_cleanup` preference is REMOVED; cleanup is the
  platform-wide 5-minute cron in `docs/supabase/STORAGE_LIFECYCLES.md`.

Canonical: `docs/sequences/POST_LOGIN_STARTUP.mmd`,
`docs/sequences/LANGUAGE_ONBOARDING.mmd`,
`docs/backend-handoff/POST_LOGIN_LANGUAGE_MODEL_GATE_HANDOFF.md`.

## Compliance, safety & peer messaging

**Startup order (CURRENT FRONTEND / CURRENT SUPABASE, 2026-09-17):** signed out →
sign in/up → `/onboarding/language` (MANDATORY per-session decision) →
`/onboarding/model` (MANDATORY per-session decision: backend-confirmed `ready`,
or explicit continue-without-AI) → `/onboarding/compliance` if still required
(CURRENT SUPABASE flag `account_compliance.compliance_onboarding_completed`, RPC
`complete_account_compliance_onboarding`) → `/home`. The system
admission gate is NOT part of this order any more; its data is shown on the model
screen and `/onboarding/system-admission` is optional. `account_compliance.account_status
= 'suspended_pending_review'` outranks every other route and redirects to
`/account/suspended`. Legal routes: `/legal/terms`, `/legal/privacy`,
`/legal/acceptable-use`, `/legal/child-safety`. See
`sequences/SIGNUP_ROLE_GUARDIAN_CONSENT.mmd`, `sequences/POST_LOGIN_STARTUP.mmd`.
