# Documentation reconciliation record

| Field | Value |
|---|---|
| Owner | Release/documentation owner |
| Status | Current evidence index |
| Canonical path | `docs/reconciliation/README.md` |
| Last reviewed | 2026-09-18 |

Prompt 02 preserves the union of useful target documentation and source-only
frontend-authority paths. It does not overwrite target backend or forward
Supabase history with stale `main` claims.

Decisions:

1. `docs/` is canonical; `lovabledocs/` is a byte-identical generated mirror.
2. Prompt-required root landings (`docs/ux`, `ui`, `frontend`, `supabase`, and
   `cross-system`) are canonical because Lovable tooling already consumes the
   root mirror convention.
3. `frontend/docs/README.md` is a doorway rather than a third content copy.
4. Backend implementation documentation is canonical under `backend/docs`.
5. Existing detailed architecture/contracts/sequences/wireframes remain
   traceable compatibility/reference corpora with directory-level status.
6. Old archive files remain in place and are classified by the archive
   manifest; physical code/doc archival is deferred to Prompt 08.
7. Live Supabase claims retain their 2026-09-18 read-only evidence date. This
   documentation run performs no live write and does not claim a fresh query.

Authority/result anchors:

- frontend authority: `f0910e6971f12efe0ad547b904f6e2a518b13856`;
- target documentation start: `bff4ec7905f0d00fbf024c8e28717082a848d71a`;
- Prompt 01 rollback: `codex-preflight-00-20260918T153128Z`.
