# Context, RAG and document processing

| Field | Value |
|---|---|
| Owner | Backend context/RAG |
| Status | `CURRENT — LOCAL BACKEND` for implemented modules; integration gaps explicit |
| Canonical path | `backend/docs/rag/README.md` |
| Verified | Prompt 03 caller-token bridge, 2026-09-18 |

The current backend implements bounded context compilation, recent messages,
summaries, student/episodic/working memory, artifacts, sparse/dense/hybrid
retrieval, deduplication, heuristic reranking, text/PDF/DOCX ingestion, private
Storage download, local reference material and bounded cached web lookup.

Ordinary persistence uses the verified caller token through RLS. Retrieved
content, filenames, MIME declarations, documents and model output are untrusted.
Parsers and payload sizes must remain bounded; temporary files must be removed;
retrieval provenance must survive into the response.

The synchronized frontend adapter now forwards its already verified bearer
token and cancellation signal, while FastAPI independently verifies identity.
Assistant parsing, multi-model embedding/runtime reconciliation, deletion hooks
and exact live schema agreement remain gaps.
