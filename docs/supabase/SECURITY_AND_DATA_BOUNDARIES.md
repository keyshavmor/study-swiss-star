# Supabase security and data-boundary runbook

Status: CURRENT — live project inspected read-only 2026-09-20

Project: `ucacmeadsufiedxrgqit` (`GymmiExamPrep`), `eu-central-2`,
`ACTIVE_HEALTHY`, Postgres `17.6.1.166`. No live SQL, deployment, Auth,
Storage, configuration, or advisor change was made in Prompt 07.

## Reconciliation result

The hosted migration ledger has 32 entries through
`20260917223810_move_privileged_rpc_implementations_out_of_public`. Git contains
nine exact applied SQL files. The other 23 SQL bodies were not present in any
local branch/history inspected; the ordered evidence and forward plan are in
`supabase/LIVE_MIGRATION_HISTORY.md`. Never synthesize those applied identities.

The live schema contains 37 public tables. All have RLS enabled and at least one
policy. There are no public/storage views. Seven Storage buckets are private and
have explicit file-size ceilings. The seven deployed Edge Functions were
retrieved; their JWT modes and source contracts are represented in
`supabase/config.toml` and `supabase/functions`. Live-generated TypeScript types
were regenerated into `frontend/src/integrations/supabase/types.ts`, retaining
only product-specific JSON response helper types above generator output.

## Authorization rules

- Browser and ordinary local-backend operations use the publishable key plus the
  caller's verified JWT. RLS remains authoritative; a requested user ID or
  Storage path never establishes identity.
- Direct anonymous table access is unnecessary. The pending forward migration
  revokes it in addition to RLS, so future policy mistakes do not inherit broad
  table grants.
- The only globally readable application table is `ai_model_catalog`, and only
  authenticated users have its SELECT policy. It is configuration input, not an
  executable download URL or command.
- Peer tables are readable only through active membership helpers. Direct peer
  message/attachment inserts have no authenticated policy; the local backend
  must moderate/scan and use its reviewed privileged boundary.
- Admin reads use verified `app_metadata.role=admin`, never user metadata.
- Service-role keys bypass RLS and are confined to Edge Functions or narrow
  workers. They must not enter `VITE_*`, browser bundles, logs, or errors.
  Frontend publishable-key boundaries reject both `sb_secret_*` values and
  legacy JWTs whose role claim is `service_role` before creating a client.

## Function audit

Public privileged `SECURITY DEFINER` functions have fixed search paths and
service-role-only execution. User-facing public RPC wrappers are security
invokers with empty search paths and explicit authenticated grants.

Three private quota helpers inherited default PUBLIC execute and used
`public`/`storage` search paths. The private schema currently has no Data API
role USAGE, so direct invocation is blocked; nevertheless
`20260920120000_harden_exposed_grants_and_function_paths.sql` removes PUBLIC,
`anon`, and `authenticated` execution and switches to catalog-only search
paths. This is defense in depth and remains undeployed pending review.

Run `supabase/tests/security_contract.sql` on a disposable complete baseline to
assert RLS, grants, definer paths, private buckets, and privileged deletion RPC
access. `supabase/tests/rls_isolation.sql` supplies two-user behavioral checks.
Never run either test against production.

## Storage, quota, and retention

| Bucket | Limit | Write/read rule |
|---|---:|---|
| `profile-avatars` | 2 MiB | owner UUID first segment; owner CRUD |
| `user-materials` | 50 MiB | owner UUID first segment; owner CRUD |
| `chat-attachments` | 50 MiB | owner UUID first segment; owner CRUD |
| `peer-message-attachments` | 250,000 B | backend write after scan/moderation; active members read |
| `feedback-messages` | 1 MiB | Edge Function writes; admin reads |
| `activity-logs` | 256 KiB | sanitized Edge Function writes; admin reads |
| `assistant-descriptors` | 1 MiB | trusted producer writes; owner reads |

Storage write policies call the combined per-user 50 MiB quota boundary. The
local backend must preflight for UX and still treat the database/Storage check
as final, because concurrent requests can race. Browser MIME/name/size metadata
is untrusted: sniff and bound inputs, quarantine peer attachments until scan
success, and remove local temporary files in `finally` paths.

