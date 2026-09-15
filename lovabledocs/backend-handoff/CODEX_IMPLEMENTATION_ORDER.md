# Integration and Release Order

Status: CURRENT

1. Review the documented frontend delta against `main`.
2. Run frontend install/typecheck/lint/i18n/test/build in a Node 22+/Bun environment.
3. Run backend pytest and Ruff.
4. Validate Mermaid and Markdown links.
5. Deploy the reviewed telemetry sanitizer Edge Function hardening, then re-fetch source/version.
6. Exercise authenticated staging flows: signup/login/OAuth/logout, subject chat, cross-user denial, feedback, Assistant persistence, Calendar connect/read/disconnect.
7. Review Supabase advisors and the RLS isolation SQL in a disposable transaction/staging project.
8. Prepare a normal merge; do not rebase/force-push published Lovable history.
9. Port the listed integration changes to `main`.

No destructive production schema work or migration-history rewrite belongs in this sequence.
