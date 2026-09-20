# Backend and local-model setup and hosting

The FastAPI service binds to `127.0.0.1:8001`; llama.cpp binds to
`127.0.0.1:8000`. Both reject non-loopback defaults. The frontend owns product
behavior; this backend implements its versioned contract and never fabricates AI
success when the model is absent.

## Python environment

Python 3.11 is pinned by `.python-version`; `pyproject.toml` declares groups and
`uv.lock` fixes transitive versions. The isolated environment is
`backend/.venv`:

```bash
uv sync --project backend --frozen --all-extras
cp backend/.env.example backend/.env
./scripts/dev/backend.sh start
./scripts/dev/backend.sh health
```

Configure names from `.env.example`, never values in Git: publishable Supabase
URL/key, exact Host/CORS loopback lists, private assessment/context paths,
model/cache/runtime values, OpenAI-compatible loopback endpoints, and optional
web/RAG limits. The normal data path forwards a verified user JWT and does not
use a service-role credential.

## Model environment and explicit authorization

The backend and model runtime are separate. Choose exactly one locked Conda
manifest under `backend/model-runtime/`: Linux CPU, Linux CUDA 13.0, or macOS
Metal/Accelerate. CUDA is used only after compatible NVIDIA detection; Apple
silicon uses unified memory/Metal. CPU fallback preserves API semantics but is
slower. The verified Q4 artifact is 18,973,870,432 bytes and its current
admission envelope is about 23.7 GB before context/runtime variance. Leave
additional free disk for resumable transfer state and additional RAM/VRAM for
KV cache; inspect the live registry/probe output before authorizing it. The
tested historical GPU class is a 24 GB RTX 3090; the 48 GB M4 path remains
pending physical Prompt 09 certification.

```bash
# inspect without network or model download
backend/.venv/bin/python backend/scripts/model_runtime.py check

# explicit, resumable download after accepting disk/network impact
backend/.venv/bin/python backend/scripts/model_runtime.py download --yes-download

ALIM_ENABLE_AI=1 ./scripts/dev/model.sh start
./scripts/dev/model.sh health
./scripts/dev/model.sh stop
```

Set `ALIM_MODEL_CACHE_ROOT` to a private, backed-up path outside Git if the OS
data default is unsuitable. Checksums/registry metadata gate readiness. A failed
download is not readiness; partial transfers may resume. Model selection in the
UI maps to registry capabilities and cannot install arbitrary code.

## Tests, logs, data, and recovery

```bash
uv run --project backend --frozen pytest
uv run --project backend --frozen ruff check backend tests/backend
```

Lifecycle state/logs are in ignored `.local/alim`; private SQLite data defaults
under ignored `app-data/context`; model weights remain outside Git. Stop the API
before copying SQLite data. Back up hosted Supabase through its separate policy.
For readiness failure inspect the named layer log, confirm ports 8000/8001,
confirm loopback URLs, and run layer `status`. It discards stale state only after
process identity fails and never kills an unrelated PID. On updates: stop,
backup, pull without rewriting shared history, run locked sync/tests, then start.

Local Supabase is a Docker/CLI developer dependency, not part of the Python
environment. Hosted Supabase is reachable over HTTPS and remains the only remote
durable-data boundary in hosted mode. The model does not send prompts or files
to a cloud inference service.
