# Roadmap

## Done
- Sync `supabase/config.toml` to project ref `ucacmeadsufiedxrgqit`.
- Add migration hardening chat ownership + private `user-materials` storage policies.
- Record the live user-isolation policies/indexes migration.
- Fix preview start-up (installed frontend deps, added root `dev`/`build` scripts).
- Point `frontend/.env` at the production Supabase project with the new publishable key.
- Auth UI: removed Google/Apple/Microsoft entirely; email/password kept; added forgot-password
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

## Blocked / needs user (Supabase project settings only)
- Enable GitHub, LinkedIn (OIDC) and Spotify providers and paste each client id/secret.
  Callback: `https://ucacmeadsufiedxrgqit.supabase.co/auth/v1/callback`.
- Add the app origins to Auth "Site URL" / "Redirect URLs".
- Root `.env` is platform-managed and still holds the old ref; the app reads `frontend/.env`.

## Backend follow-up (deliberately not done here)
- Assistant inference endpoint writing `assistant_messages` rows with `role = 'assistant'`.
- Attachment parsing (`parse_status`) and honouring the selected Qwen model at load time.
