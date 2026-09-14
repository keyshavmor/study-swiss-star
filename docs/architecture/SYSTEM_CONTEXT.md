```
Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
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
