> **DEPRECATED — ARCHIVED.** This document is historical and may contain
> statements that no longer match the implementation. Canonical replacement:
> `docs/backend-handoff/CODEX_HANDOFF.md`.
> Do not use this file for backend implementation decisions.

# Python Backend Integration Plan

Current state and remaining work for the local Python backend. The UI, design system, routes,
subject model, Swiss grade logic, and Supabase authentication remain unchanged.

## Implemented

- Local FastAPI application in `backend/app/main.py`.
- Context models, intent analysis, explicit priority, whole-item token budgeting, and one compiler.
- Knowledge, student, episodic, conversation, working, and artifact memory separation.
- Local SQLite persistence with indexed lookup fields and cached document embeddings.
- Dense/sparse retrieval, reciprocal-rank fusion, deduplication, and replaceable reranking.
- Controlled memory writes and threshold-based rolling conversation summaries.
- Text/Markdown ingestion plus optional PDF/DOCX parsers.
- Local OpenAI-compatible model client with no cloud requirement.
- Authenticated TanStack `/api/chat` proxy to Python in default context mode.
- Source metadata transport and `SourceSnippetList` rendering.
- Local `Qwen/Qwen3.8-27B` is the only generation path; Lovable remains only for project tooling and authentication integration.
- Unit and integration coverage for the requested context scenarios.

The implementation and its limitations are documented in `CONTEXT_MANAGER.md`.

## Configuration

Server-side frontend variables:

| Variable | Default | Meaning |
| --- | --- | --- |
| `ALIM_CONTEXT_BACKEND_URL` | `http://127.0.0.1:8001` | FastAPI base URL |
| `ALIM_CONTEXT_BACKEND_TIMEOUT_MS` | `90000` | Chat proxy timeout |

Python variables are listed in `backend/.env.example`. They include model endpoint/name, SQLite
path, context/output budgets, retrieval counts/weights, summary thresholds, and memory thresholds.
They are deliberately not `VITE_*`, so model credentials never enter the browser bundle.

## Data ownership

- Supabase remains the authoritative display transcript and authentication provider.
- Python's SQLite message mirror exists only for context selection, compaction, and relevant-old-
  message retrieval. It does not replace or write the Supabase transcript.
- Python SQLite owns context-specific data: chunks, embeddings, learning memory, summaries,
  working memory, and artifacts.
- Grades, planner items, profile, school links, and local materials remain in `AppDataProvider` /
  `localStorage`.

## Remaining frontend/product work

1. Add a backend health banner and model status to `/settings` (there is no
   `/diagnostics` route — it was removed from the frontend).
2. Expose indexed materials and learning goals on subject pages.
3. Add multipart upload UI/API; the backend currently exposes text ingestion and a file-ingestor
   service rather than the prior proposed multipart endpoint.
4. Implement quiz, mock-exam, grading, and study-plan endpoints and their review UIs.
5. Add feedback persistence and retry queue.
6. Add true token-by-token FastAPI streaming if local-model latency makes the current completed-
   response-to-UI-stream bridge insufficient.
7. Replace `HashingEmbedder` with the selected local embedding model adapter.

## Files that remain protected

- `frontend/src/routeTree.gen.ts` (generated)
- generated Supabase integration files
- existing Supabase migrations unless a deliberate cloud-storage change is made
- `frontend/src/components/ui/*` and `frontend/src/components/ai-elements/*`
- `frontend/src/lib/grade-math.ts`, subject definitions, and design tokens

No Supabase migration was needed for the local context store. Its schema is created idempotently by
`SQLiteContextStore`; `context_schema_version` records the current local schema version.
