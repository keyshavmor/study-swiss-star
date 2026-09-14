Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# RLS / authorization matrix

CURRENT — SUPABASE (declared from frontend types and migration sources; not machine-verified this
pass) for production; rows marked PREVIEW-ONLY were observed on the separate preview Supabase
project and are not confirmed against production.

Per-user isolation is enforced two ways everywhere user-owned data exists:

- **Table rows:** `USING/WITH CHECK (user_id = auth.uid())` (or `id = auth.uid()` on the
  preview project's `profiles`).
- **Storage objects:** `(storage.foldername(name))[1] = auth.uid()::text` — the first path segment
  of every object must equal the caller's own user id.

Anonymous (`anon`) role has **no access to any user-owned data table or private bucket**. The sole
anonymous exception is the `activity-log` Edge Function, which is allowed to accept exactly two
event names (`auth_signin_failed`, `oauth_signin_failed`) for pre-auth telemetry — it does not grant
`anon` any direct table or storage privilege.

## Matrix 1 — Resource × role

| Resource | Anonymous | Authenticated (own row) | Other authenticated users | Admin (`app_metadata.role="admin"`) | Service role |
| --- | --- | --- | --- | --- | --- |
| `public.threads` / `public.messages` | none | full (RLS `user_id = auth.uid()`) — confirmed by migration | none (RLS blocks) | none beyond own rows (no admin bypass declared) | full (explicit `GRANT ALL ... TO service_role`) |
| `public.assistant_threads` / `assistant_messages` / `assistant_attachments` | none | full (PREVIEW-ONLY: `user_id = auth.uid()` ALL policy) | none | none declared | full (Supabase default for `service_role`) |
| `public.profiles` | none | full (PREVIEW-ONLY: `id = auth.uid()`; production key is `user_id`) | none | none declared | full |
| `public.user_preferences` | none | full (PREVIEW-ONLY: `user_id = auth.uid()`) | none | none declared | full |
| `public.documents` / `document_chunks` | none | expected full on own `user_id` (not independently confirmed; loose-column tables) | none | none declared | full |
| `public.media_retention_queue` | none | insert/select own rows via `frontend/src/lib/media-retention.ts` (RLS presumed `user_id = auth.uid()`, not independently confirmed) | none | none declared | full (cleanup worker, BACKEND TODO FOR CODEX) |
| `public.feedback` | none | insert-only via `feedback-submit` function (no direct client insert observed) | none | **read** all rows (`app_metadata.role = "admin"`) | full |
| `public.usage_events` | insert-only, and only for `auth_signin_failed`/`oauth_signin_failed` via `activity-log` function | insert via `activity-log` function; no direct client read observed | none | **read** all rows | full |
| Storage: `profile-avatars`, `chat-attachments`, `user-materials` | none | full within own `<uid>/...` prefix (PREVIEW-ONLY: `(storage.foldername(name))[1] = auth.uid()::text`) | none | none declared | full |
| Storage: `feedback-messages`, `activity-logs` | none (except the two exempted event names above, written via the function's own credentials) | write-once via server-side function only; not client-updatable/deletable | none | audit access presumed via admin tooling, not documented in frontend | full |
| Storage: `assistant-descriptors` | none | expected own-prefix access once backend descriptor generation exists (BACKEND TODO FOR CODEX) | none | none declared | full |

## Matrix 2 — Table/bucket × operation

| Table / bucket | SELECT | INSERT | UPDATE | DELETE | Notes |
| --- | --- | --- | --- | --- | --- |
| `threads` | own rows only | own rows only | own rows only | own rows only (cascades to `messages`) | Confirmed by migration `20260801092601_...sql`; `service_role` has separate `GRANT ALL`. |
| `messages` | own rows only | own rows only | own rows only | own rows only | `role` CHECK restricts to `user/assistant/system/data`; insert triggers `updated_at` bump on parent thread. |
| `assistant_threads` | own rows only | own rows only | own rows only | own rows only | PREVIEW-ONLY evidence. |
| `assistant_messages` | own rows only | own rows only | own rows only | own rows only | PREVIEW-ONLY evidence. |
| `assistant_attachments` | own rows only | own rows only | own rows only (soft delete via `deleted_at`) | not performed by frontend (soft delete instead); Storage object removal handled separately | Frontend never hard-deletes this table; see `storage-management.ts:168-177`. |
| `profiles` | own row only | implicit at signup (backend-managed) | own row only | not exposed to frontend | Production keyed by `user_id`; NOT NULL string columns written as `""` when cleared. |
| `user_preferences` | own row only | own row (`upsert` on `user_id`) | own row | not exposed to frontend | `savePreferences` always upserts merged JSON, never a raw partial update. |
| `documents` | own rows only (defensive `select("*")`) | expected backend-only (context backend ingesting materials) | own rows — frontend only nulls `object_path`/`storage_bucket` and sets `status="deleted"` on user-initiated delete | not a hard delete from frontend | Loose-column table; frontend never assumes fixed schema. |
| `document_chunks` | expected own/backend-scoped | backend-only (embeddings) | backend-only | backend-only | Not read directly by any frontend module found. |
| `media_retention_queue` | own rows only | own rows only, and only once a descriptor already exists client-side | not performed by frontend | not performed by frontend (cleanup worker is BACKEND TODO FOR CODEX) | Frontend never deletes rows; only enqueues/list/reads. |
| `feedback` | admin-only cross-user; otherwise none direct from frontend | via `feedback-submit` function only | not exposed | not exposed | All columns NOT NULL. |
| `usage_events` | admin-only cross-user; otherwise none direct from frontend | via `activity-log` function only (incl. two anonymous event names) | not exposed | not exposed | No `created_at` column — uses `occurred_at`. |
| Storage `profile-avatars` | own prefix (signed URLs only, never public URLs) | own prefix | own prefix (`upsert: true` on avatar replace) | own prefix (old avatar removed on replace/removal) | `frontend/src/lib/account-data.ts:146-184`. |
| Storage `chat-attachments` | own prefix | own prefix | not typically | own prefix (via `deleteStorageItems`) | Path convention `<uid>/<thread_id>/<file>`. |
| Storage `user-materials` | own prefix | backend/upload-flow scoped | not typically | own prefix, via `deleteStorageItems` | |
| Storage `feedback-messages` | not directly by users | function-only (server-side, uses its own privileges) | never | never | Audit trail, not client-updatable/deletable. |
| Storage `activity-logs` | not directly by users | function-only | never | never | Audit trail. |
| Storage `assistant-descriptors` | expected own prefix once implemented | BACKEND TODO FOR CODEX | BACKEND TODO FOR CODEX | BACKEND TODO FOR CODEX | No frontend writer exists; `media-retention.ts` only records the path after the fact. |

## Summary statement

Per-user isolation for every user-owned table is via `user_id = auth.uid()` (or `id = auth.uid()`
on the preview project's `profiles`); per-user isolation for every private bucket is via
`(storage.foldername(name))[1] = auth.uid()::text`. Anonymous (`anon`) has no access to any
user-owned row or private object, with the single narrow exception of two pre-auth failure event
names accepted by the `activity-log` function.
