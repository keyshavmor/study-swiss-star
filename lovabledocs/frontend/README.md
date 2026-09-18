# Frontend documentation

| Field | Value |
|---|---|
| Owner | Frontend |
| Status | `CURRENT — FRONTEND` |
| Canonical path | `docs/frontend/README.md` |
| Verified against | `f0910e6971f12efe0ad547b904f6e2a518b13856` |
| Runtime | React 19 + TanStack Start/Router + TypeScript + Vite |
| Last reviewed | 2026-09-18 |

The active application is `frontend/src`; the root `src/integrations/supabase`
copy is tool-managed and not resolved by the frontend `@/*` alias.

## Current evidence

- [Frontend architecture](FRONTEND_ARCHITECTURE.md)
- [Component tree](COMPONENT_TREE.md)
- [State ownership](STATE_OWNERSHIP.md)
- [Frontend data model](FRONTEND_DATA_MODEL.md)
- [i18n and language](I18N_AND_LANGUAGE.md)
- [Date/time presentation](DATE_TIME_PRESENTATION.md)
- [Detailed UI-event map](UI_EVENT_TO_SYSTEM_MAP.md)

The authoritative source wins if an older generated header inside a supporting
document disagrees. Current verification metadata is this landing page plus the
canonical route/control indices. Stale chronological claims are retained only
as traceable evidence and must not be cited without checking current code.

## Boundaries

- Browser code talks directly to Supabase only through publishable credentials
  and RLS/Storage/RPC contracts.
- AI calls go browser → TanStack server → loopback FastAPI; browser components
  do not call FastAPI directly.
- The user-facing application launches at loopback port 8080. A hosted Supabase
  URL is a data service, not the app URL. Lovable references are editor/build
  integration only.
- `selected_qwen_model` is durable preference; `alim.ai_session.v1` is the
  session decision; only a verified backend `ready` state enables AI.
- Browser-local `asa.data.v2` remains prototype state for parts of school,
  planner, grades and statistics until a separately approved persistence change.

Environment ownership is documented in
[execution environments](../cross-system/EXECUTION_ENVIRONMENTS.md).
