# Tests

The default suite is fully local and does not call Lovable or Supabase.

- `tests/backend/` covers budgets, retrieval, memory, APIs, downloads, platform detection, setup
  selection, and llama.cpp command construction.
- `tests/e2e/` starts a disposable OpenAI-compatible process and follows checkpoint validation →
  startup preload → local-first retrieval → context budgeting → chat response.
- `tests/results/` stores generated reports while caches remain ignored.

```bash
backend/.venv/bin/python -m pytest tests/backend tests/e2e tests/operations -q
```

```bash
backend/.venv/bin/python -m ruff check backend models tests
backend/.venv/bin/python -m ruff format --check backend models tests
PATH=/path/to/node22/bin:$PATH frontend/node_modules/.bin/tsc --noEmit -p frontend/tsconfig.json
PATH=/path/to/node22/bin:$PATH frontend/node_modules/.bin/vitest run --root frontend
```

The process-level E2E fixture proves orchestration without paying a 27B load cost on every run.

## Real-weight smoke test

Real-model certification requires enough memory; Linux transparently uses CPU if its NVIDIA driver
is not working, but generation will be much slower. From the repository root:

```bash
python3 backend/scripts/setup_environment.py --check
python3 models/download_qwen3_8_27b.py --check --json
ALIM_ENABLE_AI=1 ./scripts/dev/start_all.sh foreground
```

In another terminal, verify preload and deterministic generation:

```bash
curl --fail http://127.0.0.1:8001/health
curl --fail http://127.0.0.1:8001/ready
```

For a visible budget audit, start with `ALIM_CONTEXT_DEBUG=true` and call
`/api/context/compile` using `debug=true`, `max_context_tokens=4096`, and
`reserve_output_tokens=512`. Confirm `compiled_total_tokens <= token_budget.input_limit`. These
requests touch only local FastAPI/llama.cpp. Automated tests prove that `auto` does not open the
network when local evidence matches and that it invokes the remote adapter when local material is
missing. Neither reference path contacts Lovable. Private API smoke requires a
disposable Supabase user access token and a caller-owned thread; never paste the
token into shell history or test a real user's data. See
`docs/testing/README.md` for the complete matrix and release blockers.
