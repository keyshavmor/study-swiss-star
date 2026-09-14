# Frontend

The TanStack Start/React frontend lives entirely in this directory. Browser code is deliberately
platform-neutral: the Python bootstrap detects Linux/CUDA, Linux/CPU, or Apple Silicon/Metal before
it installs the local model runtime. For the complete one-command setup, start with
[`../docs/CROSS_PLATFORM_SETUP.md`](../docs/CROSS_PLATFORM_SETUP.md).

After activating `alim-study`, run commands from this directory:

```bash
npm ci
npm run dev
npm run typecheck
npm run lint
npm run build
```

The authenticated `frontend/src/routes/api/chat.ts` route forwards the current question to the
local Python backend. It does not load model weights in the browser. The root
`backend/scripts/start_app.py` orchestration command starts this frontend alongside the backend and
managed Qwen runtime.

## Source map

| Path | Responsibility |
| --- | --- |
| `src/components/` | Reusable application and UI components |
| `src/routes/` | TanStack file routes, including the local chat proxy |
| `src/lib/` | Authenticated backend bridges, Supabase-backed state adapter, fixtures, and utilities |
| `src/integrations/` | Supabase clients/session middleware and Lovable preview compatibility |
| `src/styles.css` | Global Tailwind styles and theme tokens |

`src/routeTree.gen.ts`, lockfiles, and build output are generated artifacts and should not be
hand-edited. Lovable remains the editor/frontend generator, not the runtime auth or database owner.
Copy `.env.example` to an ignored local env file and supply the target project's publishable key.
