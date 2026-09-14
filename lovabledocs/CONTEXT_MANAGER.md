# Context Manager / Context Compiler

## Status

Implemented in `backend/app/context/` and connected to the authenticated TanStack `/api/chat`
route. It is the only context-selection and AI-generation path; backend outages return an explicit
503 instead of silently sending study data to a cloud model.

## Request path

```text
StudyChat
  -> authenticated TanStack /api/chat (Supabase transcript writer)
  -> local FastAPI /api/chat (verified Supabase bearer identity)
  -> ContextManager.build_context
       -> heuristic intent analysis
       -> selected memory/retrieval branches only
       -> dense + BM25 retrieval
       -> reciprocal-rank fusion, deduplication, heuristic reranking
       -> optional intent-gated local-first reference retrieval + local cache
       -> per-section and global token budgeting
       -> ContextCompiler
  -> configured local OpenAI-compatible model
  -> response + provenance -> Supabase transcript/UI
  -> ContextManager.process_response
       -> Supabase memories/summaries linked to the canonical transcript
       -> controlled memory writer
       -> threshold-based rolling compaction
```

The frontend still sends its UI transcript to its own authenticated route because the AI SDK uses
that shape, but the route forwards only the current user message and identifiers to Python. The
Python model request is built exclusively from the compiler output; it never receives the complete
frontend transcript by default.

## Memory classes

| Class | Durable storage | Selection policy |
| --- | --- | --- |
| Knowledge | `documents`, `document_chunks` | Hybrid retrieval only when intent needs course material |
| Student | `student_memories` | Subject/topic/relevance/importance/confidence; controlled writes only |
| Episodic | `learning_events` | Student + subject/topic/date/event relevance |
| Conversation | Supabase `messages`, `conversation_summaries` | Recent messages + rolling summary + relevant older messages |
| Working | `working_memory` | Conversation/task scoped, expiry-based; P0 only when explicitly critical |
| Artifact | Supabase `context_artifacts` | Summary/location in prompt; full content remains private and searchable |
| Reference | Local ephemeral cache | Explicit current/web intent; local-first with web fallback, untrusted P2 context |

Original conversation messages are not deleted when a summary is created. Student mastery,
weakness, and misconception memories require repeated evidence by default. Casual chat and weak or
unverified candidates are rejected. Explicit goals and learning preferences can be stored from a
clear first-person statement.

## Retrieval

`SparseRetriever` implements BM25-style lexical ranking. `DenseRetriever` uses an `Embedder`
protocol; the default `HashingEmbedder` is a deterministic, no-network fallback. It is suitable for
tests and exact/concept-term matching. Set `ALIM_EMBEDDING_MODEL` to use the implemented local
OpenAI-compatible `/embeddings` adapter for production semantic recall. `HybridRetriever` combines both rankings using reciprocal
rank fusion, deduplicates by chunk/document identity and overlap, then `HeuristicReranker` considers
retrieval score, lexical overlap, subject/topic, syllabus status, learning state, source quality,
and recency.

Every document chunk retains `document_id`, title/source, page, section, chapter, subject, topic,
subtopic, document type, and language when supplied. The compiler labels passages as sources and
the API returns the same metadata to `SourceSnippetList`; missing metadata stays missing rather than
being fabricated.

## Budgeting and priority

`ContextBudgeter` first enforces configured section allowances, then a model-wide input limit after
reserving generation tokens. Whole items are kept or removed; it does not cut structured records in
the middle. Global reduction removes P3, then P2, then the lowest-value P1. P0 active task state is
never removed; compilation fails clearly if P0 plus the current request cannot fit.

All defaults can be overridden with `ALIM_*` environment variables; see
`backend/.env.example`. `ModelConfig` can override model context/output limits per call.

Qwen3.8-27B supports 262,144 native tokens, but Alim selects a safer total ceiling from hardware:
65,536 on the 48 GB M4 Pro, 32,768 on a 24 GB RTX 3090, or 16,384 on Linux CPU fallback. One
quarter is reserved for output. Reference results have their own 6,000-token ceiling and are removed
before critical working state when the global input limit is reached.

## Observability

Each `CompiledContext` contains structured internal debug data: detected intent/subject/topics,
dense/sparse/fused/reranked counts, memory counts, section token use, total budget, and removed item
IDs. FastAPI returns it only from the explicit compile endpoint when both the request asks for debug
and `ALIM_CONTEXT_DEBUG=true`. Normal chat responses do not expose it.

## Example compiled context

For `Why does oxidative phosphorylation produce more ATP than glycolysis?`, after relevant Biology
material and a misconception have been stored, the two model messages are approximately:

```text
SYSTEM
You are Alim, a careful tutor for a Swiss Gymnasium student...

STUDENT STATE
Current subject: biology
Current topic(s): cellular_respiration
Response language: German
Known Misconception: Student confuses glycolysis with the Krebs cycle.

RELEVANT COURSE MATERIAL
[Source 1: Biology Notes, Chapter 4, page 37]
Oxidative phosphorylation uses a proton gradient...

USER
Why does oxidative phosphorylation produce more ATP than glycolysis?
```

Unrelated Chemistry chunks and the rest of the Biology corpus are absent.

## Current limitations

- The zero-configuration hashing embedder is not a full semantic embedding model; configure
  `ALIM_EMBEDDING_MODEL` for semantic dense retrieval.
- Reference lookup activates for an explicit current/web request or when a study question has no
  relevant document/syllabus match. It first searches operator snapshots under `material/web/`. If no relevant
  match exists, the default `auto` provider uses Wikipedia. Use `ALIM_WEB_PROVIDER=local` to remain
  strictly offline.
- PDF and DOCX parsing require the `documents` optional dependency. Private Storage ingestion is
  exposed at `/api/context/documents/storage`; files are downloaded with the user JWT and deleted
  locally after parsing.
- The FastAPI chat endpoint is non-streaming; the TanStack route converts the completed response to
  the AI SDK UI stream format.
- Python reads the Supabase transcript and writes separate summaries/memories; it does not keep a
  second durable conversation transcript.
- Quiz, mock-exam, grading, study-plan, and multipart upload endpoints in `API_EXPECTATIONS.md`
  remain future integration contracts.
