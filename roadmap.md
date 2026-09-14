# Roadmap

## Done
- Sync `supabase/config.toml` to project ref `ucacmeadsufiedxrgqit`.
- Add migration hardening chat ownership + private `user-materials` storage policies.
- Update `frontend/src/integrations/supabase/types.ts` to composite FK `messages_thread_owner_fkey`.

## In progress
- Fix preview start-up (install frontend deps, root `dev` script).
- Point frontend env at `https://ucacmeadsufiedxrgqit.supabase.co` with the new publishable key.
- Replace Lovable Cloud OAuth with direct `supabase.auth.signInWithOAuth` (google, apple, azure+email scope).
- Remove `@lovable.dev/cloud-auth-js` and `frontend/src/integrations/lovable/index.ts`.
- Provider-neutral wording in Supabase env error messages.
- Docs/comments no longer claim Lovable Cloud owns auth.
- Run typecheck/lint/build.

## Blocked / needs user
- Enabling Google, Apple and Microsoft providers inside the external Supabase project dashboard
  (callback `https://ucacmeadsufiedxrgqit.supabase.co/auth/v1/callback`) — cannot be done from here.
