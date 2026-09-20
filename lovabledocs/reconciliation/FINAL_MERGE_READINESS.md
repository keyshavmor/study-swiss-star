# Final merge-readiness audit

| Field | Value |
|---|---|
| Owner | Release owner with frontend, backend, Supabase, security and operations reviewers |
| Decision | **NO-GO — do not merge this branch directly** |
| Audited | 2026-09-20 |
| Source authority | `study-swiss-star-frontend/main` at `f0910e6971f12efe0ad547b904f6e2a518b13856` |
| Target audit input | `kmor/migrate-supabase` at `b9a9385b528cb4210f3da8d2fa287c4d90ce63ea` |
| Common ancestor | `2ad21e001ef66d1cc802b66573a95fd3efa33ec2` |
| Rollback reference | `codex-preflight-00-20260918T153128Z` → `b8357e5287e3391ecf04b4edb1e37655318e13ba` |

This is an audit, not a merge instruction. No merge, rebase, push, deployment,
model download or production Supabase mutation was performed. The locally cached
upstreams were used because no network fetch was authorized. Before integration,
the release owner must fetch and re-verify the remote heads.

## Decision

The target contains useful, tested local-backend work, but it is not safe to
merge directly into `main`. The histories have diverged by 431 source-only and
15 target-only commits. A read-only `git merge-tree --write-tree` simulation
found 234 conflicts: 207 add/add, 26 content and one modify/delete. By location,
there are 107 conflicts in `docs/`, 107 in its `lovabledocs/` mirror, 17 in
`frontend/`, one in `supabase/config.toml`, and two root conflicts
(`README.md` and `roadmap.md`). A generic “ours” or “theirs” resolution would
either discard current frontend authority or lose the local-backend contracts.

This direct-merge blocker is independent of the remaining product, platform and
data blockers below. Passing deterministic tests does not waive any blocker.

## Repository identity and immutability proof

- Source worktree: clean `main`; local `HEAD` and `origin/main` both resolve to
  `f0910e6971f12efe0ad547b904f6e2a518b13856`.
- Target worktree at audit start: clean `kmor/migrate-supabase` at
  `b9a9385b528cb4210f3da8d2fa287c4d90ce63ea`.
- Locally cached `origin/kmor/migrate-supabase` is
  `79b80faee6b3ce497d065ddd4f1471e140e7c259`; Prompt 08 and Prompt 09 are local
  commits and have not been pushed.
- Remote configured for both branches:
  `https://github.com/keyshavmor/study-swiss-star.git`.
- The source worktree remained unchanged. The merge simulation did not update a
  ref, index or working tree.

## Exhaustive source-to-target path accounting

`git diff --name-only <source> HEAD` contains 474 paths. The following mutually
exclusive rules classified every path; the audit reported `unclassified=0`.

| Rule and count | Owner | Disposition |
|---|---|---|
| `backend/`, `models/`, `scripts/`, `tests/`, `logs/`: 97 | Backend, model, operations and QA owners | Deliberate local-backend support. Port to the integration branch and retain tests. |
| `docs/`, `lovabledocs/`, `roadmap.md`: 311 | Documentation/release owner | Canonical documentation, mirror and archive work. Regenerate from reconciled code; do not hand-resolve the mirror. |
| `frontend/`: 39 | Frontend owner with backend/security reviewers | 13 environment/archive/tooling paths plus 26 local-backend/security contract paths. Rebase these semantically onto latest `main`; never replace current UI wholesale. |
| `supabase/`: 22 | Supabase/security owner | Forward migrations, functions, tests, config and evidence. Preserve applied history; review and deploy forward-only changes separately. |
| `.env`, `.gitignore`, `.lovable/`, root `README.md`: 5 | Security, editor and release owners | The tracked source `.env` is intentionally excluded; examples contain no secret. Keep editor metadata only where required and reconcile root guidance. |

The tool-managed root `src/` is byte-identical to the pinned source. The 13
frontend environment/archive/tooling paths are `.bun-version`, the deliberate
removal of tracked `.env`, `.env.example`, `.node-version`, `README.md`, dated
archive entries, frontend-local docs, `package.json` pins and documentation
validators. The 26 contract paths are:

