```
Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466
```

# System Context (C4 Level 1) — Alim / Gymi Genius

## Actors

- **Gymnasium student** — the primary user. Authenticates via Supabase Auth (username/password mapped
  through the `username-login` Edge Function, or OAuth via GitHub/LinkedIn/Spotify, or a linked Google
  identity for Calendar access). Uses Home, School, subject workspace, Planner, Assistant, Statistics,
  Help, Feedback and Profile/Settings screens.
- **Administrator** — retrieves feedback and activity artefacts submitted by students (the `feedback` table
  and `feedback-messages`/`activity-logs` storage objects). Identified via the immutable
  `app_metadata.role = 'admin'` claim (set outside the app, not user-editable). No admin UI exists in
  `frontend/src`; this actor interacts with Supabase directly (SQL/dashboard) — CURRENT — SUPABASE
  (declared; not machine-verified this pass).

## Systems

- **Gymi Genius web app** — TanStack Start v1 + React 19 application. Runs partly in the **browser** (all
  interactive screens) and partly as a **TanStack server runtime** (the `/api/chat` server route in
  `frontend/src/routes/api/chat.ts`, executed server-side, not in the browser).
- **Supabase (project ref `ucacmeadsufiedxrgqit`)** — Auth, PostgreSQL (RLS-protected), Storage, Edge
  Functions. Trust boundary: **Supabase cloud**, external to the student's machine and to the app server.
- **Local Python FastAPI backend** — `127.0.0.1:8001`, referenced only through the contract in
  `frontend/src/lib/context-backend.server.ts`. Trust boundary: **local machine** (the student's own
  computer). BACKEND IMPLEMENTATION UNKNOWN beyond this contract.
- **Local model runtime** — llama.cpp / Qwen model server on `127.0.0.1:8000`, called by the local backend
  only (never directly by the frontend). Trust boundary: **local machine**.
- **Google OAuth + Google Calendar API v3 (read-only)** — used for identity linking
  (`calendar.readonly` scope) and calendar reads via `frontend/src/lib/google-calendar.ts`. Trust boundary:
  **external**.
- **GitHub / LinkedIn / Spotify OAuth** — sign-in identity providers only (`supabase.auth.signInWithOAuth`).
  Trust boundary: **external**.

## Trust boundaries

| Boundary | Contains |
|---|---|
| Browser | Student's UI session, Web Speech API, localStorage language cache |
| Local machine | Local Python backend (8001), local model runtime (8000) |
| Supabase cloud | Auth, Postgres, Storage, Edge Functions |
| External | Google OAuth/Calendar, GitHub, LinkedIn, Spotify |

## Diagram

See `SYSTEM_CONTEXT.mmd`. Link labels: **CURRENT** = implemented and observed in `frontend/src`;
**EXPECTED BACKEND CONTRACT** = defined by the frontend's request/response contract but the local backend's
actual behaviour is BACKEND IMPLEMENTATION UNKNOWN.


## Authenticated startup flow — CURRENT (2026-09-17)

Signed out → `/` (sign in / sign up; authentication NEVER waits on the local AI
backend) → **`/onboarding/language` — MANDATORY once per browser
session**: select a language (persists `user_preferences.preferences.app_language`
as the durable default) or explicitly skip → **`/onboarding/model` — MANDATORY
once per browser session**: system capability probe, recommendation, model
selection and prepare/poll; the app can be entered only after an explicit backend
`ready` confirmation (AI-ready) or an explicit "Continue without AI" (non-AI) →
`/onboarding/compliance` if compliance onboarding is still required (durable,
once, CURRENT SUPABASE `account_compliance`) → `/home`.

- Session gates: `alim.language_session.v1` and `alim.ai_session.v1`
  (`sessionStorage`). They survive a refresh and are cleared on sign-out.
- `language_onboarding_completed` is LEGACY compatibility metadata only — it is
  NOT a gate. `selected_qwen_model` is a durable PREFERENCE and never means the
  model is ready. Runtime/model/GPU readiness is never stored in Supabase.
- Route order is enforced: opening `/onboarding/model` by hand with no language
  decision redirects to `/onboarding/language`, and product routes stay blocked
  until both decisions exist (`startupRedirectFor`, `_authenticated/route.tsx`).
- There is NO mandatory system-admission screen between language and model;
  capability, admission and recommendation data are shown on the model screen.
  `/onboarding/system-admission` remains an optional diagnostics surface.
- Model preparation (`/api/system/capability`, `/api/model/prepare`,
  `/api/model/operation`, `/api/system/runtime/release`) is REQUIRED FUTURE BACKEND
  (BACKEND TODO FOR CODEX). Unreachable / 404 / timeout / unparsable ⇒
  `backend_unavailable`, shown truthfully; no values are fabricated.
- Resource policy: 50/50/50 admission, 30/25/30 runtime floors — CURRENT SUPABASE
  `get_ai_runtime_policy()`. Model catalogue: CURRENT SUPABASE `ai_model_catalog`,
  hard-coded list is fallback only.
- AI-dependent actions (chat, quiz/exam generation, grading) are centrally guarded
  (`AiFeatureGate` / `useAiBlocked`): without an AI-ready session no request is
  issued and one localized red notice offers retry model setup, Settings, or
  continuing with non-AI features. Non-AI features stay fully usable.
- The per-user `auto_storage_cleanup` preference is REMOVED; cleanup is the
  platform-wide 5-minute cron in `docs/supabase/STORAGE_LIFECYCLES.md`.

Canonical: `docs/sequences/POST_LOGIN_STARTUP.mmd`,
`docs/sequences/LANGUAGE_ONBOARDING.mmd`,
`docs/backend-handoff/POST_LOGIN_LANGUAGE_MODEL_GATE_HANDOFF.md`.

## Compliance, safety & peer messaging

**Startup order (CURRENT FRONTEND / CURRENT SUPABASE, 2026-09-17):** signed out →
sign in/up → `/onboarding/language` (MANDATORY per-session decision) →
`/onboarding/model` (MANDATORY per-session decision: backend-confirmed `ready`,
or explicit continue-without-AI) → `/onboarding/compliance` if still required
(CURRENT SUPABASE flag `account_compliance.compliance_onboarding_completed`, RPC
`complete_account_compliance_onboarding`) → `/home`. The system
admission gate is NOT part of this order any more; its data is shown on the model
screen and `/onboarding/system-admission` is optional. `account_compliance.account_status
= 'suspended_pending_review'` outranks every other route and redirects to
`/account/suspended`. Legal routes: `/legal/terms`, `/legal/privacy`,
`/legal/acceptable-use`, `/legal/child-safety`. See
`sequences/SIGNUP_ROLE_GUARDIAN_CONSENT.mmd`, `sequences/POST_LOGIN_STARTUP.mmd`.
