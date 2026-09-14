# Verify production Supabase and correct affected docs

## Goal
Close the one open documentation limitation: statements about the production
backend are currently labelled "declared-from-code" because the production
project could not be queried from this environment.

## Affected files (current state)

Directly carrying the caveat:
1. `docs/supabase/DATABASE_SCHEMA.md`
2. `docs/supabase/RLS_AUTHORIZATION_MATRIX.md`
3. `docs/supabase/SUPABASE_CURRENT_STATE.md`
4. `docs/DOCUMENTATION_DISCOVERED_ISSUES.md` (issue #1 records the preview/production divergence)

Secondary references to the same limitation appear in ~15 other docs
(architecture, contracts, frontend data model, event map, UX, Edge Functions,
storage docs) — these only mention the caveat, they do not depend on it.

## Plan
1. Re-check whether the production project is reachable via the available
   backend query tools (it was not reachable before; preview project was served instead).
2. If reachable: query live schema, RLS policies, storage buckets/policies,
   and Edge Functions; then update the 3 supabase docs above, replacing
   "declared-from-code" labels with verified evidence blocks, and resolve
   issue #1 in `DOCUMENTATION_DISCOVERED_ISSUES.md` (profiles `id` vs
   `user_id` divergence).
3. Mirror the updated files byte-for-byte to `lovabledocs/`.
4. If still unreachable: leave the caveats in place and report that no
   change is possible from this environment — the docs already state the
   correct production contract as declared by the frontend code.

## Technical notes
- No frontend, backend, model, or git changes.
- Only `docs/` + `lovabledocs/` edits.
