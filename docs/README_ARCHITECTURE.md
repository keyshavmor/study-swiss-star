```
Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466
```

# Documentation index — Alim / Gymi Genius

This is the entry point into the full documentation set produced for this codebase. It exists because the
system spans four trust boundaries (browser, Supabase cloud, the student's local machine, and external
OAuth/APIs) and because the local Python backend's real implementation is **not visible from this repo** —
only its contract with the frontend is. Every document below is careful to separate what is verified
(`CURRENT — FRONTEND` / `CURRENT — SUPABASE` / `CURRENT — EXTERNAL INTEGRATION`) from what is only a
contract or assumption (`EXPECTED BACKEND CONTRACT` / `BACKEND IMPLEMENTATION UNKNOWN` / `BACKEND TODO FOR
CODEX`) and what has been intentionally removed (`DEPRECATED — REMOVED`).

## docs/ ↔ lovabledocs/ mirror convention

`docs/` is the working copy produced and edited by documentation passes such as this one. `lovabledocs/` is
a **byte-identical mirror** of `docs/`, synced centrally after each pass (not by individual agents). Agents
write only under `docs/`; nobody should hand-edit `lovabledocs/` directly, and the two trees must never be
allowed to diverge — if they do, `docs/` is the source of truth and `lovabledocs/` must be re-synced from it.

## Reading order: Codex (exact order, 12 steps)

1. `backend-handoff/CODEX_HANDOFF.md`
2. `architecture/SYSTEM_CONTEXT.md`
3. `architecture/CONTAINER_ARCHITECTURE.md`
4. `frontend/UI_EVENT_TO_SYSTEM_MAP.md`
5. `frontend/STATE_OWNERSHIP.md`
6. `supabase/DATABASE_SCHEMA.md`
7. `supabase/RLS_AUTHORIZATION_MATRIX.md`
8. `supabase/STORAGE_ARCHITECTURE.md`
9. `contracts/FRONTEND_BACKEND_CONTRACT.md`
10. `contracts/BACKEND_GAP_MATRIX.md`
11. `sequences/*` (all sequence diagrams, any order within this step)
12. `backend-handoff/BACKEND_ACCEPTANCE_CRITERIA.md`

## Reading order: frontend developer

1. `architecture/SYSTEM_CONTEXT.md`
2. `architecture/CONTAINER_ARCHITECTURE.md`
3. `architecture/FRONTEND_COMPONENT_ARCHITECTURE.md`
4. `frontend/STATE_OWNERSHIP.md`
5. `frontend/UI_EVENT_TO_SYSTEM_MAP.md`
6. `contracts/FRONTEND_BACKEND_CONTRACT.md`
7. `sequences/*` relevant to the screen being changed
8. `ux/*` and `wireframes/*` for the affected screen

## Reading order: backend (Python) developer

1. `backend-handoff/CODEX_HANDOFF.md`
2. `architecture/BACKEND_EXPECTED_ARCHITECTURE.md`
3. `contracts/FRONTEND_BACKEND_CONTRACT.md`
4. `contracts/BACKEND_GAP_MATRIX.md`
5. `sequences/*` covering `/api/chat`
6. `backend-handoff/BACKEND_ACCEPTANCE_CRITERIA.md`

## Reading order: Supabase developer

1. `architecture/SYSTEM_CONTEXT.md`
2. `supabase/DATABASE_SCHEMA.md`
3. `supabase/RLS_AUTHORIZATION_MATRIX.md`
4. `supabase/STORAGE_ARCHITECTURE.md`
5. `architecture/SUPABASE_ARCHITECTURE.md`
6. `contracts/FRONTEND_BACKEND_CONTRACT.md` (edge functions section)

## Reading order: product / UX reviewer

1. `FULL_APP_WIREFRAMES.md`
2. `wireframes/*`
3. `ux/*`
4. `FEATURE_DEPENDENCY_MATRIX.md`
5. `DOCUMENTATION_DISCOVERED_ISSUES.md`

## New authenticated startup flow (added this pass)

