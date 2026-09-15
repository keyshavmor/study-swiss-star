> **DEPRECATED — ARCHIVED.** This document is historical and may contain
> statements that no longer match the implementation. Canonical replacement:
> `docs/backend-handoff/CODEX_IMPLEMENTATION_ORDER.md`.
> Do not use this file for backend implementation decisions.

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
- [ ] Add a backend health banner and health/model rows to Settings (there is no
      `/diagnostics` route — it was removed).
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

## Added by the assistant/settings/storage frontend work

- [ ] Implement an assistant inference endpoint and write replies into
      `assistant_messages` (`role = 'assistant'`).
- [ ] Parse `assistant_attachments` (PDF/DOCX/image/audio/video) and update
      `parse_status`; today every row stays `unparsed`.
- [ ] Read `user_preferences.preferences.selected_qwen_model` when loading the
      local model instead of a hard-coded default.
- [ ] Populate `documents` storage columns consistently so the settings storage
      list can show every study material with size and date.

## FUTURE BACKEND / CODEX — added by the i18n/audio/media-retention frontend work

- [ ] Implement the `ui_language`/`message_language` → `response_language` precedence rule once
      those fields are added to `/api/chat` (and the future assistant endpoint).
- [ ] Generate a text descriptor for every assistant-output image/audio/video and upload it to the
      private `assistant-descriptors` bucket before the original is eligible for deletion.
- [ ] Enqueue a `public.media_retention_queue` row at generation time for every such media item.
- [ ] Run the 30-minute cleanup sweep that deletes originals once `delete_after` has passed, and
      never touches ordinary user study uploads.
- [ ] Use the descriptor (not the original) for later AI retrieval once the original is deleted.
- [ ] None of the above is implemented today; the frontend only provides
      `frontend/src/lib/media-retention.ts` for enqueueing once a descriptor path already exists.
