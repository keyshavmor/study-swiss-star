# Backend Branch Reconciliation Report

Status: IMPLEMENTATION COMPLETE — PRODUCTION APPROVAL PENDING

Last verified: 2026-09-15 (Europe/Zurich)

## Source snapshots

| Source | Branch | Starting SHA | Role |
|---|---|---|---|
| `study-swiss-star-frontend` | `main` | `e4bf042a826d94b94175530f95ff7e11a5ccdc76` | Authoritative UX, UI, frontend, and browser Supabase behavior |
| `study-swiss-star-backend` | `kmor/migrate-supabase` | `91ddfe1f7aef1f9f8d2e4b3088abcc203865395d` | Authoritative FastAPI, context/RAG, persistence adapter, and local-model runtime |
| Git merge base | — | `2ad21e001ef66d1cc802b66573a95fd3efa33ec2` | Common baseline |
| Supabase | project `ucacmeadsufiedxrgqit` | live inspection on 2026-09-15 | Runtime schema, RLS, Storage, Edge Functions, and cron authority |

The backend clone's local `main` ref was stale at the merge base. The current `main` source is the clean, up-to-date frontend clone and its `origin/main` at `e4bf042a...`. Only the backend clone and branch are modified.

## Pre-edit inventory

The classifications below were recorded before synchronizing files. They group the 361-file `backend...main` comparison by concern while calling out all meaningful behavioral differences.

| Concern | Meaningful differences observed | Classification | Reconciliation action |
|---|---|---|---|
| `frontend/routes` | Current `main` makes `/` and `/auth` auth surfaces, adds password update and Assistant routes, updates all authenticated screens, and removes diagnostics. Backend branch retains older route behavior plus a modified subject-chat API route. | `TAKE_FROM_MAIN` / `RECONCILE` / `REMOVE_AS_STALE` | Take all visible routes and generated route tree from `main`; preserve only the server-only chat integration after adapting it to the current route contract. Remove diagnostics. |
| `frontend/components` | Current `main` adds current branding, language selector, Google Calendar, settings/storage surfaces, Assistant UI, and extensive current screen behavior; it removes `DemoMode`. Backend branch has backend-oriented changes only in `AuthForm` and `MaterialsPanel`. | `TAKE_FROM_MAIN` / `RECONCILE` / `REMOVE_AS_STALE` | Use current `main` components wholesale, then assess whether material ingestion can be wired without changing visible behavior. Do not retain stale auth/material UI. |
| `frontend/lib` | Current `main` adds i18n, Assistant persistence, Google Calendar, speech, telemetry, media retention, settings/account data, and keeps local application state in `asa.data.v2`. Backend branch adds a Supabase repository/cache, auth helpers, material functions, and the local-backend server adapter. | `TAKE_FROM_MAIN` / `PRESERVE_FROM_BACKEND_BRANCH` / `RECONCILE` | Use current `main` client-side state and helpers. Preserve/rework only secure server-only backend glue and relevant focused tests. Do not resurrect the Supabase app-data repository. |
| Supabase client/types | Current `main` has newer browser/server clients and materially expanded production-derived types; backend branch has a different large type snapshot plus custom auth helpers. | `TAKE_FROM_MAIN` / `NEEDS_LIVE_SUPABASE_VERIFICATION` | Generate types from live production, compare with current `main`, and use the verified output. Maintain publishable-key-only browser/server clients. |
| Supabase migrations | Backend branch contains live migrations through `20260914131340`; current `main` has only the three early Supabase migrations and partial Drizzle SQL for later work. Live history contains 15 migrations through `20260914212346`. | `PRESERVE_FROM_BACKEND_BRANCH` / `RECONCILE` / `NEEDS_LIVE_SUPABASE_VERIFICATION` | Retain exact known migration source; recover deployed source where available; add non-fabricated source artifacts for later applied migrations. Do not reapply or alter production. |
| Drizzle migrations/schema | Present only on current `main` and partially overlaps applied production migrations. | `TAKE_FROM_MAIN` / `DOCUMENT_ONLY` | Retain as current repository tooling, clearly document that Supabase migration history is the deployment authority and Drizzle is not complete production history. |
| `backend` | Backend branch adds mandatory JWT verification, request-scoped `SupabaseContextStore`, FastAPI endpoints, context/RAG/memory changes, and private document download behavior. Main does not contain these branch changes. | `PRESERVE_FROM_BACKEND_BRANCH` / `RECONCILE` | Preserve the entire backend implementation; audit DTOs and every Supabase adapter operation against live production; add Assistant support only where the current UI contract is defined. |
| tests | Backend branch adds backend auth/security/context and frontend cache/auth tests. Main adds/changes frontend behavior without the requested targeted coverage. | `PRESERVE_FROM_BACKEND_BRANCH` / `RECONCILE` | Preserve backend tests, remove tests tied to stale state ownership, add integration/auth/language/security tests around the reconciled boundary, and run all available gates. |
| scripts | Current `main` adds translation checking. Backend branch owns local model/setup/start scripts unchanged from its authority. | `TAKE_FROM_MAIN` / `PRESERVE_FROM_BACKEND_BRANCH` | Take frontend translation tooling; preserve backend/local-machine scripts; validate syntax and documented usage. |
| environment/config | Current `main` includes current package/Drizzle configuration and tracked `.env` files; backend branch adds backend and frontend examples and removes tracked frontend secrets. | `RECONCILE` / `REMOVE_AS_STALE` | Preserve clean examples and backend runtime variables, take current build config, ensure no secrets are introduced, and publish one variable matrix. |
| docs | Current `main` introduces the authoritative documentation hierarchy but describes the backend as expected/unknown. Backend branch has older flat docs that describe implemented backend details and stale frontend. | `TAKE_FROM_MAIN` / `PRESERVE_FROM_BACKEND_BRANCH` / `RECONCILE` / `REMOVE_AS_STALE` | Use main's hierarchy, replace hypothetical backend claims with verified code, archive or remove stale flat truths, and update handoff/contracts/issues. |
| `lovabledocs` | Mirrors each branch's respective docs with the same stale/current split. | `RECONCILE` | Mirror all retained current documentation byte-for-byte with `docs`. |
| Mermaid diagrams | Current `main` has the current UI/product diagram suite; backend branch has older diagrams with useful backend deltas. | `TAKE_FROM_MAIN` / `RECONCILE` | Use main's topology and rewrite technical annotations for the real backend/live Supabase path. Validate all diagrams if tooling is available. |
| generated files | `routeTree.gen.ts`, lockfiles, help-guide PDFs, and Supabase TypeScript types differ. | `TAKE_FROM_MAIN` / `NEEDS_LIVE_SUPABASE_VERIFICATION` | Take current route tree, lockfiles, and guides; regenerate routes/types when tooling allows and prove generated artifacts are current. |

