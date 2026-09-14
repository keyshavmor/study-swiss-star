# Plan: auth providers, settings, general AI chat, docs

Frontend/UI + database/storage additions + documentation only. No Python backend, model runtime, RAG or context-manager files are touched.

## What you will see when this is done

- Sign-in page with email + password (including a password-reset flow) and three social buttons: GitHub, LinkedIn, Spotify. Apple, Google and Microsoft are gone from the interface.
- Settings gains three new sections: **Storage**, **Local model**, **Account**. Choices are saved to your account, so they follow you across devices.
- Storage section shows how much of your space is used and left, warns when 10% or less remains, lets you filter your stored items by kind and date, tick the ones you want to delete, and switch on automatic clean-up (removes the oldest 5% of your items when 1% or less is left).
- Account section lets you change profile picture, email, phone/contact details, nationality, username and password.
- A new **Assistant** area, separate from the school/tutoring pages, that works like a normal chat app: multiple conversations in a sidebar, each with its own web address, all saved to your account. You can attach images, audio, video (each up to 1 MB) plus PDF and DOCX files; files are stored privately under your own account folder.
- Docs and wireframes updated to describe all of the above.

The new Assistant area stores messages and attachments only. It does not generate answers by itself and no backend code is changed, so replies stay wired to whatever the existing chat endpoint already does — attachments are recorded for the backend to pick up later, not parsed now.

## Current state (verified)

- `frontend/src/components/AuthForm.tsx` currently calls `supabase.auth.signInWithOAuth` for `google`, `apple`, `azure`; email/password sign-in and sign-up exist; there is no reset-password flow.
- Database has only `public.threads` and `public.messages` (per `frontend/src/integrations/supabase/types.ts`), with composite FK `messages_thread_owner_fkey` and per-user RLS/index migrations in `drizzle/migrations/0000_*`, `0001_*`.
- Storage has one private bucket `user-materials` with four per-user-prefix policies.
- `frontend/src/routes/_authenticated/settings.tsx` is four decorative switches only; profile data lives in localStorage via `frontend/src/lib/store/app-data.tsx`.
- Existing tutoring chat: `frontend/src/routes/_authenticated/chat.$threadId.tsx`, `chat.index.tsx`, `frontend/src/components/StudyChat.tsx`, `frontend/src/lib/chat.functions.ts`, `frontend/src/routes/api/chat.ts`.

## 1. Authentication UI

