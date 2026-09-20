# Supabase source and deployment authority

Status: CURRENT repository/live reconciliation evidence, last live retrieval
2026-09-20 (read-only).

Project `ucacmeadsufiedxrgqit` owns Auth, Postgres/RLS, private Storage,
durable user state, telemetry, messaging/compliance data, and scheduled
retention. FastAPI performs AI inference locally. Supabase URLs are service
endpoints, never the user-facing app launch URL.

- `migrations/` has nine exact applied historical files plus the new,
  undeployed forward-only Prompt 07 hardening migration.
- `LIVE_MIGRATION_HISTORY.md` records all 32 live identities and the 23 missing
  original SQL bodies. Do not fabricate, rename, reorder, or replay them.
- `functions/` represents all seven retrieved live Edge Function sources,
  including `delete-my-data`; `config.toml` records JWT gateway modes.
- `tests/rls_isolation.sql` and `tests/security_contract.sql` are disposable
  local-database tests. Never run them on the linked production project.
- `CLI_VERSION`, `LOCAL_ENVIRONMENT.md`, and `scripts/local.sh` define the
  isolated local CLI/container boundary for Ubuntu and Apple-silicon macOS.

The repository cannot yet reproduce a clean production-equivalent database
because 23 applied SQL bodies were never committed. It can safely describe and,
after a reviewed disposable-baseline test and explicit authorization, advance
the existing live baseline with the forward migration. Never run
`supabase db reset --linked`.

Canonical documentation:

- `../docs/supabase/SUPABASE_CURRENT_STATE.md`
- `../docs/supabase/SECURITY_AND_DATA_BOUNDARIES.md`
- `../docs/supabase/RLS_AUTHORIZATION_MATRIX.md`
- `../docs/supabase/STORAGE_ARCHITECTURE.md`
- `../docs/supabase/EDGE_FUNCTIONS.md`

Browser code receives only the project URL and publishable key. Service-role and
scheduler secrets are server/Vault-only. Production SQL, Auth settings, Edge
Function deployment, or advisor remediation always requires a separate reviewed
authorization.