Signed out → `/` (sign in/up) → `/onboarding/language` (once, gated by
`user_preferences.preferences.language_onboarding_completed`, CURRENT SUPABASE) →
`/onboarding/model` (every NEW authenticated browser session, gated by sessionStorage key
`alim.ai_session.v1`, CURRENT FRONTEND) → `/home` (AI-ready or non-AI). The guard lives in
`frontend/src/routes/_authenticated/route.tsx`; direct navigation to `/home` cannot bypass the
model gate; `/onboarding/*` and `/auth` are exempt. See:

- `sequences/POST_LOGIN_STARTUP.mmd`
- `sequences/LANGUAGE_ONBOARDING.mmd`
- `sequences/MODEL_SELECTION_READINESS.mmd`
- `sequences/MODEL_CACHED_SHARED_DOWNLOAD.mmd`
- `sequences/RESOURCE_BLOCKED_NON_AI.mmd`
- `sequences/SETTINGS_MODEL_RETRY.mmd`
- `sequences/MODEL_DOWNLOAD_DEDUPLICATION.mmd`
- `sequences/AI_SESSION_STATE_MACHINE.mmd`
- `sequences/STORAGE_CAPACITY_CLEANUP.mmd`

Model preparation endpoints (`/api/model/status`, `/api/model/prepare`, `/api/model/operation`)
are **EXPECTED LOCAL BACKEND CONTRACT / BACKEND TODO FOR CODEX** — not implemented anywhere in
this repository yet; every call degrades to `backend_unavailable` and the frontend never
fabricates readiness. The 50/50/50 admission and 30/25/30 runtime-floor resource policy is
**CURRENT SUPABASE** (`public.get_ai_runtime_policy()`), read by the server-side adapter, never
measured by the browser. The per-user `auto_storage_cleanup` preference has been **REMOVED**;
storage cleanup is now the platform-wide, non-user-disableable job described in
`supabase/STORAGE_LIFECYCLES.md` and `sequences/STORAGE_CAPACITY_CLEANUP.mmd`.

## File map (this documentation pass)

```
docs/
├── README_ARCHITECTURE.md              — this file
├── FULL_APP_WIREFRAMES.md              — top-level wireframe index
├── DOCUMENTATION_DISCOVERED_ISSUES.md  — issues found while documenting
├── FEATURE_DEPENDENCY_MATRIX.md        — feature × layer dependency matrix
├── architecture/
│   ├── SYSTEM_CONTEXT.md / .mmd                    — C4 L1
│   ├── CONTAINER_ARCHITECTURE.md / .mmd            — C4 L2
│   ├── FRONTEND_COMPONENT_ARCHITECTURE.md / .mmd   — C4 L3 (frontend)
│   ├── SUPABASE_ARCHITECTURE.md / .mmd             — Supabase internals
│   ├── BACKEND_EXPECTED_ARCHITECTURE.md / .mmd     — expected local backend shape
│   └── DEPLOYMENT_ARCHITECTURE.md / .mmd           — runtime/deployment topology
├── ux/                                  — UX flows and behaviour notes
├── frontend/
│   ├── UI_EVENT_TO_SYSTEM_MAP.md
│   └── STATE_OWNERSHIP.md
├── supabase/
│   ├── DATABASE_SCHEMA.md
│   ├── RLS_AUTHORIZATION_MATRIX.md
│   └── STORAGE_ARCHITECTURE.md
├── contracts/
│   ├── FRONTEND_BACKEND_CONTRACT.md
│   └── BACKEND_GAP_MATRIX.md
├── sequences/                            — one sequence diagram per key flow
├── backend-handoff/
│   ├── CODEX_HANDOFF.md
│   └── BACKEND_ACCEPTANCE_CRITERIA.md
├── wireframes/                           — per-screen wireframes
└── archive/                              — superseded documentation
```

Note: only the six `architecture/*` files (this agent's assignment) are produced in this pass; all other
paths above are produced by parallel agents against the same `FACTS.md` and are listed here purely for
navigation.
