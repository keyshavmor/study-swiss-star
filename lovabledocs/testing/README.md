# End-to-end test and hardening strategy

| Field | Value |
|---|---|
| Status | `CURRENT — PROMPT 09` |
| Authority | frontend `main` at `f0910e6`; target implementation and executable tests |
| Default mode | deterministic, offline, tiny fixtures, no production writes |
| Machine matrix | [`../../tests/contracts/feature-traceability.json`](../../tests/contracts/feature-traceability.json) |
| Last reviewed | 2026-09-20 |

Testing follows the trust boundaries, not just the repository folders:

1. frontend tests prove route gates, state transitions, adapter normalization,
   failure honesty and browser-only behavior;
2. FastAPI tests prove bearer identity, endpoint schemas, owner isolation,
   local model/context behavior, idempotency, cancellation and bounded errors;
3. Supabase adapter and repository tests prove explicit owner filters, caller-JWT
   use, RLS/storage/function invariants and absence of browser admin keys;
4. offline E2E tests join the route inventory, frozen endpoint fixture and tiny
   local-model process without contacting Lovable or production Supabase;
5. operations tests exercise owned lifecycle, rollback, stale PID, occupied
   port, path-with-spaces, loopback and signal handling.

The offline suite is necessary but not sufficient for release. A mock host
profile is not physical Ubuntu/CUDA or macOS/M4 evidence. A source-level
Supabase policy check is not a two-user hosted RLS smoke. See
[`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md) for exact blockers.

## Deterministic gates

From the repository root, with the layer-owned environments already prepared:

```bash
backend/.venv/bin/python -m pytest tests/backend tests/e2e tests/operations -q
PATH=/path/to/node22/bin:$PATH frontend/node_modules/.bin/vitest run --root frontend
PATH=/path/to/node22/bin:$PATH frontend/node_modules/.bin/tsc --noEmit -p frontend/tsconfig.json
backend/.venv/bin/python -m ruff check backend models tests
backend/.venv/bin/python -m ruff format --check backend models tests
```

Run `scripts/dev/quality.sh health` for documentation mirrors, links and Mermaid.
Network/socket process tests may need a normal host sandbox; a denied socket is
an environment block, not a product failure and not a pass.

## Evidence rules

- Use synthetic users, tiny GGUF-shaped fixtures and temporary directories.
- Redact tokens, email addresses, prompts, document bodies and local private paths.
- Record command, versions, exit status, duration, host profile and whether the
  result was static, simulated, in-process, process-level or physical.
- Never convert an unavailable feature into canned success just to pass a test.
- Every residual gap gets severity, owner, reproduction and a release effect.

See the [traceability matrix](TRACEABILITY_MATRIX.md),
[threat/failure model](THREAT_AND_FAILURE_MODEL.md),
[recovery runbook](RECOVERY_RUNBOOK.md) and [evidence index](EVIDENCE_INDEX.md).
