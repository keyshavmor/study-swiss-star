# Backend Integration TODO

This checklist reflects the repository after the Context Manager implementation.

## Completed audit and context core

- [x] Audited every tracked source/config/documentation path and the Supabase schema.
- [x] Confirmed the 15-card subject model, actual frontend slugs, SPF grouping, language map, and
  Swiss grade math.
- [x] Added the local Python project and idempotent SQLite schema.
- [x] Added normalized context/document/memory/artifact models.
- [x] Added configurable token counting, per-section budgets, global priority trimming, and a
  single compiler.
- [x] Added intent-gated dense and BM25 retrieval, reciprocal-rank fusion, deduplication, and
  replaceable heuristic reranking.
- [x] Added provenance-preserving text ingestion and optional PDF/DOCX parsing.
- [x] Added controlled student-memory writing, explicit learning events, rolling conversation
  compaction, relevant-old-message retrieval, expiring working memory, and artifacts.
- [x] Added structured debug data that is hidden from normal chat responses.
- [x] Added unit/integration tests for budgeting, priority, fusion, deduplication, compaction,
  memory filtering, artifacts, query analysis, and the four requested example flows.
- [x] Added Qwen3.8-27B Q4 GGUF validation/download/resume tooling for feasible local inference.
- [x] Added managed llama.cpp preload/readiness/shutdown with CUDA/Metal/CPU adaptation.
- [x] Added intent-gated, cached, provenance-labelled, budgeted web retrieval.
- [x] Reorganized frontend, materials, models, app data, logs, Supabase, and tests by ownership.

## Completed chat integration

- [x] Kept Supabase as the sole display-transcript writer.
- [x] Kept `DefaultChatTransport` and the current UI loading/error behavior.
- [x] Changed the authenticated TanStack chat route to forward only the current request and context
  identifiers to FastAPI by default.
- [x] Added server-only backend configuration and timeouts.
- [x] Removed cloud AI generation fallback; all answers use the local Qwen backend.
- [x] Added source metadata to assistant UI-message parts and render it with `SourceSnippetList`.
- [x] Passed academic year and numeric grade level from `AcademicYearProvider`.

## Remaining operations/UI work

- [ ] Replace the deterministic hashing embedder with the selected local embedding model.
- [ ] Add a backend health banner and health/model rows to Diagnostics and Settings.
- [ ] Add subject-specific component context to chat launched from the SPF workspace.
- [ ] Wire indexed materials and learning goals into subject pages.
- [ ] Add multipart document upload; retain the user review path for parsed assessments.
- [ ] Implement quiz, mock-exam, grading, and study-plan APIs and UIs.
- [ ] Persist feedback with an offline retry queue.
- [ ] Decide whether genuine FastAPI/model token streaming is worth the extra complexity.
- [ ] Add export/import or backup for localStorage and local SQLite data.

## Verification checklist

- [x] Python unit and integration suite passes without a model server.
- [x] Python files compile.
- [x] Frontend typecheck and production build pass after the directory move.
- [x] Process-level E2E verifies model preload, Qwen routing, web sources, and token budget.
- [ ] Manual local-model chat works in German, English, and French B1.
- [ ] Manual source rendering survives a page refresh from Supabase message parts.
- [x] Backend-off behavior returns an explicit service-unavailable response and never leaks to a cloud model.
- [ ] Light/dark and mobile layouts are checked for the source disclosure.

## Hard constraints

- Do not remove or weaken Supabase authentication.
- Keep Lovable project metadata and authentication integration; these are independent of AI generation.
- Do not edit generated route/Supabase files or published Git history.
- Do not change the 15-subject/SPF/Swiss-grade rules as part of backend work.
- Do not put model credentials in `VITE_*` variables.
- Keep retrieval, memory policy, and prompt compilation in Python.
