# Backend implementation handoff

| Field | Value |
|---|---|
| Owner | Backend implementation lead |
| Status | Current inventory and ordered future work |
| Canonical path | `backend/docs/handoff/README.md` |
| Verified | frontend `f0910e6`, target `bff4ec7`, 2026-09-18 |

Begin with [Backend gap analysis](BACKEND_GAP_ANALYSIS.md), then the canonical
[control matrix](../../../docs/ui/CONTROL_TO_SYSTEM_MATRIX.md),
[API index](../../../docs/cross-system/API_INDEX.md), and
[model runtime handover](../models/MODEL_CATALOG_AND_RUNTIME.md).

Implementation order remains: bearer/contract foundation → capability/model
platform → chat/Assistant/RAG → assessments/study tools → Supabase security,
safety, messaging, media and privacy → isolated launchers/guides → full E2E and
platform hardening. Never mark a future contract current until executable tests
prove it.
