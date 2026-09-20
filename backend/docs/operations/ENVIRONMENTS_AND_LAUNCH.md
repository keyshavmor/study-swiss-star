# Backend environments and launch contract

| Field | Value |
|---|---|
| Owner | Backend operations |
| Status | Prompt 08 isolated lifecycle and central launcher current |
| Canonical path | `backend/docs/operations/ENVIRONMENTS_AND_LAUNCH.md` |
| Host evidence | Ubuntu 26.04.1 x86_64 only; CUDA unavailable |
| MacBook M4 | `UNVERIFIED — MANUAL` |
| Last reviewed | 2026-09-20 |

Python application dependencies belong to `alim-backend`, governed by
`backend/environment.yml`, `backend/.python-version` (Python 3.11),
`backend/pyproject.toml` and exact `backend/uv.lock`. Sync its project
environment with `uv sync --project backend --extra dev --extra documents`.
`pypdf` and `python-docx` stay in this backend-only documents extra; they never
enter the frontend, Supabase CLI, or model-runtime environments. Model-runtime
binaries belong to the separate `alim-model-runtime` environment selected from
the pinned manifests under `backend/model-runtime/`; weights are external data.
Frontend Node packages use the repository package manager. Supabase CLI/local
containers retain their own boundary.

Model weights default to the platform data directory outside Git. Set
`ALIM_MODEL_CACHE_ROOT` for a dedicated volume. Model lifecycle is:

```bash
conda run -n alim-model-runtime python backend/scripts/model_runtime.py check
conda run -n alim-model-runtime python backend/scripts/model_runtime.py import --source /absolute/model.gguf
# or, only after reviewing the 17.67 GiB transfer:
conda run -n alim-model-runtime python backend/scripts/model_runtime.py download --yes-download
conda run -n alim-model-runtime python backend/scripts/model_runtime.py command
conda run -n alim-model-runtime python backend/scripts/model_runtime.py start
conda run -n alim-model-runtime python backend/scripts/model_runtime.py status
conda run -n alim-model-runtime python backend/scripts/model_runtime.py health
conda run -n alim-model-runtime python backend/scripts/model_runtime.py stop
```

`start` is a foreground controller composed by `scripts/dev/model.sh`. It owns
its PID marker outside Git, binds llama.cpp to loopback and
stops only its child. Automatic startup/download are false by default.

Current API development command remains documented in `backend/README.md` and
binds FastAPI to `127.0.0.1:8001`; the model endpoint defaults to
`127.0.0.1:8000/v1`. Server-only Supabase values come from `backend/.env.example`
with empty secret values. No real secret, weight, cache, log or user data is
committed.

`ALIM_BACKEND_HOST`, `ALIM_BACKEND_PORT`, `ALIM_CORS_ALLOWED_ORIGINS` and
`ALIM_ALLOWED_HOSTS` belong only to the Python backend. Unsafe wildcard or
Lovable origins fail before startup. The current launcher consumes the same
validated host/port settings; remote binding needs explicit opt-in and is not
claimed as a supported local default.

`ALIM_ASSESSMENT_DB` optionally selects the local private assessment-state file.
Its default is `app-data/context/alim-assessments.db`, outside tracked source;
the backend creates its directory mode `0700` and file mode `0600`. It belongs to the Python backend layer, not
the frontend, Supabase CLI or model-runtime environments. Operators must protect
and delete it with the same care as answer keys; no browser can read it.

Ubuntu CPU/CUDA and Apple-silicon Metal are required target paths. Prompt 04
adds selection fixtures and runtime tuning; the present physical host proves
Ubuntu 26.04.1 CPU probing only. CUDA and M4/Metal are `UNVERIFIED — MANUAL`.
Prompt 06's chat, assessment, hashing/local embedding, retrieval and parser code is
platform-neutral; tests on this host are not physical M4 evidence. Prompt 08
supplies the isolated bootstrap/lifecycle scripts and user guides; Prompt 09 must run real or
explicitly manual platform smoke tests. Large model acquisition must show
size/time and require operator opt-in.

The centralized launcher contract is defined in
[`../../../docs/cross-system/EXECUTION_ENVIRONMENTS.md`](../../../docs/cross-system/EXECUTION_ENVIRONMENTS.md).
