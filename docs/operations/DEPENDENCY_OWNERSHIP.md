# Dependency ownership and exposure matrix

| Layer | Owned packages/tools | Pin/lock source | Update and cache/data location | Exposure/security class |
|---|---|---|---|---|
| UX/UI documentation | Markdown, Mermaid, `frontend/scripts/validate-{docs,mermaid}.ts` | repository docs/scripts at Git SHA | review docs and mirrored navigation together; no daemon/cache required | public design contracts; never secrets |
| Frontend | Node 22, Bun 1.4.2, TanStack/Vite/React packages | `frontend/.node-version`, `.bun-version`, `package.json`, exact `bun.lock` | update with Bun in `frontend/`; `frontend/node_modules` and build output ignored | browser/public; only `VITE_*` publishable values; loopback 8080 |
| Supabase hosted | HTTPS Data/Auth/Storage APIs | project ref and client versions; migrations under `supabase/` | provider-managed; local repo owns migrations, RLS tests and backup procedure | remote durable user data; publishable key + JWT; no browser service role |
| Supabase local | CLI 2.117.0 and Docker-compatible services | `supabase/CLI_VERSION`, `supabase/config.toml`, migrations | update only after migration/RLS validation; images/volumes owned by container runtime | developer-only ports 54321–54323; default credentials/no TLS; never expose |
| Python backend | Python 3.11, FastAPI/httpx/Pydantic/Uvicorn and optional document/download/dev groups | `backend/.python-version`, `pyproject.toml`, exact `uv.lock`; `backend/environment.yml` pins uv 0.12.13 | `uv lock` after review; environment `backend/.venv`; Python caches ignored | server-only local API on 8001; caller JWT; no service-role normal path |
| Model runtime | llama.cpp 10751 CPU/CUDA130 or Metal/Accelerate; verified GGUF catalog | `backend/model-runtime/environment-*.yml`, model registry/checksums | update per platform after compatibility tests; weights in OS data root/`ALIM_MODEL_CACHE_ROOT` | local inference only on 8000; weights/prompts private; no automatic download |
| E2E/quality | Pytest/Ruff from backend dev group; Vitest/ESLint/TypeScript from frontend lock | same backend/frontend locks | results under ignored `tests/results`; browser binaries, if introduced, need their own pinned cache | test-only; synthetic fixtures; no production secrets |
| Lifecycle control | POSIX shell, curl, ps | `scripts/dev/` at Git SHA | ownership/PIDs/logs under ignored `.local/alim`; no global install | local operator; validates ownership token before signalling |

These boundaries are intentionally not merged into a global environment. The
bootstrap scripts do not install system packages or request root. Large weights,
secrets, user records, container volumes, logs, process state and caches must not
be committed. Dependency updates are layer-specific and must preserve both lock
files and cross-layer contracts.

## Inter-layer environment names

Frontend owns `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, `ALIM_CONTEXT_BACKEND_URL` and timeout. Backend
owns `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, loopback Host/CORS values,
database paths and `ALIM_LLM_*`/`ALIM_EMBEDDING_*`. Lifecycle control owns
`ALIM_SUPABASE_MODE`, `ALIM_ENABLE_AI`, ports, startup timeouts and
`ALIM_LOCAL_STATE_ROOT`. Model control owns cache/path, executable, threads,
batch, GPU layers and explicit download authorization. Record names in docs;
record values only in ignored local configuration.