## Backend-only source to preserve

- `backend/app/auth.py`
- `backend/app/main.py`
- `backend/app/context/store_base.py`
- `backend/app/context/store_supabase.py`
- the backend branch's context, retrieval, memory, artifact, web, document, model, and runtime changes
- `backend/.env.example` and backend deployment/runtime instructions, reconciled rather than replaced
- backend/security/context/model tests and `supabase/tests/rls_isolation.sql`
- exact checked-in Supabase migration sources from `20260914122222` through `20260914131340`
- `frontend/src/lib/context-backend.server.ts` concept, rewritten against the current-main API route and JWT contract

## Current-main source to take

- the complete `frontend/` product surface, except for the documented server-only integration delta
- current root/package/Drizzle build configuration where compatible
- the current `docs/` and `lovabledocs/` hierarchy as the structural and frontend-product baseline
- translation tooling and all seven locale modules/help guides
- current auth, Assistant, Planner/Google Calendar, feedback/telemetry, settings/profile, storage-management, and local-state behavior

## Live verification baseline

Read-only inspection confirmed the project is healthy on Postgres 17.6.1.166; all 15 migrations listed in the task are applied; and the six listed Edge Functions are active with the expected `verify_jwt` settings. Detailed schema, policy, Storage, scheduler, grants, and adapter results are recorded below as work proceeds.

## Implementation results

### Frontend/main reconciliation

- Restored `frontend/`, the current documentation hierarchy, root package/Drizzle files, lockfiles,
  route tree, help guides, auth, Assistant, i18n, Calendar, speech, settings, Storage, telemetry, and
  current visible flows from authoritative `origin/main` (`e4bf042a...`).
- Removed backend-branch-only stale UI/cache/repository/diagnostics/demo behavior rather than
  merging it into the current product.
- Intentional frontend deltas from current main are limited to backend integration, live-generated
  Supabase types, contract corrections discovered by typecheck, tests/validators, and comments that
  no longer describe implemented behavior as hypothetical.
- `docs/` and `lovabledocs/` contain identical 117-file trees. Superseded flat documents are under
  `archive/` and begin with `STATUS: HISTORICAL — NOT AUTHORITATIVE`.

### Secure chat boundary

- TanStack `/api/chat` verifies the bearer with `getClaims`, verifies thread ownership, calculates
  effective response language, and forwards the original access token plus matching
  `X-Student-Id` to FastAPI.
- FastAPI always requires a bearer token; the obsolete environment-controlled test bypass was
  removed. It independently verifies the token and rejects an `X-Student-Id` mismatch.
- The adapter propagates incoming cancellation and its configured deadline. Backend errors preserve
  status, stable code, retryability, and request ID without exposing credentials.
- FastAPI accepts exactly `en`, `de`, `gsw`, `ru`, `es`, `fr`, and `it`; the compiled system context
  names and enforces the selected response language.

### Live Supabase reconciliation

- Verified 15 applied migrations, 27/27 public tables with RLS and policies, six private buckets,
  six active Edge Functions, one active Vault-authenticated every-minute cleanup cron job, relevant
  constraints/FKs/indexes, Storage path policies, and Data API grants.
