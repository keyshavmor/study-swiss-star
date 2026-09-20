# Model storage

Alim uses the Apache-2.0 `Qwen/Qwen3.8-27B` checkpoint through the upstream llama.cpp
`Qwen3.8-27B-Q4_K_M.gguf` conversion. Q4_K_M is approximately 17.67 GiB instead of roughly 54 GiB
for BF16, allowing the same model to run on an RTX 3090 or a 48 GB Apple Silicon Mac. The app is
currently text-only, so the separate vision projector is not downloaded.

The legacy downloader below stores weights at ignored `models/Qwen3.8-27B/`.
The current registry-backed runtime defaults to the OS data directory or
`ALIM_MODEL_CACHE_ROOT`, checks artifacts explicitly, and never downloads during
startup. Acquisition requires an affirmative `model_runtime.py download
--yes-download` command.

```bash
uv run --project backend python models/download_qwen3_8_27b.py --check
uv run --project backend python models/download_qwen3_8_27b.py --dry-run
uv run --project backend python models/download_qwen3_8_27b.py
uv run --project backend python models/download_qwen3_8_27b.py --source-file /path/to/Qwen3.8-27B-Q4_K_M.gguf
```

`--check` is offline. `--dry-run` confirms availability and reports remaining bytes without fetching
the weight file. A normal invocation checks first, resumes a partial Hugging Face snapshot, uses a
portable atomic lock to prevent concurrent downloads, records provenance in `.alim-model.json`, and
validates the non-empty GGUF before reporting success.

`--source-file` is the fully offline acquisition path for Linux and macOS. It accepts the GGUF file
or a directory containing the canonical filename, copies it atomically into the model directory,
records local-file provenance, and never imports or contacts `huggingface_hub`.

The artifact repository is `ggml-org/Qwen3.8-27B-GGUF`; `.src_sha` in that conversion repository
links it to the canonical `Qwen/Qwen3.8-27B` source checkpoint.
