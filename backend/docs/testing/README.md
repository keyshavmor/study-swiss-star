# Backend verification and hardening

The backend test boundary is Python 3.11 in `backend/.venv`; frontend Node,
Supabase CLI/containers and model-runtime packages stay in their own layers.

```bash
backend/.venv/bin/python -m pytest tests/backend tests/e2e tests/operations -q
backend/.venv/bin/python -m ruff check backend models tests
backend/.venv/bin/python -m ruff format --check backend models tests
```

The suite covers the exact 27-endpoint inventory, central bearer auth, bounded
correlated errors, caller ownership, chat/RAG, assessment lifecycle, privacy,
artifact integrity, leases, recovery and owned launch operations. Socket-based
process tests need a normal host sandbox. Tiny fixtures and simulated CUDA/Metal
profiles are regression evidence, not physical-host or full-weight proof.

Cross-layer traceability, threats, recovery and severity-owned residual gaps are
canonical under [`../../../docs/testing/README.md`](../../../docs/testing/README.md).
