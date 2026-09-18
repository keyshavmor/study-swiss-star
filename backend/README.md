# Alim backend

Status: `CURRENT — LOCAL BACKEND` through the Prompt 03 contract foundation,
not the complete frontend-required backend. See
[backend documentation](docs/README.md) and the
[gap analysis](docs/handoff/BACKEND_GAP_ANALYSIS.md). Commands below describe
the implemented single-model backend; multi-model/platform support and isolated
launchers remain later prompt work. Physical MacBook M4 and working CUDA paths
are not proven by this document.

This FastAPI service compiles bounded tutoring context and routes it only to the locally served
`Qwen/Qwen3.8-27B` model. Startup manages `llama-server` and does not accept traffic until the
expected model alias is resident and listed by `/v1/models`.

## Key modules

| Location | Responsibility |
| --- | --- |
| `app/main.py` | API models, endpoints, startup/shutdown lifecycle, errors |
| `app/auth.py` | centralized Supabase bearer verification and identity derivation |
| `app/config.py` | fail-fast loopback, CORS, Host and contract settings |
| `app/contracts.py` / `app/errors.py` | typed liveness/readiness and stable public errors |
| `app/platform.py` | Linux CUDA/CPU and Apple-Silicon Metal detection |
| `app/model_spec.py` | Canonical model identity and offline GGUF validation |
| `app/services/model_runtime.py` | Managed llama.cpp process and readiness checks |
| `app/context/` | Intent analysis, retrieval, memory, web cache, budgeting, prompt compilation |
| `scripts/setup_environment.py` | Cross-platform Conda/runtime/frontend setup |
| `scripts/start_app.py` | Coordinated model, API, and frontend startup |

## Run

From the repository root after platform setup:

```bash
conda activate alim-study
python backend/scripts/start_app.py
```

For API-only development with an externally managed model server:

```bash
uv sync --project backend --extra dev
ALIM_MODEL_AUTOSTART=false uv run --project backend \
  uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8001
```

The API exposes liveness at `/health`, model-dependent readiness at `/ready`,
and `/api/model/status`, `/api/chat`, `/api/context/compile`,
`/api/context/documents/text`, `/api/context/documents/storage`, `/api/context/events`, and
`/api/context/artifacts`. Every private endpoint verifies a Supabase bearer token, derives the owner
from its verified `sub`, and constructs a new user-scoped Supabase store for that request. Reference
retrieval searches `material/web/` first
and automatically uses Wikipedia only when no relevant local match exists. It is intent-gated,
cached, provenance-labelled, and constrained by the same hard budget as local evidence. Use
`ALIM_WEB_PROVIDER=local` to prohibit network retrieval.

`start_app.py` validates the model, automatically invokes the resumable downloader if it is absent,
and then starts the preloaded runtime. Set `ALIM_MODEL_AUTO_DOWNLOAD=false` to require an existing
checkpoint instead.

Tests live in repository-level `tests/backend/` and `tests/e2e/`; they do not require Lovable or
Supabase. AI inference, parsing, embeddings, reranking, and context compilation remain local;
SQLite is a test adapter rather than the production user database.

See the [versioned API contract](docs/api/CONTRACT_V1.md). Default application
and API origins are loopback-local; a Lovable URL is never a runtime origin.
