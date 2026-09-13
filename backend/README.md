# Alim backend

This FastAPI service compiles bounded tutoring context and routes it only to the locally served
`Qwen/Qwen3.8-27B` model. Startup manages `llama-server` and does not accept traffic until the
expected model alias is resident and listed by `/v1/models`.

## Key modules

| Location | Responsibility |
| --- | --- |
| `app/main.py` | API models, endpoints, startup/shutdown lifecycle, errors |
| `app/platform.py` | Linux CUDA/CPU and Apple-Silicon Metal detection |
| `app/model_spec.py` | Canonical model identity and offline GGUF validation |
| `app/services/model_runtime.py` | Managed llama.cpp process and readiness checks |
| `app/context/` | Intent analysis, retrieval, memory, web cache, budgeting, prompt compilation |
| `scripts/setup_environment.py` | Cross-platform Conda/runtime/frontend setup |
| `scripts/start_app.py` | Coordinated model, API, and frontend startup |

## Run

From the repository root after platform setup and model download:

```bash
conda activate alim-study
python backend/scripts/start_app.py
```

For API-only development with an externally managed model server:

```bash
ALIM_MODEL_AUTOSTART=false uv run --project backend \
  uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8001
```

The API exposes `/health`, `/api/model/status`, `/api/chat`, `/api/context/compile`,
`/api/context/documents/text`, `/api/context/events`, and `/api/context/artifacts`. Local state
defaults to `app-data/context/alim-context.db`. Web retrieval is intent-gated, cached,
provenance-labelled, and constrained by the same hard budget as local evidence.

Tests live in repository-level `tests/backend/` and `tests/e2e/`; they do not require Lovable or
Supabase.
