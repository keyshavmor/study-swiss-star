```
Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466
```

# Deployment Architecture — Alim / Gymi Genius

## Where each piece runs

| Component | Runs on | Notes |
|---|---|---|
| Browser UI | Student's browser | React 19 SPA, TanStack Router, Web Speech API |
| `/api/chat` server route | TanStack server runtime, Cloudflare-Worker-class edge | No `child_process`/native deps — must run in an edge/worker-compatible runtime |
| Supabase | Supabase cloud (project `ucacmeadsufiedxrgqit`) | Auth, Postgres+RLS, Storage, Edge Functions |
| Local Python backend | Student's local machine | FastAPI on `127.0.0.1:8001` — BACKEND IMPLEMENTATION UNKNOWN |
| Local model runtime | Student's local machine | llama.cpp / Qwen on `127.0.0.1:8000`, called only by the local backend |
| Google OAuth / Calendar API v3, GitHub / LinkedIn / Spotify OAuth | External providers' infrastructure | Reached only over HTTPS from browser or Supabase Auth |

## TanStack server runtime constraint

The `/api/chat` handler (`frontend/src/routes/api/chat.ts`) must run within an edge/worker-class runtime
(no Node-only `child_process` or native dependencies): it only uses `fetch`, `AbortController`, and the
`@supabase/supabase-js` HTTP client, and streams responses via the AI SDK's UI message stream.

## Environment variables (names only — never values)

| Variable | Used by |
|---|---|
| `SUPABASE_URL` | `routes/api/chat.ts` server-side Supabase client |
| `SUPABASE_PUBLISHABLE_KEY` | `routes/api/chat.ts` server-side Supabase client |
| `VITE_SUPABASE_*` | Browser-side Supabase client build-time config (`integrations/supabase/client.ts`) |
| `ALIM_CONTEXT_BACKEND_URL` | `lib/context-backend.server.ts` — local backend base URL, default `http://127.0.0.1:8001` |
| `ALIM_CONTEXT_BACKEND_TIMEOUT_MS` | `lib/context-backend.server.ts` — request timeout, default `90000` |

## Diagram

See `DEPLOYMENT_ARCHITECTURE.mmd`.

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
