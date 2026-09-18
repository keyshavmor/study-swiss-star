# Current documentation and implementation issues

| Field | Value |
|---|---|
| Owner | Architecture/release owner |
| Status | Current reconciled issue register |
| Canonical path | `docs/DOCUMENTATION_DISCOVERED_ISSUES.md` |
| Verified | frontend `f0910e6`, Prompt 03 target, live handover 2026-09-18 |

This is a final-state register, not an append-only correction log.

| Issue | Status | Owner/next proof |
|---|---|---|
| Nine enabled model IDs lack verified artifact/runtime mappings | `UNKNOWN — REQUIRES VERIFICATION` | Prompt 04: primary model/runtime sources, immutable artifact metadata, license/hash/resource proof or explicit disable decision |
| Capability, prepare/poll, admission/lease/health/release APIs are absent | `BACKEND GAP` | Prompt 04 contract and lifecycle tests |
| Local safety, moderated peer send/scan, Assistant generation/parse and assessment jobs are absent | `BACKEND GAP` | Prompts 05–07; safety-required paths fail closed |
| Repository migration files do not reconstruct all observed live migration identities | `UNKNOWN — REQUIRES VERIFICATION` | Prompt 07 forward reconciliation; never edit/delete applied migrations |
| Leaked-password protection and sufficient MFA options were warned by live advisors | `UNKNOWN — REQUIRES OWNER DECISION` | Prompt 07 read-only recheck and explicit configuration decision |
| Browser-local school/planner/grade state has no approved canonical durable migration | `UNKNOWN — REQUIRES VERIFICATION` | product/data-owner decision before backend study features assume server data |
| Exact Assistant transport and server-media scope remain undecided | `UNKNOWN — REQUIRES VERIFICATION` | product/backend contract decision; no fabricated reply |
| Current combined Conda bootstrap conflicts with per-layer isolation | `DEPRECATED` environment design | Prompt 08 split environments and launcher tests |
| Physical MacBook M4 and working Ubuntu CUDA smoke evidence is absent | `UNKNOWN — REQUIRES VERIFICATION` | Prompts 08–09; current Ubuntu run was CPU-only |
| Existing frontend dependency directory lacks locked `vitest` and `mathlive` | local environment limitation | authorized lockfile install, then rerun typecheck/test/build |

Resolved facts folded into current documentation:

- The study-chat bridge forwards the exact verified caller bearer and
  cancellation signal; FastAPI re-verifies it and rejects subject/header
  conflicts. Prompt 03 focused/backend/E2E tests cover the boundary.
- Production Supabase and backend source are inspectable; older “unavailable”
  claims are historical only.
- There is no Lovable/cloud AI inference fallback in the authoritative product.
- Active target frontend paths now match pinned `main`, with the documented
  `.env` and documentation-tool exceptions.
- Root `src/integrations/supabase` is tool-managed duplicate material, not the
  active `frontend/src` import target.