```text
frontend/src/components/StudyChat.tsx
frontend/src/components/app/assessment/AssessmentModePanel.tsx
frontend/src/integrations/supabase/auth-middleware.ts
frontend/src/integrations/supabase/client.ts
frontend/src/integrations/supabase/key-safety.ts
frontend/src/integrations/supabase/types.ts
frontend/src/lib/assessment-backend.server.test.ts
frontend/src/lib/assessment-backend.server.ts
frontend/src/lib/assessment.functions.ts
frontend/src/lib/assessment/api.ts
frontend/src/lib/assessment/types.ts
frontend/src/lib/assistant-data.ts
frontend/src/lib/auth-no-captcha.test.ts
frontend/src/lib/compliance.ts
frontend/src/lib/context-backend.server.test.ts
frontend/src/lib/context-backend.server.ts
frontend/src/lib/local-backend-endpoints.test.ts
frontend/src/lib/local-backend-endpoints.ts
frontend/src/lib/media-retention.ts
frontend/src/lib/model-backend.server.ts
frontend/src/lib/privacy-backend.server.ts
frontend/src/lib/privacy.functions.ts
frontend/src/lib/storage-management.ts
frontend/src/lib/system-health.test.ts
frontend/src/lib/system-health.ts
frontend/src/routes/api/chat.ts
```

These paths implement server-only JWT forwarding, loopback backend routing,
assessment/context/privacy/model adapters, key-safety checks, storage/retention
contracts and associated tests. They are intentional proposals, not permission
to change the authoritative UX/UI.

## Target-only commit accounting

| Commit(s) | Classification and integration disposition |
|---|---|
| `91ddfe1`, `a4cec04`, `f8c3a5b`, `d607c0d`, `b8357e5` | Historical isolation/reconciliation evidence. Review for provenance; do not blindly replay stale frontend/docs. |
| `bff4ec7` | Pinned Prompt 01 frontend synchronization. Use its manifest as an audit baseline, not as a substitute for a fresh source checkout. |
| `f61aeaf` | Documentation ownership and mirror structure. Regenerate after code reconciliation. |
| `769232f`, `b5cd17f` | Prompt 03 backend contract foundation and timeout stabilization. Port together. |
| `48ec874` | Prompt 04 local model runtime. Port with model tests and registry; no weights. |
| `fc5a044` | Prompt 05 chat/RAG. Port with security and failure-mode tests. |
| `70fda39` | Prompt 06 assessment lifecycle. Port with frontend server adapters and tests. |
| `79b80fa` | Prompt 07 Supabase security boundaries. Review forward migration and live-state assumptions separately. |
| `43b4281` | Prompt 08 environments, lifecycle scripts and archives. Port with operations tests. |
| `b9a9385` | Prompt 09 E2E traceability and hardening. Port tests/evidence with the implementations they verify. |

## Conflict ownership

The 17 frontend conflicts are the source `.env`, `frontend/README.md`, and the
local adapter/security subset of the list above. `main` remains authoritative
for product behavior; security/backend additions must be reapplied and reviewed
file by file. The 214 documentation conflicts are resolved only after code and
contract reconciliation by regenerating `lovabledocs/` byte-for-byte from
`docs/`. `supabase/config.toml` requires Supabase-owner review. Root files require
release-owner reconciliation. No conflict may be batch-resolved by branch side.

## Security, artifact, license and migration checks

- A tracked-file scan found no private-key header, AWS access-key pattern,
  OpenAI-style secret pattern or Supabase secret-key pattern. No exact `.env`
  file is tracked in the target.
- No `.gguf`, `.safetensors`, `.pt`, `.pth` or `.onnx` model artifact is tracked.
  The largest tracked blob is the archived npm lockfile at 421,625 bytes.
- Runtime `node_modules`, `.output`, `.venv`, `.local`, build and distribution
  paths are ignored. `app-data/README.md` is an intentional tracked placeholder;
  no application database is tracked.