Media deletion is descriptor-first: source media cannot be deleted until the
private descriptor exists, the queue row is ready and due, and no hold/error is
active. Cleanup removes Storage through its API before recording completion and
is safe to retry. Emergency cleanup uses its database lease/token contract and
the global 90% to 80% policy; an authenticated Settings request does not receive
a service credential.

## Edge Function boundary

| Function | Live version | Gateway JWT | Application boundary |
|---|---:|---:|---|
| `username-login` | 4 | off | bounded normalized input, generic invalid credentials, no-store response |
| `username-availability` | 1 | off | normalized exact lookup only; no identity fields returned |
| `activity-log` | 4 | off | optional JWT; strict anonymous event allowlist and sensitive-key filter |
| `feedback-submit` | 3 | on | re-verifies bearer; storage-first transaction with compensating cleanup |
| `storage-emergency-cleanup` | 2 | off | Vault secret or verified user; database lease/policy controls cleanup |
| `media-retention-cleanup` | 2 | off | scheduler secret; descriptor/path checks before delete |
| `delete-my-data` | 1 | on | re-verifies bearer; service operations fixed to that `sub` |

Wildcard CORS remains a verified live contract because these functions use
bearer/custom authentication and the frontend may run on a loopback port. CORS
is not authorization. Before a live deployment, prefer an explicit environment
allowlist that includes only the configured loopback frontend origins and
reviewed hosted origins. Public username/auth telemetry functions also require
platform/gateway rate limiting; input bounds and non-enumerating responses are
not a substitute. No rate-limit configuration was changed in this run.

## Deletion and privacy

`delete-my-data` supports bounded date range, all content while retaining the
account, and account deletion. It enumerates only known metadata-backed objects
and user-prefixed mirrors, deletes Storage first, invokes service-only deletion
RPCs for the verified caller, and deletes the Auth user only in account mode.
Failures return a non-success response and sanitized code.

The frontend now performs a fail-closed two-stage operation. Its authenticated
TanStack server function first calls `POST /api/privacy/purge-local` with the
same caller JWT, then invokes `delete-my-data` only after local success. FastAPI
derives the user from the verified token, cancels selected assessment work, and
idempotently removes caller-owned context/index rows, assessment keys/jobs/
attempts, leases, and operation ownership. Range deletion uses `[start,end)` and
honours `delete_ai_messages`; the backend stores no peer messages. Shared model
artifacts and global web cache are application assets, not user records, and are
retained. Temporary material files are already removed in `finally` paths.

Both stages are safe to retry, and neither accepts a target user ID. The local
stage returns bounded record/reference counts; the Edge stage returns Storage
and database results. Account mode runs local purge first because its Edge stage
deletes the Auth user, then the UI clears local sessions and signs out. Operators
must still keep access-token lifetimes/revocation policy bounded because deleting
an Auth record does not retroactively shorten every already-issued token.

## Operator-only actions

The live security advisor reports two warnings that require owner approval and
Dashboard policy decisions:

1. Enable leaked-password protection after confirming plan/availability and
   recovery UX.
2. Enable additional MFA factors only with a completed enrollment/recovery UX.

The performance advisor reports 20 currently unused indexes. Keep them until
representative workload evidence and query plans justify removal; low traffic is
not deletion evidence.

After any authorized live DDL/deployment, re-run migration inventory, generated
types, two-user SQL suites, Edge Function contract tests, and both advisors.
Capture the before/after project ref, migration name, function versions, advisor
results, and rollback-forward plan. Production deployment remains a separate
explicitly authorized operation.

## Local environment boundary

The pinned CLI/Docker lifecycle is documented in
`supabase/LOCAL_ENVIRONMENT.md`. It is separate from Node, Python, model, and
documentation environments. Supabase service URLs are not the app URL; users
open the app at its loopback frontend URL. The Prompt 08 central launcher
composes `supabase/scripts/local.sh` when `ALIM_SUPABASE_MODE=local`.

## Official references reviewed

- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Securing the Data API](https://supabase.com/docs/guides/api/securing-your-api)
- [Database functions and `SECURITY DEFINER`](https://supabase.com/docs/guides/database/functions)
- [Edge Function authorization headers](https://supabase.com/docs/guides/functions/auth-headers)
- [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase CLI local development](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Password security](https://supabase.com/docs/guides/auth/password-security)
- [Multi-factor authentication](https://supabase.com/docs/guides/auth/auth-mfa)
