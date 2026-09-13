# Tests

The default suite is fully local and does not call Lovable or Supabase.

- `tests/backend/` covers budgets, retrieval, memory, APIs, downloads, platform detection, setup
  selection, and llama.cpp command construction.
- `tests/e2e/` starts a disposable OpenAI-compatible process and follows checkpoint validation →
  startup preload → web retrieval → context budgeting → chat response.
- `tests/results/` stores generated reports while caches remain ignored.

```bash
PYTHONPATH=backend:. uv run --project backend pytest tests/backend tests/e2e -q
```

```bash
uv run --project backend ruff check backend models tests
uv run --project backend ruff format --check backend models tests
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run build
```

The process-level E2E fixture proves orchestration without paying a 27B load cost on every run.

## Real-weight smoke test

Real-model certification requires enough memory; Linux transparently uses CPU if its NVIDIA driver
is not working, but generation will be much slower. From the repository root:

```bash
python3 backend/scripts/setup_environment.py --check
python3 models/download_qwen3_8_27b.py --check --json
python backend/scripts/start_app.py
```

In another terminal, verify preload and deterministic generation:

```bash
curl --fail http://127.0.0.1:8001/health
curl --fail http://127.0.0.1:8001/api/model/status
curl --fail -H 'Content-Type: application/json' \
  -d '{"thread_id":"real-smoke","question":"Reply with exactly: ALIM_MODEL_OK","allow_web":false}' \
  http://127.0.0.1:8001/api/chat
```

For a visible budget audit, start with `ALIM_CONTEXT_DEBUG=true` and call
`/api/context/compile` using `debug=true`, `max_context_tokens=4096`, and
`reserve_output_tokens=512`. Confirm `compiled_total_tokens <= token_budget.input_limit`. These
requests touch only local FastAPI/llama.cpp; web testing contacts MediaWiki only when explicitly
enabled and still never contacts Lovable or Supabase.
