# Execution environments and launcher contract

| Field | Value |
|---|---|
| Owner | Operations with each layer owner |
| Status | Current isolated boundaries, per-layer lifecycle and central launcher |
| Canonical path | `docs/cross-system/EXECUTION_ENVIRONMENTS.md` |
| Verified | Ubuntu 26.04.1 x86_64 lifecycle simulation, 2026-09-20 |
| MacBook M4 | `UNVERIFIED — MANUAL` pending Prompt 09 physical-host smoke |

## One owner per dependency and process

| Layer | Manifest/tools | Process and port/URL | Secrets/config | Data/output ownership |
|---|---|---|---|---|
| UX/UI docs | Markdown; Mermaid; `frontend/scripts/validate-docs.ts` and `validate-mermaid.ts` | no product daemon | none | `docs/` canonical; `lovabledocs/` generated mirror |
| Frontend | `frontend/package.json`, `frontend/bun.lock`; Bun/Node/Vite | TanStack/Vite on `127.0.0.1:8080`; user opens `http://127.0.0.1:8080` | publishable Supabase values; server-only caller session; never a service secret in `VITE_*` | `frontend/node_modules` and `.output` ignored; browser session/local state |
| Supabase | `supabase/config.toml`, migrations/functions; Supabase CLI + its container runtime | hosted `https://ucacmeadsufiedxrgqit.supabase.co` or documented CLI endpoints; never the app URL | CLI access token/project credentials outside Git; function secrets in platform environment | hosted/local Postgres/Auth/Storage; migration history in Git |
| Python backend | `alim-backend`; Python 3.11 via `backend/environment.yml` and `.python-version`; `backend/pyproject.toml`, exact `backend/uv.lock`; project `.venv` via `uv` | FastAPI on `127.0.0.1:8001` | server-only publishable key + caller JWT; exact Host/CORS config | backend logs/state outside Git; tests under owned result path |
| Model runtime | `alim-model-runtime`; one pinned platform manifest under `backend/model-runtime/`; registry + lifecycle script | OpenAI-compatible runtime on `127.0.0.1:8000` | no remote AI key; tuning overrides only | weights/cache/provenance/PID state under OS data root or `ALIM_MODEL_CACHE_ROOT`; never Git |
| E2E | backend/frontend test manifests and optional browser runner | fake services use isolated ephemeral ports | fixture-only credentials | `tests/results`, temporary directories and logs; no user data |

The deprecated root `environment.yml` is preserved under
`backend/archive/2026-09-20/`. Bootstrap selects `backend/environment.yml`, one
model-runtime manifest and the frontend package manager independently. The
detailed SBOM-style ownership table is in `docs/operations/DEPENDENCY_OWNERSHIP.md`.

## Platform variants

- Ubuntu target matrix: 24.04 LTS and 26.04 LTS on x86_64, CPU or a compatible
  CUDA path. Canonical lists both as supported LTS releases; application support
  still requires this repository's smoke tests. This run observed Ubuntu
  26.04.1 and an AMD Ryzen 7 3700X, but the NVIDIA driver was unavailable;
  CUDA and Ubuntu 24.04 application support are `UNVERIFIED — MANUAL`.
- macOS target matrix: macOS Tahoe 26 on Apple silicon, explicitly a 2024
  MacBook Pro with M4, using a compatible Metal/Accelerate path and
  unified-memory-aware admission. Apple lists the 2024 MacBook Pro as Tahoe 26
  compatible; no physical M4 application smoke was available, so support is
  `UNVERIFIED — MANUAL`.
- API schemas, status meanings and UX must be identical across platform paths.
  Unknown measurements stay null, and fallback behavior remains explicit.

Platform lifecycle sources:

- [Ubuntu release cycle](https://ubuntu.com/about/release-cycle)
- [Ubuntu 26.04 LTS release notes](https://documentation.ubuntu.com/release-notes/26.04/)
- [Apple macOS Tahoe 26 compatibility](https://support.apple.com/en-au/122867)

Operating-system minimums are not model-runtime minimums. The one verified Qwen
artifact is 18,973,870,432 bytes with an estimated 23,717,338,040 resident-byte
envelope before context/runtime variance. Admission uses measured resources and
never extrapolates the nine unresolved entries.

## Launcher contract (`CURRENT — LOCAL BACKEND`, Prompt 08)

`scripts/env/bootstrap_{ubuntu,macos}.sh` provide non-root prerequisite checks
and locked project setup. `scripts/dev/{supabase,model,backend,frontend}.sh`
provide `start`, `stop`, `status` and `health`; `scripts/dev/stack.sh` and the
`*_all.sh` entry points orchestrate them. Ownership tokens, PID-command checks,
real HTTP readiness and ignored per-layer logs prevent unrelated-process
termination and hidden failure. Foreground signals and failed startup roll back
only layers newly started by that invocation.

Default order: optional local Supabase → model runtime when authorized →
FastAPI → frontend. Startup must never silently trigger a large model download;
show expected size/time and require opt-in. LAN exposure is out of default scope
and requires explicit TLS, firewall, host/origin and trust configuration.

## URL boundary

- Application: `http://127.0.0.1:8080` (localhost equivalent accepted where
  OAuth callback configuration requires it).
- FastAPI: `http://127.0.0.1:8001`.
- Model runtime: `http://127.0.0.1:8000/v1`.
- Supabase: hosted or CLI data-service URL; not user-facing app hosting.
- Lovable: editor/repository/build integration only, never runtime launch,
callback, CORS, health or user-guide destination.

Prompt 03 validates backend bind/port, explicit credentialed CORS origins,
HTTP Host values and the TanStack loopback backend URL. Prompt 08 materializes
the matching lifecycle without claiming remote/LAN support.
