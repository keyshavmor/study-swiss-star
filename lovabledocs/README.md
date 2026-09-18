# Alim documentation map

| Field | Value |
|---|---|
| Owner | Architecture and product-contract maintainers |
| Status | `CURRENT — FRONTEND`, `CURRENT — SUPABASE`, and `CURRENT — LOCAL BACKEND` are separated below |
| Canonical path | `docs/README.md` |
| Frontend authority | `study-swiss-star-frontend/main` at `f0910e6971f12efe0ad547b904f6e2a518b13856` |
| Target baseline | `kmor/migrate-supabase` after frontend sync at `bff4ec7905f0d00fbf024c8e28717082a848d71a` |
| Live Supabase evidence | project `ucacmeadsufiedxrgqit`, read-only verification dated 2026-09-18 |
| Last reviewed | 2026-09-18 |
| Review trigger | frontend-authority SHA, live schema, or backend API/runtime change |

This is the canonical entry point. Product behavior comes from executable
frontend code, not from a diagram or an old generated-document header. Backend
limitations never redefine the frontend contract. Proposed backend behavior is
always marked `EXPECTED LOCAL BACKEND CONTRACT`, `BACKEND GAP`, or
`FUTURE CODEX IMPLEMENTATION`.

## Canonical homes

| Concern | Canonical landing page | Primary owner |
|---|---|---|
| UX journeys, routes, startup order | [UX](ux/README.md) | Product/UX + frontend |
| UI controls, states and accessibility | [UI](ui/README.md) | UI + frontend |
| React/TanStack architecture, state and i18n | [Frontend](frontend/README.md) | Frontend |
| Frontend-consumed Auth, tables, RPCs, Storage and functions | [Supabase](supabase/README.md) | Supabase + frontend |
| End-to-end contracts, ownership, security and deployment | [Cross-system](cross-system/README.md) | Architecture |
| Implemented FastAPI, local models and RAG | [Backend documentation](../backend/docs/README.md) | Backend |
| Branch/document decisions and evidence | [Reconciliation](reconciliation/README.md) | Release owner |
| Superseded material | [Archive manifest](archive/ARCHIVE_MANIFEST.md) | Documentation owner |

`frontend/docs/README.md` is a frontend-local doorway to the canonical UX/UI/
frontend pages. It intentionally links here instead of copying documents.

## Status vocabulary

- `CURRENT — FRONTEND`: observed in the pinned executable frontend or tests.
- `CURRENT — SUPABASE`: observed in timestamped read-only live metadata or
  reconciled repository evidence.
- `CURRENT — LOCAL BACKEND`: implemented in target backend code/tests.
- `CURRENT — EXTERNAL INTEGRATION`: implemented provider/browser integration.
- `EXPECTED LOCAL BACKEND CONTRACT`: contract the frontend already expects.
- `BACKEND GAP`: required behavior not implemented by the current backend.
- `FUTURE CODEX IMPLEMENTATION`: explicitly assigned future work.
- `DEPRECATED`: retained for compatibility or historical navigation.
- `ARCHIVED`: historical evidence, never current authority.
- `UNKNOWN — REQUIRES VERIFICATION`: insufficient evidence; no inferred claim.

## `docs/` and `lovabledocs/`

`docs/` is canonical. `lovabledocs/` is a byte-identical, mechanically refreshed
Lovable compatibility mirror. Never hand-edit the mirror. The documentation
check must fail if the file sets or bytes diverge.

Legacy `architecture/`, `contracts/`, `sequences/`, `wireframes/`, and
`backend-handoff/` paths remain available so old links do not break. Their
directory landing pages explain whether each corpus is current evidence,
design reference, or deprecated. Canonical cross-system conclusions live under
`cross-system/`; canonical backend implementation facts live under
`backend/docs/`.

## Fast reading paths

- Backend implementer: [feature/control matrix](ui/CONTROL_TO_SYSTEM_MATRIX.md)
  → [API index](cross-system/API_INDEX.md) →
  [backend docs](../backend/docs/README.md).
- Frontend implementer: [route inventory](ux/ROUTE_AND_SCREEN_INVENTORY.md) →
  [frontend architecture](frontend/README.md) →
  [Supabase consumption](supabase/CONSUMED_OBJECT_INDEX.md).
- Operator: [execution environments](cross-system/EXECUTION_ENVIRONMENTS.md) →
  frontend/backend operations pages. Launcher scripts are not claimed to exist
  until Prompt 08 implements and tests them.
- Security reviewer: [security boundaries](cross-system/SECURITY_AND_DATA_BOUNDARIES.md)
  → [backend Supabase access](../backend/docs/supabase/ACCESS_CONTRACT.md).
