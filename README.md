# Alim — local-first Swiss Gymnasium study application

Alim combines a React/TanStack frontend, hosted or locally configured Supabase
data services, a loopback FastAPI backend, and local AI model runtimes. The
frontend synchronized from `main` defines the UX, UI and integration contracts;
the backend is being adapted to fulfil them without a cloud-AI fallback.

## Current status

- `CURRENT — FRONTEND`: the target active frontend matches authority commit
  `f0910e6971f12efe0ad547b904f6e2a518b13856`, with documented environment and
  documentation-tool exceptions.
- `CURRENT — LOCAL BACKEND`: authenticated context/RAG/document/chat services,
  caller-token Supabase persistence, one verified Qwen 3.8 27B GGUF lifecycle,
  loopback process management, isolated bootstrap, per-layer lifecycle and a
  readiness/rollback-aware central launcher.
- `BACKEND GAP`: full ten-model lifecycle, capability/admission/leases/health,
  safety, moderated peer send, Assistant generation/parsing and assessment jobs.
- `CURRENT — SUPABASE`: Auth, Postgres/RLS, private Storage, RPC and Edge
  Function contracts verified read-only in project `ucacmeadsufiedxrgqit` on
  2026-09-18. Repository/live migration history still needs forward
  reconciliation.

The current backend requires a bearer token on private endpoints. The
synchronized subject-chat adapter does not yet forward it; this is an explicit
Prompt 03 integration blocker, not permission to weaken backend verification.

## Local URL boundary

| Layer | Default |
|---|---|
| User-facing frontend | `http://127.0.0.1:8080` |
| FastAPI | `http://127.0.0.1:8001` |
| OpenAI-compatible local model runtime | `http://127.0.0.1:8000/v1` |
| Supabase | hosted project URL or documented local CLI endpoints; never the application URL |

Lovable remains editor/repository/build integration only. It is not the runtime
host, OAuth callback default, CORS target, health link or user-facing launch
URL.

## Repository ownership

```text
frontend/       authoritative synchronized application and frontend doorway
backend/        FastAPI, context/RAG, local model and backend documentation
supabase/       append-only migrations, Edge Functions and CLI configuration
models/         model tooling and ignored local weight roots
material/       operator-supplied local learning/reference material
app-data/       ignored local runtime/context data
tests/          backend and process-level tests/evidence
docs/           canonical product and cross-system documentation
lovabledocs/    byte-identical generated mirror of docs/ for Lovable
codex/          external orchestration package in the workspace, not this repo
```

## Documentation

Start at [the canonical documentation map](docs/README.md).

- [UX and routes](docs/ux/README.md)
- [UI controls and responsibility](docs/ui/README.md)
- [Frontend architecture/state](docs/frontend/README.md)
- [Frontend ↔ Supabase](docs/supabase/README.md)
- [Cross-system contracts and diagrams](docs/cross-system/README.md)
- [Backend implementation](backend/docs/README.md)
- [Environment and launcher contract](docs/cross-system/EXECUTION_ENVIRONMENTS.md)
- [Local stack quickstart](docs/operations/LOCAL_STACK_QUICKSTART.md)
- [Current issue register](docs/DOCUMENTATION_DISCOVERED_ISSUES.md)

## Local operation

Prompt 08 separated frontend, Supabase CLI/local services, Python backend,
model runtime and E2E/quality ownership. The deprecated monolithic manifest is
archived. Start with `scripts/env/bootstrap_ubuntu.sh` or
`scripts/env/bootstrap_macos.sh`, then use `scripts/dev/start_all.sh`. The guide
above is the copy/paste contract; historical commands are reference evidence.

Required targets are Ubuntu 24.04/26.04 LTS x86_64 and Apple-silicon macOS,
including MacBook M4. Prompt 08 observed Ubuntu 26.04.1 CPU-only and ran
loopback lifecycle simulation.
CUDA, Ubuntu 24.04 and physical M4 application support remain
`UNVERIFIED — MANUAL` until platform smoke tests pass.

## Security invariants

- Browser code contains only publishable Supabase configuration.
- Private backend requests verify the caller JWT and derive identity from
  `claims.sub`; request IDs and `X-Student-Id` are untrusted context.
- Ordinary backend data access preserves grants/RLS using the caller token.
- Service/secret keys remain isolated to narrow independently authorized
  server workers.
- AI inference stays local; backend failure never creates a fabricated answer,
  readiness state, moderation result, grade or persistence success.
- Model weights, credentials, caches, logs and user data stay outside Git.

Published history is Lovable-connected: do not rebase, amend, squash or
force-push published commits. Push/deployment/live Supabase changes are separate
authorized actions.
