```
Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
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

## Compliance, safety & peer messaging

**Startup order (CURRENT FRONTEND / CURRENT SUPABASE, 2026-09-17):** signed out →
sign in/up → `/onboarding/compliance` (CURRENT SUPABASE flag
`account_compliance.compliance_onboarding_completed`, RPC
`complete_account_compliance_onboarding`) → `/onboarding/language` (MANDATORY
per-session decision) → `/onboarding/model` (MANDATORY per-session decision:
backend-confirmed `ready`, or explicit continue-without-AI) → `/home`. The system
admission gate is NOT part of this order any more; its data is shown on the model
screen and `/onboarding/system-admission` is optional. `account_compliance.account_status
= 'suspended_pending_review'` outranks every other route and redirects to
`/account/suspended`. Legal routes: `/legal/terms`, `/legal/privacy`,
`/legal/acceptable-use`, `/legal/child-safety`. See
`sequences/SIGNUP_ROLE_GUARDIAN_CONSENT.mmd`, `sequences/POST_LOGIN_STARTUP.mmd`.

## New sequence diagrams (this pass): compliance, admission, safety, messaging

- `sequences/SIGNUP_ROLE_GUARDIAN_CONSENT.mmd`
- `sequences/STARTUP_COMPLIANCE_LANGUAGE_ADMISSION_MODEL_HOME.mmd`
- `sequences/PEER_CHAT_CREATION_BY_USERNAME.mmd`
- `sequences/PEER_MESSAGE_MODERATION_SEND_NOTIFY.mmd`
- `sequences/FIRST_SAFETY_STRIKE.mmd`
- `sequences/SECOND_STRIKE_SUSPENSION_GUARDIAN_REVIEW.mmd`
- `sequences/ATTACHMENT_COMPRESS_SCAN_STORE.mmd`
- `sequences/OFFLINE_MESSAGE_NEXT_LOGIN_UNREAD.mmd`
- `sequences/ADMISSION_MAX10_LOGIN50_RULE.mmd`
- `sequences/MODEL_LOAD_BALANCING_LIGHTER_ASSIGNMENT.mmd`
- `sequences/INFLIGHT_PRESERVE_NEWCOMER_QUEUE_SAFE_REBALANCE.mmd`
- `sequences/EFFECTIVE_CAPS_75_VS_30_25_30_FLOORS.mmd`
- `sequences/SYSTEM_HEALTH_AGGREGATION.mmd`
- `sequences/RELEASE_MY_MODEL.mmd`
- `sequences/SIGNOUT_RUNTIME_RELEASE_LEASE_TTL_FALLBACK.mmd`
- `sequences/DELETE_MY_DATA_RANGE.mmd`
- `sequences/DELETE_MY_DATA_ALL_CONTENT_KEEP_ACCOUNT.mmd`
- `sequences/DELETE_ACCOUNT.mmd`
- `sequences/MESSAGING_STORAGE_RLS_BOUNDARIES.mmd`
- `sequences/GDPR_PRIVACY_DATA_MAP_RIGHTS_WORKFLOW.mmd`

See `legal/LEGAL_REVIEW_REQUIRED.md` for what these flows do NOT establish legally.


## Post-login gate — CURRENT (2026-09-17)

Supersedes any statement earlier in this file that language onboarding is a
once-per-account step or that model setup is optional/advisory.

Canonical order after Supabase Auth succeeds:
compliance (durable, once) → **language decision for this browser session**
(select a language or explicit skip) → **model decision for this browser
session** (backend-confirmed `ready`, or an explicit "Continue without AI") →
`/home` and the rest of the product.

- Authentication and non-AI product areas never depend on the local AI backend.
- `user_preferences.preferences.app_language` stays the durable default used to
  preselect the language screen; `language_onboarding_completed` is kept only as
  legacy compatibility metadata and is not a gate.
- `selected_qwen_model` persists a *preference*; readiness comes only from an
  explicit backend `ready` state (`alim.ai_session.v1` in `sessionStorage`).
- The decisions survive a refresh in the same session and are cleared on
  sign-out; direct navigation to a protected route re-runs the same gate.
- AI actions are centrally guarded (`AiFeatureGate` / `useAiBlocked`): blocked
  actions issue no request and show one localized red notice with retry,
  Settings and non-AI paths.

Full contract: `docs/backend-handoff/POST_LOGIN_LANGUAGE_MODEL_GATE_HANDOFF.md`;
sequence: `docs/sequences/POST_LOGIN_STARTUP.mmd`.
