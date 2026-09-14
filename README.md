# Alim — Swiss Gymnasium study application

Alim is a local-first tutoring application with a TanStack Start frontend, a Python context
compiler, developer-owned Supabase authentication/durable persistence, and the official open-weight
`Qwen/Qwen3.8-27B` model served locally through the cross-platform `llama.cpp` runtime.

## Repository layout

```text
study-swiss-star/
├── backend/       Python API, context compiler, model lifecycle, startup orchestration
├── frontend/      TanStack Start/React application and frontend documentation mirror
├── material/      Source learning material before ingestion
├── logs/          Runtime logs (generated logs are ignored)
├── models/        Qwen download/check script and local model-weight directory
├── supabase/      Supabase configuration and database migrations
├── app-data/      Reusable local context database, caches, memory, and artifacts
├── tests/         Backend, API, and process-level E2E tests plus test-result location
├── docs/          Canonical architecture and operating documentation
├── lovabledocs/   Byte-for-byte documentation mirror used by Lovable
└── environment.yml Shared Conda bootstrap; setup code selects the platform runtime build
```

Lovable metadata remains at the repository root because moving it would disconnect the project.
Published Git history must not be rebased or force-pushed.

## Required model

The only core generation model is the Apache-2.0
[`Qwen/Qwen3.8-27B`](https://huggingface.co/Qwen/Qwen3.8-27B) checkpoint. Alim downloads the
`Q4_K_M` GGUF conversion maintained by the upstream llama.cpp organization. It is derived from the
official checkpoint, is approximately 17.67 GiB, and is practical on both the 24 GB RTX 3090 and
the 48 GB M4 Pro. The unquantized BF16 checkpoint is about 54 GB and cannot fit on either target
machine once runtime memory is included.

Qwen supports 262,144 native tokens. Alim chooses a safer working window from detected hardware:

| Host | Runtime acceleration | Default total context | Reserved output |
| --- | --- | ---: | ---: |
| Apple Silicon with at least 40 GiB unified memory | Metal | 65,536 | 16,384 |
| NVIDIA GPU with 20–31 GiB VRAM | CUDA | 32,768 | 8,192 |
| Linux without usable NVIDIA drivers | CPU fallback | 16,384 | 4,096 |

Explicit `ALIM_MAX_CONTEXT_TOKENS` and `ALIM_RESERVED_OUTPUT_TOKENS` values override detection.

Check, estimate, download, or import an already available checkpoint:

```bash
uv run --project backend python models/download_qwen3_8_27b.py --check
uv run --project backend python models/download_qwen3_8_27b.py --dry-run
uv run --project backend python models/download_qwen3_8_27b.py
uv run --project backend python models/download_qwen3_8_27b.py --source-file /path/to/Qwen3.8-27B-Q4_K_M.gguf
```

The downloader checks first, skips a complete checkpoint, resumes partial snapshots, serializes
concurrent Linux/macOS operations, and validates the selected GGUF afterward. `--source-file`
performs an atomic local import and never loads the Hugging Face client.
Weights are stored only in `models/Qwen3.8-27B/` and ignored by Git.

## Environment setup

The platform-aware bootstrap uses one Conda environment for Python, Node, npm, `uv`, and
`llama-server`. It selects CUDA on a Linux host whose NVIDIA driver responds, Metal/Accelerate on
Apple Silicon, or a functional CPU fallback on Linux.

```bash
python3 backend/scripts/setup_environment.py
conda activate alim-study
```

If `conda activate` is not initialized in the shell, use the supplied Anaconda activation script:

```bash
source ~/anaconda3/bin/activate alim-study
```

Preview the commands or include the 17.67 GiB model download in the same setup run:

```bash
python3 backend/scripts/setup_environment.py --dry-run
python3 backend/scripts/setup_environment.py --with-model
python3 backend/scripts/setup_environment.py --model-source /path/to/Qwen3.8-27B-Q4_K_M.gguf
python3 backend/scripts/setup_environment.py --check
```

On Ubuntu/Debian, repair/install NVIDIA drivers before setup if CUDA is desired; rerunning setup
after a driver repair replaces the CPU llama.cpp build with its CUDA build. On an M4 Pro, Conda
selects the native `osx-arm64` Accelerate/Metal build. Rosetta is neither required nor recommended.

## Starting the complete app

After the checkpoint and runtime are installed:

```bash
python backend/scripts/start_app.py
```

Startup performs this sequence:

1. Validate `models/Qwen3.8-27B` without network access and download it if absent.
2. Detect Linux/CUDA, Linux/CPU, or Apple-Silicon/Metal settings.
3. Start or reuse local `llama-server` on `127.0.0.1:8000` with automatic memory fitting.
4. Wait until `/v1/models` confirms `Qwen/Qwen3.8-27B` is loaded in memory.
5. Complete FastAPI startup on `127.0.0.1:8001`.
6. Start the frontend on port 8080.

The first tutoring request therefore does not pay model-loading latency. A missing checkpoint is
downloaded automatically from the configured open-weight repository. Set
`ALIM_MODEL_AUTO_DOWNLOAD=false` only when a managed/offline installation must require
pre-provisioned weights. If acquisition, `llama-server`, or preload fails, startup fails with an
actionable message rather than silently selecting another model. Logs are written under `logs/`.

For independent development, start the services from the repository root:

```bash
ALIM_MODEL_AUTOSTART=false uv run --project backend uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8001
cd frontend && npm run dev
```

Disabling autostart is intended for tests or when an already-loaded compatible server is managed
externally. The production default is `ALIM_MODEL_AUTOSTART=true`.

## Context compilation and local-first reference retrieval

The frontend sends only the current question and scoped identifiers to FastAPI. The backend
selectively retrieves student memory, learning events, relevant conversation history, syllabus,
local learning material, artifacts, working state, and reference material. The web branch activates
for explicitly current/web-oriented questions and automatically when a study question has no
relevant local learning-material match.

Reference retrieval is enabled by default through an `auto` adapter that first searches UTF-8
Markdown, text, and HTML snapshots under `material/web/`. If there is no relevant local match, it
automatically fetches a current reference from Wikipedia. Results carry source provenance and
timestamps, are treated as untrusted reference text, and use only an ephemeral per-request cache
in production. The SQLite test adapter may cache them in its isolated fixture. `allow_web=false`
disables this branch per request and
`ALIM_WEB_ENABLED=false` disables it globally. Conversational search instructions such as “browse
online and explain … in one sentence” are removed before lookup so named topics—not presentation
wording—drive result relevance.

Set `ALIM_WEB_PROVIDER=local` for a strictly offline deployment or
`ALIM_WEB_PROVIDER=wikipedia` to bypass the local corpus. Automatic fallback sends only the
compacted topical query—not chat history, student memory, or local material—to MediaWiki.

All sources enter the same priority budget. Web context has a 6,000-token section ceiling by
default and can never push the compiled input beyond:

```text
input limit = detected/overridden total context - reserved output

M4 Pro default:       65,536 - 16,384 = 49,152 input tokens
RTX 3090 default:     32,768 -  8,192 = 24,576 input tokens
Linux CPU fallback:   16,384 -  4,096 = 12,288 input tokens
```

Low-priority web/history material is removed before P0 task state. The exact compiled total is
checked before the request is sent to Qwen.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `ALIM_MODEL_PATH` | `models/Qwen3.8-27B` | Q4 GGUF checkpoint directory |
| `ALIM_MODEL_AUTOSTART` | `true` | Preload and manage llama.cpp during backend lifespan |
| `ALIM_MODEL_AUTO_DOWNLOAD` | `true` | Fetch the model automatically if local validation fails |
| `ALIM_MODEL_SERVER_EXECUTABLE` | `llama-server` | Runtime executable selected by setup |
| `ALIM_MODEL_PORT` | `8000` | Local model-server port |
| `ALIM_LLM_BASE_URL` | `http://127.0.0.1:8000/v1` | OpenAI-compatible Qwen endpoint |
| `ALIM_LLM_MODEL` | `Qwen/Qwen3.8-27B` | Required served model name |
| `ALIM_CONTEXT_DB` | test-only path | SQLite fixture location when an isolated test adapter is explicitly injected |
| `ALIM_MAX_CONTEXT_TOKENS` | hardware-adaptive | Total model context budget |
| `ALIM_RESERVED_OUTPUT_TOKENS` | one quarter, up to 16,384 | Guaranteed output allowance |
| `ALIM_WEB_ENABLED` | `true` | Permit intent-gated reference retrieval |
| `ALIM_WEB_PROVIDER` | `auto` | Local-first with web fallback; `local` or `wikipedia` force one source |
| `ALIM_LOCAL_WEB_ROOT` | `material/web` | Local Markdown/text/HTML snapshot directory |
| `ALIM_WEB_TOKENS` | `6000` | Maximum web-context section size |
| `ALIM_WEB_MAX_RESULTS` | `4` | Maximum fetched results per query |

See `backend/.env.example` and [context documentation](docs/CONTEXT_MANAGER.md) for all tuning
values.

## Testing

```bash
PYTHONPATH=backend:. uv run --project backend pytest tests/backend -q
PYTHONPATH=backend:. uv run --project backend pytest tests/e2e -q
uv run --project backend ruff check backend tests models
uv run --project backend ruff format --check backend tests models

cd frontend
npm run typecheck
npm run build
```

The automated suite never contacts Lovable or Supabase. It validates both simulated operating-system
profiles, checkpoint presence, managed preload/readiness, exact Qwen routing, web provenance, the
final context ceiling, API behavior, linting, type checking, and the production frontend build.
The reproducible real-weight smoke procedure is documented in `tests/README.md`; unlike the fast
process fixture, it loads the 17.67 GiB checkpoint and is run deliberately on an inference host.

## Data ownership and privacy

- Supabase project `ucacmeadsufiedxrgqit` stores authentication, all durable private application
  state, private materials, transcripts, chunks, memories, and AI history under RLS.
- Browser storage is an account-scoped disposable cache only. Demo records remain local and are
  never uploaded into a signed-in account.
- FastAPI performs parsing, chunking, embeddings, retrieval, memory extraction, context compilation,
  and Qwen orchestration locally. SQLite remains only as a deterministic test adapter.
- `material/` contains operator-supplied learning sources.
- `models/` contains local open weights.
- The default reference provider searches locally first. Only when no relevant local match exists
  does it send the compacted topical query to MediaWiki; it never sends chat history or local files.
- The backend does not silently fall back to an external AI model.

## Further documentation

- [Context manager](docs/CONTEXT_MANAGER.md)
- [Qwen runtime and internet context](docs/QWEN_MODEL_RUNTIME_AND_WEB.md)
- [Local development](docs/LOCAL_DEV_WITH_PYTHON_BACKEND.md)
- [Linux and Apple Silicon setup](docs/CROSS_PLATFORM_SETUP.md)
- [API contracts](docs/API_EXPECTATIONS.md)
- [Frontend architecture](docs/FRONTEND_ARCHITECTURE.md)
- [State and storage](docs/STATE_AND_STORAGE.md)
- [Supabase cutover and OAuth runbook](docs/SUPABASE_MIGRATION.md)
