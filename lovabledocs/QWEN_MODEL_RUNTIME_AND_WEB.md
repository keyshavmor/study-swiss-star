# Qwen3.8-27B runtime and web context

## Model identity

Alim uses the Apache-2.0 `Qwen/Qwen3.8-27B` post-trained checkpoint. For realistic local deployment,
the downloader selects llama.cpp's `Q4_K_M` GGUF conversion (17.67 GiB) rather than the approximately
54 GB BF16 files. The same artifact runs through CUDA on Ubuntu/Debian, Metal on Apple Silicon, or a
Linux CPU fallback. The current application is text-only and does not download the vision projector.

The model supports 262,144 native tokens. Alim defaults to 65,536 total tokens on the specified
48 GB M4 Pro, 32,768 on a 20–31 GiB NVIDIA GPU such as the RTX 3090, or 16,384 for Linux CPU
fallback. One quarter is reserved for output; environment values may override both limits.

## Download lifecycle

`models/download_qwen3_8_27b.py` always inspects the target first. Completeness requires a non-empty
`Qwen3.8-27B-Q4_K_M.gguf` and valid provenance marker when one is present. It uses
`huggingface_hub.snapshot_download(local_dir=...)`, so partial downloads resume. An atomic directory
lock works on both target operating systems and prevents duplicate concurrent downloads.

Weights are stored at `models/Qwen3.8-27B/` and excluded from Git. `--check` is completely offline;
`--dry-run` contacts Hugging Face but writes no weights.

For a fully offline installation, provide a previously acquired GGUF:

```bash
uv run --project backend python models/download_qwen3_8_27b.py \
  --source-file /path/to/Qwen3.8-27B-Q4_K_M.gguf
```

The import is atomic, validates the GGUF header, records local-file provenance, and never imports
or contacts the Hugging Face client. The platform-aware setup script exposes the same path through
`--model-source`.

## Preload lifecycle

`backend/scripts/start_app.py` first validates the checkpoint and automatically invokes the
resumable Hugging Face downloader when it is missing. This behavior is enabled by
`ALIM_MODEL_AUTO_DOWNLOAD=true`; set it to `false` when an offline or managed deployment should
fail until weights are provisioned with `--source-file`.

The FastAPI lifespan creates `ModelRuntimeManager` when `ALIM_MODEL_AUTOSTART=true` (the default).
The manager:

1. validates the local checkpoint;
2. reuses an already-running endpoint only if `/v1/models` lists `Qwen/Qwen3.8-27B`;
3. otherwise launches `llama-server` against the absolute GGUF path with offline Hub flags;
4. waits for readiness before FastAPI accepts traffic; and
5. terminates only the model process it owns during shutdown.

The llama.cpp `--ctx-size` value comes from the same platform profile or
`ALIM_MAX_CONTEXT_TOKENS` override as compilation, so the two limits agree. `--parallel 1` avoids
duplicating the KV cache and llama.cpp's automatic fitter selects GPU offload without exceeding
available device memory. Startup failures point to `logs/qwen3.8-27b-llama-server.log`.

## Local-first reference retrieval

The query analyzer requests web context for explicit recency/browsing language such as “latest”,
“current”, “today”, “browse”, or “look up”. The context manager also activates the branch for a
normal study question when local document/syllabus retrieval produces no relevant evidence. Both
global `ALIM_WEB_ENABLED` and per-request `allow_web` must permit the retrieval branch.

The zero-configuration `auto` provider first searches operator-supplied `.md`, `.txt`,
`.html`, and `.htm` snapshots under `material/web/`, skips symbolic links and files larger than 4
MiB, scans at most 512 entries per request, strips script/style content from HTML, and ranks matches
deterministically. It records a title,
`local://` path, provider, and source-file timestamp. Cached results are ephemeral and local to the
current backend process. Before lookup, the adapter removes request
phrasing such as “browse”, “explain”, and “in one sentence”; the remaining topical terms drive
relevance.

When local search has no relevant match, `auto` fetches an English Wikipedia reference over HTTPS.
Only the compacted topical query leaves the machine. Set `ALIM_WEB_PROVIDER=local` to prohibit the
fallback or `wikipedia` to skip local search. An unknown provider fails closed.

External text is labelled untrusted in the system prompt. It receives P2 priority and a 6,000-token
section allowance. The global budgeter may remove it before critical task state, and the LLM client
uses the reserved-output value as `max_tokens`.

## Verification

`tests/backend/test_model_management.py` validates missing/complete/resumed checkpoint behavior.
`tests/e2e/test_qwen_startup_and_web.py` starts a disposable OpenAI-compatible process, verifies
managed readiness, executes a local-corpus-enabled chat without external I/O, checks Qwen model
routing and `local://` source provenance, and asserts that the compiled prompt remains below the
input limit. Unit tests separately prove both automatic branches: no remote call when local evidence
exists, and a remote call when it does not.

For real-weight certification, follow `tests/README.md`: it checks the environment and artifact,
starts the managed runtime, verifies health/preload metadata, submits a deterministic local chat,
and compiles a web-enabled request under an intentionally small token ceiling.
