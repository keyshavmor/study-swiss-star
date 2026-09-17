Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
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
| Edge Function contracts, bucket list, admin model | `docs/archive/SUPABASE_SERVICES.md` + frontend call sites | CURRENT — SUPABASE (declared from frontend types and migration sources; not machine-verified this pass) |
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

## Post-login gate state ownership (2026-09-17)

Supabase stores DURABLE PREFERENCES only, inside the existing
`public.user_preferences.preferences` JSON — no DDL/migration was added for this
flow:

- `app_language` — default used to preselect the per-session language screen.
- `selected_qwen_model` — preferred model; never a statement about readiness.
- `language_onboarding_completed` — LEGACY compatibility metadata, not a gate.

Supabase never stores model/GPU/runtime readiness, admission leases or session
decisions. Those live in `sessionStorage` (`alim.language_session.v1`,
`alim.ai_session.v1`, `alim.admission_session.v1`) and are cleared on sign-out.