# Alim frontend

Status: `CURRENT — FRONTEND`, synchronized from `main` authority
`f0910e6971f12efe0ad547b904f6e2a518b13856`.

The TanStack Start/React application lives under `frontend/src`. Browser code is
platform-neutral and does not load model weights. AI requests pass through
TanStack server routes/functions to loopback FastAPI; ordinary frontend data
calls use Supabase publishable configuration and user-scoped authorization.

## Local application URL

The development application binds to loopback port 8080 and is opened at
`http://127.0.0.1:8080` (or the equivalent configured `localhost` callback).
Lovable is editor/build integration, not the runtime host.

The local FastAPI default is `http://127.0.0.1:8001`. Authentication and non-AI
product areas remain usable without a ready model backend.

## Commands

After a lockfile-based frontend dependency installation in the frontend-owned
Node/Bun environment:

```bash
bun run dev
bun run typecheck
bun run lint
bun run test
bun run build
```

This documentation run did not download packages. The existing ignored
dependency directory lacked `vitest` and `mathlive`, so only lint completed;
Prompt 08 must publish and test the clean-install procedure on supported hosts.

## Source map

| Path | Responsibility |
|---|---|
| `src/components/` | application/UI components and states |
| `src/routes/` | TanStack file routes and server API route |
| `src/lib/` | contracts, adapters, session/state, persistence and utilities |
| `src/integrations/supabase/` | active browser/server Supabase clients/types |
| `src/routeTree.gen.ts` | generated route tree; do not hand-edit |
| `docs/README.md` | local doorway to canonical repository documentation |

Start with [the frontend documentation doorway](docs/README.md) or the
[canonical repository documentation](../docs/README.md).
