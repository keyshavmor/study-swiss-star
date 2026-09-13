# Local development

## Ports

| Service | URL |
| --- | --- |
| TanStack frontend | `http://localhost:8080` |
| FastAPI context backend | `http://127.0.0.1:8001` |
| Preloaded Qwen3.8-27B/llama.cpp | `http://127.0.0.1:8000/v1` |

## Recreate the environment

Run the same bootstrap on Ubuntu/Debian or an Apple Silicon Mac:

```bash
python3 backend/scripts/setup_environment.py --dry-run  # optional preview
python3 backend/scripts/setup_environment.py
conda activate alim-study
```

It reads `environment.yml`, installs Python/Node/npm/uv, selects the llama.cpp build for detected
CUDA, Metal/Accelerate, or Linux CPU, syncs `backend/uv.lock`, and installs
`frontend/package-lock.json`. Add `--with-model` to download the 17.67 GiB model in the same run.
For a network-free machine, use `--model-source /path/to/Qwen3.8-27B-Q4_K_M.gguf` instead.

If Conda is not already on `PATH`, the script also checks `~/anaconda3/bin/conda` and
`~/miniconda3/bin/conda`. Intel macOS is intentionally rejected; the supported Mac target is native
Apple Silicon without Rosetta.

`uv` owns Python dependency locking in `backend/uv.lock`; npm owns frontend dependency locking in
`frontend/package-lock.json`. `frontend/bun.lock` remains available for Lovable/Bun workflows, but a
dependency update should not regenerate both locks accidentally.

## Download the required model

```bash
uv run --project backend python models/download_qwen3_8_27b.py --check
uv run --project backend python models/download_qwen3_8_27b.py --dry-run
uv run --project backend python models/download_qwen3_8_27b.py
uv run --project backend python models/download_qwen3_8_27b.py --source-file /path/to/Qwen3.8-27B-Q4_K_M.gguf
```

The first and fourth commands are offline. The second and third require outbound HTTPS access to
Hugging Face. The resulting `models/Qwen3.8-27B/` directory is not committed.

## Start everything

```bash
python backend/scripts/start_app.py
```

The backend validates Qwen, downloads it automatically if absent, and preloads it before becoming
ready. Set `ALIM_MODEL_AUTO_DOWNLOAD=false` to require pre-provisioned weights. The frontend can
render while the model loads, but AI calls return only after FastAPI startup completes. Inspect `logs/backend.log`,
`logs/frontend.log`, and `logs/qwen3.8-27b-llama-server.log` if startup fails.

To run components independently for UI/API development, point FastAPI at an already-running
Qwen-compatible endpoint and disable process ownership explicitly:

```bash
ALIM_MODEL_AUTOSTART=false uv run --project backend uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8001
cd frontend
npm run dev
```

## Local-first reference context

Reference retrieval is on by default and activates for explicit current/browsing requests or when a
normal study question has no relevant local document/syllabus match. Its
default `auto` provider searches `.md`, `.txt`, `.html`, and `.htm` snapshots under
`material/web/`, then automatically uses Wikipedia if no relevant local match exists. Set
`allow_web:false` on an API request or
`ALIM_WEB_ENABLED=false` globally to disable the branch. Selected text is cached under `app-data/`,
labelled untrusted, and limited by the web section and global context budgets. Set
`ALIM_WEB_PROVIDER=local` for no network access or `wikipedia` to force live MediaWiki retrieval.

## Tests

```bash
PYTHONPATH=backend:. uv run --project backend pytest tests/backend -q
PYTHONPATH=backend:. uv run --project backend pytest tests/e2e -q
uv run --project backend ruff check backend tests models

cd frontend
npm run typecheck
npm run lint
npm run build
```

The E2E suite uses a disposable protocol fixture, not the 27B checkpoint. A real model smoke test
requires the checkpoint and `llama-server`. CUDA is fastest on Linux; a broken/missing NVIDIA driver
selects a slower but functional CPU runtime. On the M4 Pro, Metal uses unified memory automatically.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Startup says checkpoint missing | Run the downloader `--check`, then download/resume |
| `llama-server` is missing | Activate `alim-study`; run the setup script again |
| Model server exits during preload | Check `logs/qwen3.8-27b-llama-server.log`; on Linux also run `nvidia-smi` |
| Linux unexpectedly uses CPU | Repair the NVIDIA driver, rerun setup to select the CUDA build, then restart |
| Apple Mac uses the wrong architecture | Confirm `uname -m` is `arm64` and do not run the shell through Rosetta |
| Chat returns 503 | Confirm `/health` and `/v1/models` list `Qwen/Qwen3.8-27B` |
| No local reference sources | Automatic mode uses Wikipedia; check connectivity or add snapshots under `material/web/` |
| Prompt too large | Inspect debug budget data; reduce section limits or selected material |
| Sign-in fails offline | Supabase authentication still requires connectivity |
