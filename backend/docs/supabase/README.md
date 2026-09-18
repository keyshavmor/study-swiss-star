# Backend ↔ Supabase documentation

| Field | Value |
|---|---|
| Owner | Backend and Supabase |
| Status | Current caller-token pattern plus gap contract |
| Canonical path | `backend/docs/supabase/README.md` |
| Verified | target baseline `bff4ec7`; live handover 2026-09-18 |

[Access contract](ACCESS_CONTRACT.md) is canonical. Ordinary user work uses the
publishable key plus verified caller JWT so database and Storage policies remain
effective. Service-role/secret access is exceptional, isolated and independently
authorized; it is never a shortcut for ordinary requests.

Frontend-consumed objects are indexed at
[`../../../docs/supabase/CONSUMED_OBJECT_INDEX.md`](../../../docs/supabase/CONSUMED_OBJECT_INDEX.md).
Prompt 07 owns forward migration reconciliation, grants/RLS/Storage/function
security proof and two-user isolation tests.
