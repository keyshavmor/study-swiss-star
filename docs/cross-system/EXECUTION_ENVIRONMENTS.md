# Execution environments and launcher contract

| Field | Value |
|---|---|
| Owner | Operations with each layer owner |
| Status | Current boundaries and model lifecycle; Prompt 08 central launcher remains future |
| Canonical path | `docs/cross-system/EXECUTION_ENVIRONMENTS.md` |
| Verified | Ubuntu 26.04.1 x86_64 documentation run, 2026-09-18 |
| MacBook M4 | `UNVERIFIED — MANUAL` until Prompt 08/09 physical-host smoke |

## One owner per dependency and process

| Layer | Manifest/tools | Process and port/URL | Secrets/config | Data/output ownership |
|---|---|---|---|---|
| UX/UI docs | Markdown; Mermaid; `frontend/scripts/validate-docs.ts` and `validate-mermaid.ts` | no product daemon | none | `docs/` canonical; `lovabledocs/` generated mirror |
| Frontend | `frontend/package.json`, `frontend/bun.lock`; Bun/Node/Vite | TanStack/Vite on `127.0.0.1:8080`; user opens `http://127.0.0.1:8080` | publishable Supabase values; server-only caller session; never a service secret in `VITE_*` | `frontend/node_modules` and `.output` ignored; browser session/local state |
| Supabase | `supabase/config.toml`, migrations/functions; Supabase CLI + its container runtime | hosted `https://ucacmeadsufiedxrgqit.supabase.co` or documented CLI endpoints; never the app URL | CLI access token/project credentials outside Git; function secrets in platform environment | hosted/local Postgres/Auth/Storage; migration history in Git |
| Python backend | `alim-backend`; Python 3.11 via `backend/environment.yml` and `.python-version`; `backend/pyproject.toml`, exact `backend/uv.lock`; project `.venv` via `uv` | FastAPI on `127.0.0.1:8001` | server-only publishable key + caller JWT; exact Host/CORS config | backend logs/state outside Git; tests under owned result path |
| Model runtime | `alim-model-runtime`; one pinned platform manifest under `backend/model-runtime/`; registry + lifecycle script | OpenAI-compatible runtime on `127.0.0.1:8000` | no remote AI key; tuning overrides only | weights/cache/provenance/PID state under OS data root or `ALIM_MODEL_CACHE_ROOT`; never Git |
| E2E | backend/frontend test manifests and optional browser runner | fake services use isolated ephemeral ports | fixture-only credentials | `tests/results`, temporary directories and logs; no user data |

The root `environment.yml` is `DEPRECATED`; it combines Node, Python and build
tools and is no longer consumed by `setup_environment.py`. That bootstrap now
selects `backend/environment.yml`, one model-runtime manifest and the frontend
package manager independently. Prompt 08 must reconcile these with the final
all-layer orchestrator without returning to one global environment.

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

## Launcher contract (`FUTURE CODEX IMPLEMENTATION`, Prompt 08)

Prompt 04 supplies a foreground model-runtime controller with check, command,
start, stop, status, explicit import and authorized download. The repository
does not yet claim the requested all-layer launcher exists. Prompt 08 must
provide idempotent, non-root, caller-directory-independent bootstrap plus
per-layer `start`, `stop`, `status` and `health`, and one fail-fast orchestrator.
The orchestrator starts dependencies in order, reports URLs/PIDs/logs/readiness,
handles partial failure, and stops only processes it owns. It must support a
non-AI frontend path without downloading model weights.

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
HTTP Host values and the TanStack loopback backend URL. It does not replace the
Prompt 08 lifecycle/bootstrap deliverable or constitute remote/LAN support.
