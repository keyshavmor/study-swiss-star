# Reconciled Backend Handoff

Status: CURRENT — IMPLEMENTATION HANDOFF

Source snapshots: frontend `main` `e4bf042a826d94b94175530f95ff7e11a5ccdc76`; backend branch start `91ddfe1f7aef1f9f8d2e4b3088abcc203865395d`; live Supabase inspected 2026-09-15.

The branch now combines the current-main product surface with the authoritative FastAPI/context/Qwen backend. The critical JWT gap is closed: TanStack verifies and forwards the real caller token plus matching `X-Student-Id`; FastAPI independently verifies it and uses caller-JWT RLS.

Port these intentional integration changes back to `main` after review:

- `frontend/src/routes/api/chat.ts`
- `frontend/src/lib/context-backend.server.ts`
- `frontend/src/components/StudyChat.tsx`
- generated `frontend/src/integrations/supabase/types.ts`
- focused frontend tests
- backend/compiler seven-language contract
- retrieved/hardened `supabase/functions/` sources and `supabase/config.toml`

Do not port a Supabase repository for `asa.data.v2`; current browser state ownership is intentional. Do not move Google Calendar to FastAPI. Do not expose service-role/secret keys.

See `BACKEND_BRANCH_SYNC_REPORT.md` for test evidence and remaining blockers.
