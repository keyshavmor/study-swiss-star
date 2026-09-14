# Roadmap

## Current verification pass
- Verify removals, translations, speech controls, and message-language metadata; correct remaining frontend gaps.
- Verify guide assets and matching documentation; run formatting/lint and inspect automatic build checks.
- Check public preview languages; authenticated checks require an available production session.

## Done
- Sync `supabase/config.toml` to project ref `ucacmeadsufiedxrgqit`.
- Add migration hardening chat ownership + private `user-materials` storage policies.
- Record the live user-isolation policies/indexes migration.
- Fix preview start-up (installed frontend deps, added root `dev`/`build` scripts).
- Point `frontend/.env` at the production Supabase project with the new publishable key.
- Auth UI: removed Apple/Microsoft sign-in entirely; email/password kept; added forgot-password
  (`resetPasswordForEmail`) plus `/auth/update-password`; OAuth limited to GitHub, LinkedIn, Spotify.
- Rewrote `frontend/src/integrations/supabase/types.ts` for the live schema (profiles,
  user_preferences, documents, assistant_threads/messages/attachments, threads/messages,
  `get_storage_usage_status`).
- New `/settings`: Account (avatar in `profile-avatars`, username, nationality, contact details,
  email + password via Supabase Auth), Local model (10 Qwen options in
  `user_preferences.preferences.selected_qwen_model`), Preferences (persisted switches incl.
  automatic cleanup), Storage (usage RPC, ≤10% warning, ≤1% one-shot emergency cleanup, type/date
  filters, multi-select deletion via Storage `.remove()` then metadata reconciliation).
- `/profile` shows Supabase account data (avatar signed URL, name, nationality, contact, sign-in
  email) while keeping the local prototype academic summary.
- New general assistant at `/assistant` and `/assistant/$threadId` using the separate `assistant_*`
  tables and `chat-attachments/<uid>/<threadId>/…`; media validated at ≤1 MB, PDF/DOCX allowed,
  `parse_status` stays `unparsed`, no fabricated replies.
- Assistant added to desktop, mobile-sheet and bottom navigation.
- Docs + wireframes updated in `docs/` and mirrored byte-for-byte to `lovabledocs/`, incl. new
  `ASSISTANT_SETTINGS_AND_STORAGE.md`, `wireframes/16-assistant.mmd`,
  `wireframes/17-settings-storage.mmd`.
- Migration `drizzle/migrations/0002_assistant_settings_storage_management.sql` records the live
  schema additively/idempotently; private `chat-attachments` and `profile-avatars` buckets created.
- Typecheck clean, production build succeeds, `/`, `/auth`, `/auth/update-password` return 200.
- Five-language i18n (`en`/`de`/`ru`/`es`/`fr`) via `frontend/src/lib/i18n/` (`languages.ts`,
  `detect.ts`, `provider.tsx`, `messages/*`), a header `LanguageMenu`, and
  `user_preferences.preferences.app_language` as the authoritative signed-in source (localStorage
  cache only prevents a flash of the wrong language and localises the signed-out welcome screen).
- Read-aloud Listen/Stop controls on assistant messages via `frontend/src/lib/speech.ts` (Web Speech
  API, frontend-only, nothing uploaded/persisted), gated by `assistant_audio_enabled` /
  `assistant_audio_autoplay` in `user_preferences.preferences`.
- `/help` now links five static A4 PDF user guides (`frontend/public/help-guides/alim-user-guide-
  {en,de,ru,es,fr}.pdf`) instead of a "Contact support" CTA.
- Typed helper `frontend/src/lib/media-retention.ts` for the future `public.media_retention_queue`
  table and private `assistant-descriptors` bucket (assistant OUTPUT media only); insert/list only —
  descriptor generation/upload, enqueueing on generation, the 30-minute cleanup, and descriptor-based
  retrieval remain backend follow-up.
- Docs refreshed again for language/audio/media-retention and mirrored byte-for-byte to
  `lovabledocs/` (excluding the wireframes owned by another workstream).

## Blocked / needs user (Supabase project settings only)
- Enable GitHub, LinkedIn (OIDC) and Spotify providers and paste each client id/secret.
  Callback: `https://ucacmeadsufiedxrgqit.supabase.co/auth/v1/callback`.
- Add the app origins to Auth "Site URL" / "Redirect URLs".
- Root `.env` is platform-managed and still holds the old ref; the app reads `frontend/.env`.

## Backend follow-up (deliberately not done here)
- Assistant inference endpoint writing `assistant_messages` rows with `role = 'assistant'`.
- Attachment parsing (`parse_status`) and honouring the selected Qwen model at load time.
- Honouring `user_preferences.preferences.app_language` on generation requests (`FUTURE BACKEND /
  CODEX`, not implemented).
- Media retention for assistant output media: descriptor generation/upload to the
  `assistant-descriptors` bucket, enqueueing `public.media_retention_queue` rows on generation, the
  30-minute cleanup worker, and descriptor-based retrieval (`FUTURE BACKEND / CODEX`, not
  implemented).
