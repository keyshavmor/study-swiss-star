# Alim local context backend

This directory contains the local-first Python service that compiles a bounded, relevant context
for every tutoring request. The React app's authenticated `/api/chat` route calls this service by
default; set `ALIM_AI_BACKEND=lovable` in the frontend server environment to use the legacy cloud
gateway instead.

## Run

```bash
cd backend
uv sync --extra dev --extra documents
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

The local OpenAI-compatible model defaults to `http://127.0.0.1:11434/v1`. Copy the values from
`.env.example` into your shell or backend environment and change `ALIM_LLM_MODEL` as needed. Set
`ALIM_EMBEDDING_MODEL` to use that server's `/embeddings` endpoint for semantic dense retrieval;
leave it unset for the deterministic hashing fallback.

Core tests do not require FastAPI or a running model:

```bash
PYTHONPATH=backend python3 -m unittest discover -s backend/tests -v
```

## Public context API

- `ContextManager.build_context(...)` analyzes intent, retrieves only required memory classes,
  reranks and deduplicates candidates, enforces section/global budgets, and returns the exact two
  messages that should be sent to the model.
- `ContextManager.process_response(...)` preserves the transcript, runs controlled memory writing,
  and compacts long conversations when thresholds are reached.
- `ContextManager.record_event(...)` records explicit learning events.
- `ContextManager.artifacts.create(...)` stores large results outside the prompt and makes their
  compact summaries retrievable.

The FastAPI façade exposes `/health`, `/api/model/status`, `/api/chat`,
`/api/context/compile`, `/api/context/documents/text`, `/api/context/events`, and
`/api/context/artifacts`.

## Storage and privacy

The default database is `.local/alim-context.db` (ignored by Git). It stores document chunks,
cached embeddings, student memories, learning events, original conversation messages, rolling
summaries, artifacts, and expiring working memory. Core operation uses only this local SQLite file,
the configured local model/embedding endpoints, and a deterministic hashing fallback. No student
data is sent to an external AI API by the Python backend unless an operator deliberately configures
an external-compatible endpoint.