- Lovable URLs are limited to editor/preview interoperability, dependency-cache
  provenance in lockfiles, and negative security fixtures. Product launch,
  health and operator guidance use loopback URLs.
- No root `LICENSE`, `COPYING` or `NOTICE` file and no project license metadata
  were found. A release/legal owner must decide and record redistribution terms
  before external distribution.
- Git contains nine exact applied Supabase migrations plus one undeployed
  forward hardening migration. The hosted ledger has 32 applied identities, so
  23 original SQL bodies remain unavailable. Never synthesize or renumber them;
  a clean production-equivalent local reset is blocked until they are recovered.

## Environment and launcher audit

The dependency boundaries are separate and pinned: Node `22.23.2` and Bun
`1.4.2` for the frontend; Python `3.11`, uv `0.12.13`, `pyproject.toml` and
`uv.lock` for the backend; Supabase CLI `2.117.0` plus its container runtime;
platform-specific locked model manifests and out-of-Git weights/cache; and
separate test tooling. All tracked lifecycle scripts are executable and pass
`bash -n`.

The per-layer scripts and central `scripts/dev/stack.sh` are cwd-independent,
loopback-only, use owned PID/token/log state, validate readiness, stop only owned
processes, and roll back newly started layers after partial failure. The user URL
is `http://127.0.0.1:8080`; backend and model defaults are
`http://127.0.0.1:8001` and `http://127.0.0.1:8000/v1`. The model launcher does
not download weights without explicit authorization.

On the observed Ubuntu 26.04.1 x86_64 host, process-level lifecycle tests pass.
The normal shell lacks Node and Bun, so `bootstrap_ubuntu.sh --check` correctly
exits 69 and names both prerequisites; the isolated test environment provides
Node 22.23.2, Python 3.11.15, uv 0.12.13 and Ruff 0.16.7. The unconfigured
central status command fails closed on a missing valid hosted Supabase URL rather
than reporting readiness. Supabase CLI is absent, so a local container-stack
smoke did not run.

There is no physical Apple-silicon/MacBook M4 evidence. The macOS script rejects
this Linux host and its simulated Metal tests are not physical proof. There is
also no working NVIDIA driver/full-weight CUDA proof on Ubuntu. These are release
blockers for the stated two-platform support claim.

## Validation result

The final detailed command/results ledger is in the Prompt 10 run status. The
deterministic matrix covers all 27 FastAPI routes, backend/E2E/operations tests,
frontend unit/type/lint/build checks, route-to-feature traceability, RLS/static
Supabase contracts, lifecycle ownership/failure paths, secrets, docs links,
mirror equality and Mermaid parsing. Environmental exclusions are blockers, not
passes: physical M4/Metal, working CUDA/full model, clean local Supabase reset,
hosted two-user Auth/RLS/OAuth/Storage/Edge behavior, destructive deletion drills,
and browser visual/accessibility automation.

## Blocking items

| Severity | Blocker | Owner and required closure |
|---|---|---|
| Critical | Direct merge produces 234 conflicts and cannot preserve both authorities automatically. | Release owner: use the controlled integration sequence below and repeat this audit on the result. |
| Critical | Production safety moderation and privileged peer send/attachment scanning are unresolved. | Product/security/backend: implement, threat-model and test; do not expose the flow before closure. |
| High | Nine catalog model IDs have no verified artifact/runtime mapping. | Model owner: approve artifacts, licenses, hashes, resource envelopes and real inference results. |
| High | No physical MacBook M4/Metal smoke and no working Ubuntu CUDA/full-weight smoke. | Platform/release owners: execute the clean-host checklist on both physical paths. |
| High | Twenty-three applied Supabase migration bodies are missing; clean reset cannot reproduce production. | Supabase owner: recover immutable SQL from authoritative backups/history and validate a disposable reset. |
| High | Hosted two-user RLS/Auth/OAuth/Storage/Edge and deletion drills are unexecuted. | Supabase/security/privacy owners: run in a disposable authorized environment. |
| High | Several frontend AI experiences remain unsupported instead of fabricated. | Product/backend: close or explicitly defer Assistant generation/parse, Study Plan, Subject Tools and Knowledge Profile refresh. |

