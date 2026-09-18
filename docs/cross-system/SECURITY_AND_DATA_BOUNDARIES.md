# Security and data boundaries

| Field | Value |
|---|---|
| Owner | Security with frontend/backend/Supabase owners |
| Status | Current invariant and acceptance contract |
| Canonical path | `docs/cross-system/SECURITY_AND_DATA_BOUNDARIES.md` |
| Verified | 2026-09-18 |

Trust boundaries are browser/user input; TanStack server/session; local
FastAPI/process manager; local model process/artifacts; Supabase Auth/Data API/
Storage/Edge/Postgres; and external OAuth/Calendar/reference networks.

Identity comes from a verified Supabase JWT: issuer/project, signature, expiry,
key rotation and `sub`. Request IDs, `X-Student-Id`, user IDs, Storage paths,
conversation IDs and model IDs are untrusted inputs. User-editable metadata is
never authorization. Secret/service-role credentials bypass RLS and therefore
remain isolated to narrowly authorized server workers.

Exposed Supabase objects require explicit least-privilege grants plus RLS.
`TO authenticated` alone is not ownership. Updates require readable rows plus
`USING` and `WITH CHECK`. Views and `SECURITY DEFINER` functions require explicit
invoker/execute/search-path review. Deleting an auth user does not itself revoke
already-issued tokens.

Local services bind loopback by default. Model IDs resolve through a server
allowlist; catalogue content cannot inject network locations, paths,
executables or flags. Downloads require reviewed HTTPS sources, redirect and
size bounds, immutable revision/provenance, integrity checks, staging and
atomic publication.

Uploads, retrieved text, web results and model output are untrusted. Bound and
sniff files, sandbox parsers, neutralize retrieval prompt injection,
schema-validate outputs, keep answer material private, and clean temporary
files. Never log tokens, keys, passwords, raw private content or answer keys.

Deletion spans Supabase rows/objects and local caches, indexes, artifacts,
operations, leases and temporary data. Partial failure must be resumable and
visible. Safety-required paths fail closed; local AI failure must not block auth
or non-AI navigation.
