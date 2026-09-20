# Alim backend

Status: `CURRENT — LOCAL BACKEND` through the Prompt 06 assessment foundation,
not the complete frontend-required backend. See
[backend documentation](docs/README.md) and the
[gap analysis](docs/handoff/BACKEND_GAP_ANALYSIS.md). Commands below describe
the implemented registry-backed model foundation; nine enabled IDs honestly
remain unresolved and the central all-layer launcher remains later prompt work.
Physical MacBook M4 and working CUDA paths
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
| `app/model_registry.py` / `app/artifact_store.py` | Exact allowlist and safe external artifact cache |
| `app/system_probe.py` / `app/runtime_control.py` | Capability, recommendation, operations and leases |
| `app/services/model_runtime.py` | Managed llama.cpp process and readiness checks |
| `app/context/` | Intent analysis, retrieval, memory, web cache, budgeting, prompt compilation |
| `app/assessment/` | Generation contracts, private lifecycle/keys, Supabase public store and server grading |
| `scripts/setup_environment.py` | Cross-platform Conda/runtime/frontend setup |
| `scripts/model_runtime.py` | Isolated check/import/download/start/stop/status lifecycle |
| `scripts/start_app.py` | Legacy coordinated API/frontend startup; Prompt 08 will reconcile it |

## Run

From the repository root after platform setup, start the isolated model runtime
and API in separate terminals:

```bash
conda run -n alim-model-runtime python backend/scripts/model_runtime.py start
conda activate alim-backend
uv run --project backend uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8001
```

For API-only development with an externally managed model server:

```bash
uv sync --project backend --extra dev --extra documents
ALIM_MODEL_AUTOSTART=false uv run --project backend \
  uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8001
```

The API exposes liveness at `/health`, model-dependent readiness at `/ready`,
the authenticated model/system routes documented in
[`docs/api/CONTRACT_V1.md`](docs/api/CONTRACT_V1.md), `/api/chat`, `/api/context/compile`,
`/api/context/documents/text`, `/api/context/documents/storage`, `/api/context/events`, and
`/api/context/artifacts`, and the `/api/assessments/*` lifecycle. Every private endpoint verifies a Supabase bearer token, derives the owner
from its verified `sub`, and constructs a new user-scoped Supabase store for that request. Reference
retrieval searches `material/web/` first
and automatically uses Wikipedia only when no relevant local match exists. It is intent-gated,
cached, provenance-labelled, and constrained by the same hard budget as local evidence. Use
`ALIM_WEB_PROVIDER=local` to prohibit network retrieval.

`/api/chat` also verifies thread ownership, requires a concrete safety-moderator
`allow` verdict, probes the selected local model, and durably replays exact
completed responses by user-message ID. The default app intentionally has no
safety bypass: chat returns `safety_unavailable` until Prompt 07 wires the local
moderator. See the cross-system
[`CHAT_ASSISTANT_RAG_CONTRACT`](../docs/contracts/CHAT_ASSISTANT_RAG_CONTRACT.md).

Assessment generation and subjective grading use that same selected local model
and fail closed on missing safety or model readiness. A mode-0600 local SQLite
file keeps answer keys and restart-safe ephemeral state; caller-token Supabase
writes contain only sanitized questions, attempts, answers and results. See the
[assessment API contract](../docs/contracts/ASSESSMENT_API_CONTRACT.md). Set
`ALIM_ASSESSMENT_DB` only to override its ignored app-data location.

Large model download and model autostart are disabled by default. The explicit
Prepare request may acquire the one verified mapping, or an operator may run
`conda run -n alim-model-runtime python backend/scripts/model_runtime.py download
--yes-download`. Model data defaults outside Git. `start_app.py` honors
`ALIM_MODEL_AUTO_DOWNLOAD=true` only as an explicit legacy operator opt-in.

Tests live in repository-level `tests/backend/` and `tests/e2e/`; they do not require Lovable or
Supabase. AI inference, parsing, embeddings, reranking, and context compilation remain local;
SQLite is not the production user database; it is the deliberately private
local store for assessment keys/lifecycle as well as an adapter used in tests.

See the [versioned API contract](docs/api/CONTRACT_V1.md). Default application
and API origins are loopback-local; a Lovable URL is never a runtime origin.
