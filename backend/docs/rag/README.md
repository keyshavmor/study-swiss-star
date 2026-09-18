# Context, RAG and document processing

| Field | Value |
|---|---|
| Owner | Backend context/RAG |
| Status | `CURRENT — LOCAL BACKEND` for implemented modules; integration gaps explicit |
| Canonical path | `backend/docs/rag/README.md` |
| Verified | target baseline `bff4ec7`, 2026-09-18 |

The current backend implements bounded context compilation, recent messages,
summaries, student/episodic/working memory, artifacts, sparse/dense/hybrid
retrieval, deduplication, heuristic reranking, text/PDF/DOCX ingestion, private
Storage download, local reference material and bounded cached web lookup.

Ordinary persistence uses the verified caller token through RLS. Retrieved
content, filenames, MIME declarations, documents and model output are untrusted.
Parsers and payload sizes must remain bounded; temporary files must be removed;
retrieval provenance must survive into the response.

The current subject-chat backend is valuable, but the synchronized frontend
adapter does not yet forward its already verified bearer token. Prompt 03 owns
that repair; backend verification must not be weakened. Assistant parsing,
multi-model embedding/runtime reconciliation, deletion hooks and exact live
schema agreement remain gaps.
