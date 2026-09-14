# Roadmap

## Done
- Sync `supabase/config.toml` to project ref `ucacmeadsufiedxrgqit`.
- Add migration hardening chat ownership + private `user-materials` storage policies.
- Update `frontend/src/integrations/supabase/types.ts` to composite FK `messages_thread_owner_fkey`.
- Fix preview start-up (installed frontend deps, added root `dev`/`build` scripts).
- Point `frontend/.env` at `https://ucacmeadsufiedxrgqit.supabase.co` with the new publishable key.
- Replaced Lovable Cloud OAuth with direct `supabase.auth.signInWithOAuth` (google, apple, azure + `email` scope).
- Added Apple and Microsoft buttons using the existing Button styling; email/password unchanged.
- Removed `@lovable.dev/cloud-auth-js` and `frontend/src/integrations/lovable/`.
- Provider-neutral wording in Supabase env error messages.
- Docs no longer claim Lovable Cloud owns authentication.
- Typecheck clean, lint 0 errors, production build succeeds, `/` and `/auth` return 200.

## Blocked / needs user (dashboard-only)
- Enable Google, Apple and Microsoft (azure) providers in the external Supabase project and paste
  each provider's client id/secret. Callback: `https://ucacmeadsufiedxrgqit.supabase.co/auth/v1/callback`.
- Add the app origins to Supabase Auth "Site URL" / "Redirect URLs".
- Root `.env` is platform-managed and still holds the old ref; the app reads `frontend/.env` at build time.
