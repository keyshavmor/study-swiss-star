Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# Storage lifecycles: assistant output media retention

See `docs/supabase/STORAGE_LIFECYCLES.mmd` for the state diagram.

**Scope:** this 30-minute policy covers **assistant OUTPUT media only** — images, audio, video or
other files the assistant generates or fetches as part of a reply. **Ordinary user study uploads
(`user-materials`, `chat-attachments`, `assistant_attachments`) are NOT covered** and are retained
under their own rules (`STORAGE_ARCHITECTURE.md`).

**Safety rule (must never be violated): no descriptor ⇒ the binary must not be deleted.** A row may
only reach a deletable state once `descriptor_path` is populated.

## CURRENT SUPABASE infrastructure (declared; not machine-verified this pass)

- Table `public.media_retention_queue` with `delete_after default now() + 30 minutes`,
  `descriptor_bucket`/`descriptor_path`, `status`, `deleted_at`, `error_code`
  (`frontend/src/integrations/supabase/types.ts:144-194`).
- Private bucket `assistant-descriptors` as the descriptor target.
- RLS presumed `user_id = auth.uid()` on the queue table (not independently confirmed).

## CURRENT FRONTEND contract (`frontend/src/lib/media-retention.ts`)

- `enqueueAssistantMedia()` inserts a row **only when the caller already has a descriptor object
  path** (or explicitly leaves it `pending`); it **never generates descriptors client-side**.
- `listRetentionQueue()` reads the signed-in user's own rows.
- `minutesUntilDeletion()` / `isOriginalExpired()` are pure helpers for UI countdowns; they never
  delete anything themselves.
- The frontend never calls Storage `remove()` on `object_path` for queue rows — deletion is
  exclusively a backend responsibility.

## BACKEND TODO FOR CODEX (not implemented anywhere in this repo)

1. **Descriptor generation** — produce a text/markdown/json descriptor summarizing the assistant
   output media.
2. **Descriptor upload** — write that descriptor into the private `assistant-descriptors` bucket
   under the owner's `<uid>/...` prefix.
3. **Queue enqueue at generation time** — insert/update the `media_retention_queue` row with
   `descriptor_path` set and `status = "descriptor_ready"`, `delete_after = created_at + 30m`.
4. **Cleanup worker** — a scheduled job that, for rows past `delete_after` **and** with a
   non-null `descriptor_path`, deletes the original object at `storage_bucket`/`object_path` and
   stamps `deleted_at`/`error_code` on failure.
5. **Descriptor-based retrieval** — later AI turns must read the descriptor instead of assuming the
   original media still exists once `deleted_at` is set.

None of steps 1–5 exist in the local Python backend or anywhere else in this repository today
(BACKEND IMPLEMENTATION UNKNOWN / BACKEND TODO FOR CODEX).

## Lifecycle narrative

1. **Upload / generation** — the assistant produces or fetches a piece of output media; the binary
   is stored in its bucket (e.g. `chat-attachments`) under `<uid>/...`.
2. **Metadata row** — an `assistant_attachments` row (or equivalent) records the object's
   bucket/path/mime/size.
3. **Descriptor (assistant output media only)** — BACKEND TODO FOR CODEX: a descriptor is generated
   and uploaded to `assistant-descriptors`.
4. **Retention queue** — BACKEND TODO FOR CODEX: a `media_retention_queue` row is enqueued (or the
   frontend's `enqueueAssistantMedia` records one) with `descriptor_path` set and
   `delete_after = created_at + 30 minutes`.
5. **30-minute threshold** — the cleanup worker (BACKEND TODO FOR CODEX) waits until `now() >=
   delete_after`.
6. **Binary removed** — the worker deletes the original Storage object, **only if a descriptor
   already exists**, and stamps `deleted_at`.
7. **Descriptor remains** — the row's `descriptor_path` object in `assistant-descriptors` persists
   as the permanent retrieval surface.
8. **Descriptor-based retrieval** — BACKEND TODO FOR CODEX: subsequent AI turns read the descriptor
   instead of expecting the original binary.

**Ordinary user study uploads are NOT covered by this 30-minute policy** — they persist under the
per-bucket rules in `STORAGE_ARCHITECTURE.md` until the user deletes them or emergency cleanup
intervenes.


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
  `/api/model/operation`, `/api/system/runtime/release`) is REQUIRED FUTURE BACKEND
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
