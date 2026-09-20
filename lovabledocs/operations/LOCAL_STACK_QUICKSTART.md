# ALIM local stack: operator quickstart

| Field | Contract |
|---|---|
| Supported hosts | Ubuntu 24.04/26.04 LTS (`x86_64` or `aarch64`); macOS 15/26 on Apple silicon, including M4 |
| Verified in Prompt 08 | Ubuntu 26.04 `x86_64` lifecycle simulation and the complete existing test suite |
| Still requires physical proof | macOS/M4 bootstrap, Metal inference and full browser walkthrough |
| User URL | `http://127.0.0.1:8080` |
| Private local APIs | backend `127.0.0.1:8001`; model `127.0.0.1:8000` |

The launchers refuse non-loopback application binds. Lovable is an editor/build
integration only and is never an application launch target.

## 1. Prepare isolated environments

Clone the repository normally or create a named Git worktree. Keep the path even
if it contains spaces; all scripts resolve the repository from their own path.
Do not run setup as root.

Ubuntu:

```bash
cd /path/to/study-swiss-star-backend
./scripts/env/bootstrap_ubuntu.sh --check
./scripts/env/bootstrap_ubuntu.sh --setup
```

Apple-silicon macOS / MacBook M4:

```bash
cd /path/to/study-swiss-star-backend
./scripts/env/bootstrap_macos.sh --check
./scripts/env/bootstrap_macos.sh --setup
```

The scripts validate rather than install system packages. They create only the
locked `backend/.venv` and `frontend/node_modules`. Follow their manual message
for a missing prerequisite. Frontend uses Node 22 and Bun 1.4.2; backend uses
Python 3.11 plus `backend/uv.lock`. Supabase CLI 2.117.0 and Docker belong only
to local-Supabase mode. See [Dependency ownership](DEPENDENCY_OWNERSHIP.md).

## 2. Configure without committing secrets

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

Fill the named publishable Supabase fields. Never use a service-role key in the
browser or backend normal path. Keep the checked-in loopback application URLs.

- Hosted mode (default): `ALIM_SUPABASE_MODE=hosted`. The launcher verifies the
  configured HTTPS project health and never starts or stops that external service.
- Local mode: export `ALIM_SUPABASE_MODE=local`. The pinned CLI uses containers;
  this developer stack has default credentials, no TLS/rate limits, and must
  never receive LAN or Internet traffic.

Local AI and Supabase are distinct boundaries. Prompts, documents, retrieval,
embeddings and inference stay on the machine. Durable account/preferences data
crosses to the configured hosted Supabase only when hosted mode is selected.

## 3. Models are explicit and optional

`ALIM_ENABLE_AI=0` is the safe bring-up default. It supports non-inference API
and UI checks but truthfully reports AI unavailable. Model weights are never
auto-downloaded. Inspect disk/memory first, then use the documented, affirmative
download command in `backend/docs/operations/LOCAL_SETUP_AND_HOSTING.md` and set
`ALIM_ENABLE_AI=1`.

Ubuntu selects a compatible llama.cpp CUDA build when a supported NVIDIA device
is detected, otherwise CPU. Apple silicon selects Metal/Accelerate. Both expose
the same OpenAI-compatible loopback contract; fallback never changes UX/API
semantics or fabricates readiness.

## 4. Start, inspect, and stop

Detached (logs and ownership state remain visible under ignored `.local/alim/`):

```bash
ALIM_SUPABASE_MODE=hosted ALIM_ENABLE_AI=0 ./scripts/dev/start_all.sh
./scripts/dev/status_all.sh
./scripts/dev/stack.sh health
./scripts/dev/stop_all.sh
```

Foreground, with signal cleanup only for processes started by this invocation:

```bash
ALIM_SUPABASE_MODE=hosted ALIM_ENABLE_AI=1 ./scripts/dev/start_all.sh foreground
```

Dependency order is Supabase connectivity, optional model, backend, frontend.
Readiness failure rolls back only layers newly started by that attempt. Repeated
start/stop is safe; stale ownership files are discarded after process-command
verification. `stop` will not signal an unowned PID.

Per-layer commands are identical: `scripts/dev/{supabase,model,backend,frontend}.sh
{start|stop|status|health}`. Documentation checks are on demand through
`scripts/dev/quality.sh health`.

## Operations, privacy, and recovery

- Logs/PIDs/tokens: `.local/alim/{logs,run}` (ignored). These may contain local
  paths or application diagnostics; protect and delete them according to policy.
- Model data: OS data directory or `ALIM_MODEL_CACHE_ROOT`, always outside Git.
- User context: `app-data/context/` or `ALIM_ASSESSMENT_DB`; back it up only while
  the backend is stopped. Hosted Supabase backup/retention is a separate service.
- Updates: stop, create a backup, pull without rewriting shared history, rerun
  platform `--check` and `--setup`, run tests, then restart.
- Port occupied: stop the known owner or choose matching loopback port variables;
  never weaken the loopback guard. A readiness failure names its log.
- Stale state: run layer `status`; it removes only a stale PID/token pair.
- Local Supabase failure: verify Docker is ready and the pinned CLI version, then
  run `supabase/scripts/local.sh status`. `reset` requires the explicit destructive
  gate and must never target a linked project.
- Shutdown: use `stop_all.sh`, wait for status to show stopped, then back up data.

Environment names and their trust classes are catalogued in the dependency
matrix and the two owned layer guides. Values belong only in ignored `.env` files.