## Non-blocking findings for internal integration

- The timing-sensitive foreground lifecycle test missed its 12-second window
  once under concurrent load in Prompt 09, passed alone and passed in the final
  full rerun. Keep it visible as a low-severity flake.
- Pinned Bun is absent from this host's normal PATH. Node-based tests/build pass;
  clean-host validation must use the documented bootstrap before release.
- The absent project-level license does not prevent a private technical review,
  but blocks an externally distributable release until legal ownership decides.

## Safe integration sequence

1. Obtain separate authorization to fetch. Record fresh `origin/main` and target
   SHAs, then create a new integration branch/worktree from reviewed latest
   `origin/main`; never integrate inside the authoritative source worktree.
2. Port target-owned `backend/`, `models/`, backend/operations tests and lifecycle
   scripts in small reviewed commits. Run their unit/contract tests after each.
3. Reconcile Supabase forward-only migrations, functions, `config.toml`, generated
   types and tests with the Supabase owner. Do not rewrite applied identities.
4. Reapply the 26 frontend adapter/security paths semantically against current
   `main`. Preserve current UX/UI and review every diff with frontend, backend and
   security owners. Keep `.env` untracked and use reviewed examples.
5. Regenerate canonical documentation from the reconciled code, copy `docs/` to
   `lovabledocs/` mechanically, then update root indices and archive traceability.
6. Run the entire Prompt 09/10 deterministic matrix. Then run authorized hosted
   Supabase tests, full-model Ubuntu/CUDA and physical MacBook M4/Metal clean-host
   launcher tests. Resolve all critical/high blockers.
7. Repeat the merge simulation against fresh remote heads. Only a human-reviewed,
   clean, fully green result may proceed to PR/merge under separate authorization.

Blind cherry-picking all 15 commits is not approved: early reconciliation commits
contain stale overlapping frontend/docs. Commit and path allowlists, semantic
review and atomic validation are required.

## Reviewer checklist

- [ ] Fresh remote heads and common ancestor recorded; source worktree untouched.
- [ ] Every integration diff assigned to a named owner and reviewed semantically.
- [ ] Current `main` UX/UI retained; all 26 adapter/security paths reviewed.
- [ ] No secret/service-role value or `.env` tracked or bundled for the browser.
- [ ] Supabase applied history preserved; 23 SQL bodies recovered and reset proven.
- [ ] Forward migration reviewed and tested on a disposable complete baseline.
- [ ] All 27 API contracts, authorization, correlation and no-store behavior pass.
- [ ] All model artifacts have provenance, license, hash and real resource proof.
- [ ] Ubuntu CPU/CUDA and physical MacBook M4/Metal launcher/inference evidence pass.
- [ ] Hosted two-user isolation, OAuth, Storage/Edge and privacy drills pass.
- [ ] `docs/` validates and is byte-identical to regenerated `lovabledocs/`.
- [ ] Project redistribution license is decided before external release.
- [ ] Final merge simulation is conflict-free and an authorized human approves.

## Rollback and post-merge verification

Before integration, tag or record the reviewed pre-integration SHA without moving
the historical Prompt 00 rollback tag. Use a PR and ordinary revert commits; do
not force-push or rewrite history. Forward Supabase migrations need their own
reviewed compensating migration—never delete or edit an applied file. Preserve
user/model data roots outside Git and back up any disposable test database before
destructive drills.

After a separately authorized merge: verify the deployed commit, rerun the full
matrix on a clean Ubuntu host and physical M4, start via the central launcher,
confirm only loopback application URLs are shown, exercise sign-in/chat/material/
assessment/privacy journeys with two isolated users, inspect logs for secrets and
request correlation, validate migration ledger and RLS advisors, stop the stack
and prove only owned processes were terminated. If any critical gate fails,
revert the application merge and apply the reviewed database compensation plan.
