```
Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
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
