# Backend environments and launch contract

| Field | Value |
|---|---|
| Owner | Backend operations |
| Status | Current commands plus `FUTURE CODEX IMPLEMENTATION` launcher requirements |
| Canonical path | `backend/docs/operations/ENVIRONMENTS_AND_LAUNCH.md` |
| Host evidence | Ubuntu 26.04.1 x86_64 only; CUDA unavailable |
| MacBook M4 | `UNVERIFIED — MANUAL` |
| Last reviewed | 2026-09-18 |

Python application dependencies belong to a project-local environment governed
by `backend/pyproject.toml` and `backend/uv.lock`. Model runtime binaries and
weights are a separate layer. Frontend Node packages and Supabase CLI/container
packages must not be installed into the Python environment.

Current API development command remains documented in `backend/README.md` and
binds FastAPI to `127.0.0.1:8001`; the model endpoint defaults to
`127.0.0.1:8000/v1`. Server-only Supabase values come from `backend/.env.example`
with empty secret values. No real secret, weight, cache, log or user data is
committed.

Ubuntu CPU/CUDA and Apple-silicon Metal are required target paths, but this
documentation phase is not hardware certification. Prompt 08 must build the
isolated bootstrap/lifecycle scripts and user guides; Prompt 09 must run real or
explicitly manual platform smoke tests. Large model acquisition must show
size/time and require operator opt-in.

The centralized launcher contract is defined in
[`../../../docs/cross-system/EXECUTION_ENVIRONMENTS.md`](../../../docs/cross-system/EXECUTION_ENVIRONMENTS.md).