- `frontend/src/components/AuthForm.tsx` — replace the three OAuth buttons with `github`, `linkedin_oidc`, `spotify` (Supabase's LinkedIn provider id is `linkedin_oidc`); keep the existing card layout, `Button variant="outline"`, spacing and copy style. Add a third mode `reset` with "Forgot password?" link calling `supabase.auth.resetPasswordForEmail(email, { redirectTo: ${origin}/auth/update-password })`.
- New `frontend/src/routes/auth.update-password.tsx` — minimal page in the same visual language that calls `supabase.auth.updateUser({ password })` after the recovery link establishes a session.
- Grep-and-clean any Apple/Google/Microsoft/azure mentions in UI strings and docs.

## 2–4. Settings (storage, model, account)

- New `frontend/src/lib/settings.functions.ts` (authenticated server fns): `getUserSettings`, `updateUserSettings`.
- New `frontend/src/lib/storage-usage.functions.ts`: `listUserObjects` (lists `user-materials/<uid>/…` and `chat-attachments/<uid>/…` via the user-scoped client), `deleteUserObjects(paths[])` (each path re-checked to start with the caller's uid), `runAutoCleanup` (oldest 5% by `created_at` when <=1% free and the preference is on).
- New `frontend/src/lib/account.functions.ts`: username/nationality/contact updates to `profiles`; email + password go through `supabase.auth.updateUser` client-side.
- New components under `frontend/src/components/app/settings/`: `StorageUsageSection.tsx` (usage bar, `<=10%` warning banner using existing `--warning` token, type/date filters, checkbox selection + delete with confirm, auto-cleanup switch), `ModelSelectorSection.tsx`, `AccountSection.tsx` (avatar upload to `avatars/<uid>/…`, email, contact, nationality, username, password).
- `frontend/src/routes/_authenticated/settings.tsx` — compose the new sections above the existing preference switches; the existing switches also become persisted settings columns.
- `frontend/src/routes/_authenticated/profile.tsx` — read name/avatar/nationality/contact from Supabase when present, falling back to the local store so nothing breaks.
- Model list (descending, 10 entries, display-only selector): Qwen3.8-27B, Qwen3-32B, Qwen3-14B, Qwen3-8B, Qwen2.5-7B-Instruct, Qwen3-4B, Qwen2.5-3B-Instruct, Qwen3-1.7B, Qwen2.5-1.5B-Instruct, Qwen3-0.6B. Stored as a string; no execution code changed.

## 5. General AI chat area

- Routes: `frontend/src/routes/_authenticated/assistant.index.tsx` (create/redirect to newest conversation) and `assistant.$conversationId.tsx`, mirroring the existing chat route pattern.
- `frontend/src/components/assistant/AssistantChat.tsx` + `ConversationList.tsx` — built from the installed `frontend/src/components/ai-elements/*` primitives (conversation, message, prompt-input, shimmer), styled with existing tokens. Distinct heading/icon so it reads as general-purpose, not tutoring.
- `frontend/src/lib/assistant.functions.ts` — conversation/message CRUD scoped to `context.userId`, same shape as `chat.functions.ts`.
- `frontend/src/lib/attachments.functions.ts` — signed upload URL issuing + metadata insert; client-side validation rejects >1 MB media before upload and shows a clear per-file error; PDF/DOCX allowed with a larger cap (proposal: 10 MB) since the 1 MB rule was stated for media only.
- Nav: add "Assistant" to `frontend/src/components/app/AppHeader.tsx` NAV and `MobileNavigation.tsx`.
- Attachment UI states an explicit note that files are stored for the backend and not yet analysed.

## Schema and storage additions (new migration, additive only)

New `drizzle/migrations/0002_settings_profiles_assistant_attachments.sql`:

- `public.profiles` — `id uuid PK references auth.users on delete cascade`, `username citext unique`, `full_name`, `avatar_path`, `contact_phone`, `contact_address`, `nationality`, timestamps.
- `public.user_settings` — `user_id uuid PK references auth.users`, `selected_model text`, `auto_cleanup_enabled boolean default false`, `storage_quota_bytes bigint default 524288000`, the four existing preference booleans, timestamps.
- `public.assistant_conversations` — `id uuid PK`, `user_id`, `title`, timestamps, `UNIQUE (id, user_id)`.
- `public.assistant_messages` — `id uuid PK`, `conversation_id`, `user_id`, `role`, `content`, `parts jsonb`, `created_at`, composite FK to `(id, user_id)`.
- `public.attachments` — `id uuid PK`, `user_id`, `conversation_id nullable`, `message_id nullable`, `bucket`, `object_path`, `file_name`, `mime_type`, `byte_size`, `kind`, `parsed_status text default 'unparsed'`, `created_at`.
- For every table: `GRANT SELECT, INSERT, UPDATE, DELETE … TO authenticated` + `GRANT ALL … TO service_role`, `ENABLE ROW LEVEL SECURITY`, and per-command policies using `(SELECT auth.uid())`, plus `user_id` indexes.
- New private bucket `chat-attachments` and public-read bucket-free `avatars` (proposal: private `avatars` with signed URLs, to avoid any public bucket) created through the Storage tooling, each with the same four `(storage.foldername(name))[1] = auth.uid()::text` policies as `user-materials`.
- Nothing dropped, nothing altered on `threads`/`messages`.
- Regenerate `frontend/src/integrations/supabase/types.ts`.

## 6. Documentation and wireframes

Update in both `docs/` and `lovabledocs/` (kept in sync):
`README_FRONTEND_HANDOFF.md`, `FRONTEND_ARCHITECTURE.md`, `ROUTE_SCREEN_MAP.md`, `UI_BACKEND_MAPPING.md`, `API_EXPECTATIONS.md`, `FRONTEND_DATA_MODEL.md`, `STATE_AND_STORAGE.md`, `USER_FLOWS.md`, `COMPONENT_TREE.md`, `BACKEND_INTEGRATION_TODO.md`, `OPEN_QUESTIONS_FOR_BACKEND.md`, `FULL_APP_WIREFRAMES.md`; wireframes `02-routes-navigation.mmd`, `05-authentication.mmd`, `09-chat.mmd`, `14-supporting-screens.mmd`, and new `16-general-assistant.mmd`, `17-settings-storage.mmd`. Root `README.md` directory tree refreshed.

## Risks and open questions

1. **Storage quota is not a real Supabase per-user limit.** Supabase exposes no per-user quota. Plan assumes an app-defined quota (`user_settings.storage_quota_bytes`, default 500 MB) with "used" summed from the `attachments` table. Confirm the number, or say if it should come from somewhere else.
2. **Auto-cleanup wording** says "global oldest 5%". Plan implements it per-user (oldest 5% of that user's own objects) — a browser session cannot safely delete other users' data under RLS. Confirm.
3. **Auto-cleanup trigger point**: without backend changes there is no scheduler, so it runs when the signed-in user opens the app/settings. A true cron would need backend work.
4. **LinkedIn/GitHub/Spotify must be enabled in the Supabase project's auth settings** with client IDs/secrets and callback `https://ucacmeadsufiedxrgqit.supabase.co/auth/v1/callback` — I cannot do that from here; the buttons will error until it's done. Spotify and LinkedIn also do not return a verified email in every configuration.
5. **Migrations apply to this project's connected database, not the external production project** — as with `0001`, the SQL will need applying there separately.
6. **DOCX/PDF size cap** and the fact these files are stored but not parsed (no backend change) — confirm 10 MB.
7. `profiles.username` uses `citext`; if that extension is unavailable, a lower-cased unique index is used instead.
