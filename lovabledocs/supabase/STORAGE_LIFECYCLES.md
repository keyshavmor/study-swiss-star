Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
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
