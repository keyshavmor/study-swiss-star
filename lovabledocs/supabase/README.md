# Frontend ↔ Supabase documentation

| Field | Value |
|---|---|
| Owner | Supabase and frontend |
| Status | `CURRENT — SUPABASE` only where timestamped; otherwise explicit gap/unknown |
| Canonical path | `docs/supabase/README.md` |
| Project | `ucacmeadsufiedxrgqit` (`GymmiExamPrep`) |
| Live metadata last verified | 2026-09-18, read-only |
| Frontend verified against | `f0910e6971f12efe0ad547b904f6e2a518b13856` |

[Consumed object index](CONSUMED_OBJECT_INDEX.md) is the canonical inventory of
the 37 public tables, seven private buckets, frontend/worker RPCs, Edge
Functions and model-policy objects observed by the handover.

Supporting evidence:

- [Authentication](AUTHENTICATION.md)
- [Database schema](DATABASE_SCHEMA.md)
- [RLS authorization](RLS_AUTHORIZATION_MATRIX.md)
- [Storage architecture](STORAGE_ARCHITECTURE.md)
- [Storage lifecycles](STORAGE_LIFECYCLES.md)
- [Edge Functions](EDGE_FUNCTIONS.md)
- [User preferences](USER_PREFERENCES_CONTRACT.md)

## Security boundary

Browser clients receive only the project URL and publishable key. User JWTs
authorize rows/objects through grants plus RLS. Secret/service-role credentials
are server-only, bypass RLS, and therefore require a narrow independently
authorized worker boundary. User-editable metadata is never authorization.

For exposed objects, grants decide reachability and RLS decides rows. New Data
API objects must be explicitly reviewed for both. `UPDATE` policies require
read visibility, `USING`, and `WITH CHECK`; privileged functions require
restricted execute grants, safe search paths and caller checks.

Current platform compatibility notes checked 2026-09-18: Supabase is moving
public-schema Data API exposure to explicit opt-in, with enforcement announced
for 2026-10-30; this reinforces the grants-plus-RLS rule. The JavaScript client
family has dropped Node 20 support, while this frontend targets Node 22. Hosted
Supabase remains the deployed data service; any future local CLI stack must use
its own pinned CLI/container boundary and verify commands with `--help`.

References: [Securing the Data API](https://supabase.com/docs/guides/api/securing-your-api),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), and
[Supabase breaking-change changelog](https://supabase.com/changelog?types=breaking-change).

Applied migrations are immutable history. The repository does not yet reproduce
all 32 live migration identities observed through 2026-09-17; Prompt 07 owns
forward reconciliation and two-user security proof. This documentation phase
made no database, Auth, Storage, function or project-setting change.
