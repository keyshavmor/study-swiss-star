# Cross-platform setup and switching

Alim supports two local targets with one repository and one `alim-study` Conda environment name:

| Target | Native architecture | Model backend | Default context |
| --- | --- | --- | ---: |
| Ubuntu/Debian Linux | `x86_64` or `aarch64` | llama.cpp CUDA when `nvidia-smi` works; CPU otherwise | 32,768 on a 24 GB GPU; 16,384 on CPU |
| MacBook Pro M4 Pro, 48 GB | `arm64` | llama.cpp Metal/Accelerate | 65,536 |

The model, FastAPI API, frontend request code, and data layout are identical. Only the native
llama.cpp package build and safe context defaults change.

## First setup on either machine

Install Conda/Miniforge or Anaconda, clone the repository, and run from its root:

```bash
python3 backend/scripts/setup_environment.py --with-model
conda activate alim-study
python backend/scripts/start_app.py
```

With an Anaconda installation that is not shell-initialized, replace the activation line with
`source ~/anaconda3/bin/activate alim-study`.

The setup script performs these checks before installing anything:

1. reads the OS and CPU architecture;
2. reads physical/unified memory;
3. on Linux, asks `nvidia-smi` for usable VRAM;
4. selects `llama.cpp=*=cuda*`, `llama.cpp=*=cpu*`, or
   `llama.cpp=*=cpu_accelerate*`;
5. installs the shared Python/Node environment and locked dependencies; and
6. optionally downloads the cross-platform Q4_K_M model.

Use `--dry-run` to inspect exact commands or `--check` to produce a JSON support report.

## Moving the repository between Linux and macOS

Do not copy `.venv`, `frontend/node_modules`, or an existing Conda environment between machines;
native binaries are platform-specific. Copy/clone source and reusable data, then rerun:

```bash
python3 backend/scripts/setup_environment.py
```

The GGUF model file itself is portable and may be copied to
`models/Qwen3.8-27B/Qwen3.8-27B-Q4_K_M.gguf` to avoid another 17.67 GiB download. The local SQLite
database under `app-data/context/` is also portable when the app is stopped before copying it.

## Linux notes

- Run `nvidia-smi` before setup. Success selects CUDA; failure intentionally selects CPU so the app
  remains functional.
- After repairing NVIDIA drivers, rerun the setup script. Conda replaces the CPU llama.cpp build
  with CUDA without changing model or application data.
- A 24 GB RTX 3090 defaults to a 32,768-token total window. llama.cpp automatically fits layer
  offload to available VRAM and can spill computation to system RAM rather than failing startup.

## Apple Silicon notes

- Run a native terminal where `uname -m` prints `arm64`; Rosetta shells are unsupported.
- Metal uses unified memory. Close memory-heavy applications before loading the 17.67 GiB model.
- The specified 48 GB M4 Pro defaults to 65,536 total tokens.
- NVIDIA/CUDA packages are neither installed nor imported on macOS.

## Overrides

Set these only after verifying memory usage:

```bash
export ALIM_MAX_CONTEXT_TOKENS=32768
export ALIM_RESERVED_OUTPUT_TOKENS=8192
export ALIM_MODEL_SERVER_EXECUTABLE=llama-server
```

Runtime and context compilation read the same total-context value, so an override cannot make the
prompt compiler submit more tokens than the server was configured to accept.