- Generated `frontend/src/integrations/supabase/types.ts` from the live project, then formatted it
  without changing its schema meaning.
- Retrieved all six deployed Edge Function v1 sources and recorded each live `verify_jwt` value.
- Audited the Python `SupabaseContextStore`: every private read/write carries the verified user,
  cross-user requests fail before REST, composite ownership matches live FKs, and embeddings are
  serialized as JSON arrays for the live JSONB column.
- Corrected the current-main retention helper from invalid `descriptor_ready` to the live
  `ready` status and made the non-empty descriptor path mandatory before enqueue.
- Security advisor: one accepted warning for authenticated execution of the intentionally
  `SECURITY DEFINER` storage-usage RPC. Its empty search path, authenticated-only ACL,
  `auth.uid()` guard, and aggregate-only result were inspected.
- Performance advisor: four missing covering FK indexes and 25 unused-index information notices.
  The missing indexes, least-privilege grant corrections, and owner-bound media-retention paths/FK
  are captured in the unapplied
  `20260915115245_reconcile_least_privilege_fk_and_retention.sql`. Unused indexes were not removed
  without representative production workload statistics.
- The checked-in `activity-log` and `feedback-submit` source rejects secret/content/PII-shaped
  property keys in addition to the browser sanitizer. The checked-in cleanup worker also refuses
  paths outside the queue row's user prefix. These source changes are not deployed.
- No production mutation occurred. Applying the grant/index migration was rejected as too broad
  without explicit approval, so no alternate or partial write was attempted.

### Deliberately deferred product work

- General Assistant generation/attachment parsing: no stable endpoint, history, or streaming
  contract is defined; the frontend correctly stores user messages and shows a pending notice.
- Assistant media descriptor production: no generation producer exists. The live cleanup worker is
  active and refuses deletion without a descriptor.
- Materials UI ingestion: secure FastAPI text/Storage ingestion exists, but the current-main local
  Materials UI has no approved upload/index interaction or list endpoint.
- Quiz, mock exam, grading, study-plan generation, reminders, and daily summaries remain visible
  product gaps rather than fabricated backend behavior.

## Verification commands and results

| Gate | Result |
|---|---|
| `bun install --frozen-lockfile` | PASS — 703 installs / 780 packages, no changes |
| `bun test` | PASS — 21 tests covering auth routes/providers, logout cleanup, Assistant/feedback boundaries, speech fallback, Google token lifecycle/read-only mapping, telemetry, backend adapter, and seven-language policy |
| `bun run typecheck` | PASS |
| `bun run lint` | PASS — 0 errors; 25 pre-existing Fast Refresh warnings |
| `bun x prettier --check "src/**/*.{ts,tsx}" "scripts/**/*.ts" package.json tsconfig.json` | PASS — all matched files use Prettier style; `.env.example` is excluded because Prettier cannot infer its parser |
| `bun run check:i18n` | PASS — 822 keys in each locale; Swiss German contains no `ß` |
| `bun run check:mermaid` | PASS — 56 `.mmd` files parsed |
| `bun run check:docs` | PASS — 117 files mirrored byte-for-byte; relative links resolve |
| `bun run build` | PASS — Vite client + Nitro server production build; TanStack route generation completed without changing the synchronized route tree |
| `python -m pytest -c backend/pyproject.toml tests/backend -q` | PASS — 45 tests |
| `python -m pytest -c backend/pyproject.toml tests/e2e -q` | PASS — 1 process-level Qwen/RAG test using a fake loopback model server |
| `python -m ruff check backend tests/backend tests/e2e` | PASS |
| `python -m ruff format --check backend tests/backend tests/e2e` | PASS — 49 files |
| Edge Function syntax build (`bun build`, external imports) | PASS — all six functions |
| Supabase security/performance advisors + read-only catalog checks | PASS WITH RECORDED FINDINGS |
| `supabase test db` for `supabase/tests/rls_isolation.sql` | NOT RUN — Supabase CLI/local stack absent; test was expanded for Assistant/retention ownership and must run on a disposable branch after the pending schema migration |
| Authenticated two-user live CRUD/Storage test | NOT RUN — no disposable production identities; local/static isolation and live catalog were verified |

The copied repository virtual environment contained an editable path to the other clone. Verification
therefore used clean temporary locked environments at `/tmp/alim-backend-venv` and
`/tmp/alim-bun`; neither path is part of the repository.

## Readiness

**NOT READY FOR PRODUCTION DEPLOYMENT.** The local branch is ready for review, but production
approval is required for both:

1. staging and applying the grant/index migration, whose broad grant revocations can affect live
   Data API clients; and
2. deploying the three hardened Edge Function versions (`activity-log`, `feedback-submit`, and
   `media-retention-cleanup`) and re-fetching them to prove source/live
   parity.

After approval, run disposable-user cross-account RLS/Storage tests in a non-production branch,
deploy/apply, re-run both advisor classes, re-fetch function sources, and record the resulting live
migration/function versions. Until then, the live project remains unchanged and the repository
truthfully marks these two artifacts as pending.
