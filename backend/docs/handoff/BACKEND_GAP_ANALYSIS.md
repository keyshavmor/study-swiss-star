# 08 — Backend gap analysis

| Field | Value |
|---|---|
| Owner | Backend implementation lead |
| Status | `CURRENT — LOCAL BACKEND` inventory plus `BACKEND GAP` backlog |
| Canonical path | `backend/docs/handoff/BACKEND_GAP_ANALYSIS.md` |
| Verified | frontend `f0910e6`, target baseline `bff4ec7`, 2026-09-18 |

## Preserve: valuable current backend

- JWT verifier and rejection of spoofed `X-Student-Id`.
- RLS-preserving `SupabaseContextStore` and owner-prefixed private Storage
  download.
- Context budgeting/compiler with priority trimming and provenance overhead.
- Sparse, dense, hybrid retrieval, deduplication and heuristic reranking.
- Student/conversation/episodic memory, summaries, artifacts and working memory.
- Local-first reference provider with compact Wikipedia fallback and cache.
- Document text/PDF/DOCX parsing and chunking.
- OpenAI-compatible local LLM/embedding adapters.
- Linux CUDA/CPU and Apple Silicon Metal detection, adaptive context budget.
- Resumable/locked/validated Qwen3.8-27B local import/download.
- Setup/start orchestration and backend/API/platform/model/E2E tests.

## Contract gaps

| Area | Current backend | Required state | Priority |
|---|---|---|---|
| Model catalogue | one hard-coded model/spec/path | versioned allowlisted registry for every enabled row | blocker |
| Model prepare operations | startup preload/status only | prepare/join/poll/state/retry/progress/recovery | blocker |
| Capability probe | coarse platform config | typed RAM/disk/GPU/VRAM/quality report | blocker |
| Admission/leases | absent | policy-aware queue, max users, heartbeat/TTL/release | blocker |
| Multi-model runtime | single process/model | safe switching/sharing/pooling/rebalance | blocker |
| System health | liveness and minimal readiness separated | privacy-filtered frontend system-health contract | high |
| Safety | absent | local moderation/strike/guardian workflow; fail closed | blocker for AI/message send |
| Peer send/scan | absent | atomic moderated send, private attachment scan | blocker |
| Assistant | no generation/attachment parsing | typed response/parsing contract | high |
| Assessment | no job/generation/attempt/grading lifecycle | all frontend API operations and TTL cleanup | high |
| Study tools/plans | context can support text only | structured schemas and persistence per UI | medium/high |
| Media retention | absent | descriptor creation + scheduled delete rules | high when media enabled |
| Privacy erasure | Supabase RPCs only | purge local caches/indexes/leases/artifacts | high |
| Quota | not uniformly applied to backend writes | preflight + atomic DB/Storage enforcement | high |
| Streaming | backend rejects `stream=true`; UI wraps one result | preserve current single-response contract unless authority changes | no gap now |
| Language | seven enum codes accepted; subject heuristic upstream | transmit effective message/reply language contract | high |
| Operational jobs | no persistent job store/sweepers | restart-safe operations and single-owner workers | high |

## Obsolete/stale backend-branch product material

The target's frontend, UX docs, diagrams and Supabase-facing assumptions predate
hundreds of `main` commits. They must not be manually merged as equal authority.
Phase 01 replaces manifest-classified frontend paths from `main`; shared/root
files and migrations receive semantic reconciliation. Target backend docs that
accurately explain implementation are preserved as source material, then moved
under backend ownership.

## Documentation gaps discovered

- Earlier `main` docs cited a superseded frontend commit; canonical metadata now
  points to current authority `f0910e6…` and compatibility corpora are labelled.
- Some docs still say backend implementation/live schema was unavailable.
- `DOCUMENTATION_DISCOVERED_ISSUES.md` contains resolved and superseded facts as
  chronological appendices rather than one final state.
- Old wireframes name speculative endpoints such as study-plan/material routes
  not present in code.
- `docs` and `lovabledocs` are duplicates with manual drift risk.
- Prompt 03 resolved the chat bearer mismatch with exact-token forwarding,
  independent FastAPI verification and focused contract tests.

## Release blockers vs decisions

Release blockers: all selectable-model mappings or catalogue disablement
decision, readiness/capability endpoints, safety for AI
and peer messaging, assessment backend for enabled actions, RLS/security tests,
and truthful local start documentation.

Product decisions required only where inspection cannot answer: canonical
production persistence for browser-local academic/planner data; exact Assistant
transport; whether server TTS/media generation is actually in scope; runtime
pool strategy for multiple simultaneous models; and artifact source/
quantization for nine catalogue entries.
