# Frontend local setup and hosting

The authoritative UI runs locally at `http://127.0.0.1:8080`. Lovable URLs are
editor metadata, not launch, redirect, callback, CORS, health or support URLs.

## Environment and install

Use Node 22 (`frontend/.node-version`) and Bun 1.4.2
(`frontend/.bun-version`). `package.json` and exact `bun.lock` own browser,
TanStack/Vite, lint, typecheck and Vitest dependencies. From `frontend/`:

```bash
bun install --frozen-lockfile
cp .env.example .env
```

Set only browser-safe `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY`; never put a service-role secret in any `VITE_*`
value. Server-side equivalents are intentionally unprefixed. Keep
`ALIM_CONTEXT_BACKEND_URL=http://127.0.0.1:8001` and the OAuth return origin on
loopback. Hosted and local Supabase require matching values but do not change
the application URL.

## Lifecycle

From any directory:

```bash
/absolute/repo/scripts/dev/frontend.sh start
/absolute/repo/scripts/dev/frontend.sh status
/absolute/repo/scripts/dev/frontend.sh health
/absolute/repo/scripts/dev/frontend.sh stop
```

The launcher invokes the repository-local Vite binary with `--strictPort`, waits
for an HTTP response, writes ignored state/logs to `.local/alim`, detects stale
PID state, and signals only its ownership-token wrapper. Use the whole-stack
guide for normal operation. `bun run dev` is acceptable for interactive frontend
work but does not provide the ownership/rollback contract.

## Verification and troubleshooting

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

If port 8080 is occupied, stop the known process or deliberately set
`ALIM_FRONTEND_PORT` and matching backend CORS/OAuth configuration. Never bind
to LAN interfaces without a separate security review. Inspect
`.local/alim/logs/frontend.log` for failed readiness. Clear generated
`node_modules`/build caches only while stopped; do not delete user browser data
as a dependency repair. Updates must review `package.json` and commit the changed
`bun.lock` together.

Browser session data and Supabase-backed durable records are not backend/model
files. Back up Supabase separately; local AI prompts/documents stay within the
local backend boundary unless a documented external web lookup is enabled.
