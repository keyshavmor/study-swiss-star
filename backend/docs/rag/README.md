# Context, RAG and document processing

| Field | Value |
|---|---|
| Owner | Backend context/RAG |
| Status | `CURRENT — LOCAL BACKEND` for implemented modules; integration gaps explicit |
| Canonical path | `backend/docs/rag/README.md` |
| Verified | Prompt 05 chat/RAG contract tests, 2026-09-19 |

The current backend implements bounded context compilation, recent messages,
summaries, student/episodic/working memory, artifacts, sparse/dense/hybrid
retrieval, deduplication, heuristic reranking, text/PDF/DOCX ingestion, private
Storage download, local reference material and bounded cached web lookup.

Subject chat verifies thread ownership again through caller-token RLS, requires
an explicit safety allow verdict, probes the selected local runtime, and uses
the user-message ID as an idempotency key. The assistant ID is deterministic;
the exact answer and citation metadata are upserted before the response. A
retry replays the persisted bytes without a second model call, while reuse of
the key for different inputs returns `idempotency_conflict`.

Ordinary persistence uses the verified caller token through RLS. Retrieved
content, filenames, MIME declarations, documents and model output are untrusted.
Material downloads are capped at 50 MiB even when `Content-Length` is absent.
Paths reject traversal and require the verified user as their first segment.
The parser accepts UTF-8 text/Markdown, signature-checked PDF, and bounded valid
DOCX only; it rejects symlinks, binary text, mismatched extensions, archive
bombs, excessive PDF pages, and excessive extracted text. Temporary files are
removed in `finally`. Exact re-ingestion uses stable chunk IDs.

All retrieved course, syllabus and web text is rendered inside labelled
`UNTRUSTED DATA` sections. The system instruction explicitly forbids following
commands found in those sections. Citations are generated only from selected
retrieval items and preserve document/page/section/chapter/URL provenance.

The synchronized frontend adapter now forwards its already verified bearer
token and cancellation signal, while FastAPI independently verifies identity.
General Assistant generation and attachment parsing remain deliberately
deferred: the authoritative UI does not settle `/api/chat` mode versus a
separate endpoint. Its existing `assistant_*` persistence and `unparsed`
attachment state remain truthful. Prompt 07 must supply the concrete safety
moderator wired into FastAPI; until then both frontend and backend fail closed.
