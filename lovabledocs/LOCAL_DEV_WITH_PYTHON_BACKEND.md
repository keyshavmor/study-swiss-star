# Local Development with the Python Backend

Run the frontend, in-repository FastAPI service, and local model side by side.

## Port map

| Service | URL |
| --- | --- |
| TanStack/Vite frontend | `http://localhost:8080` |
| Python FastAPI backend | `http://127.0.0.1:8001` |
| Ollama/OpenAI-compatible model | `http://127.0.0.1:11434/v1` by default |

## 1. Model server

Start an OpenAI-compatible local model. For Ollama:

```bash
ollama serve
```

Set `ALIM_LLM_MODEL` to a model you have installed. The Python backend, never the browser, talks to
this endpoint.

## 2. Python backend

```bash
cd backend
uv sync --extra dev --extra documents
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Verify `http://127.0.0.1:8001/health` and `http://127.0.0.1:8001/docs`. Configuration defaults are
in `backend/.env.example`; export overrides in the backend process environment. The SQLite database
is created at `backend/.local/alim-context.db` when uvicorn is started from `backend/`.

The dependency-free core tests can be run from the repository root:

```bash
PYTHONPATH=backend python3 -m unittest discover -s backend/tests -v
```

## 3. Frontend

From the repository root:

```bash
bun install
bun run dev
```

The repository currently tracks both `bun.lock` and `package-lock.json`. Bun is used in project
documentation; avoid regenerating both lockfiles in one dependency change.

The authenticated TanStack chat route uses Python by default. Optional server-runtime overrides:

```env
ALIM_AI_BACKEND=context
ALIM_CONTEXT_BACKEND_URL=http://127.0.0.1:8001
ALIM_CONTEXT_BACKEND_TIMEOUT_MS=90000
ALIM_ENABLE_LOVABLE_FALLBACK=false
ALIM_EMBEDDING_MODEL=nomic-embed-text # optional; omit for hashing fallback
```

Use `ALIM_AI_BACKEND=lovable` only to select the legacy gateway. If
`ALIM_ENABLE_LOVABLE_FALLBACK=true`, a Python connection/model failure may send the request to the
cloud Lovable gateway; this is off by default for privacy.

Supabase variables are still required for sign-in and chat transcript persistence. Non-chat
prototype screens continue to use localStorage.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Chat returns 503 | `curl http://127.0.0.1:8001/health`; confirm FastAPI and the model are running |
| Model shows unreachable | Confirm `ALIM_LLM_BASE_URL` and `ALIM_LLM_MODEL` |
| No course sources | Ingest text through `/api/context/documents/text`; confirm subject IDs match frontend slugs |
| Wrong answer language | Confirm the thread subject is one of the known frontend subject names |
| Sign-in fails offline | Supabase auth still requires connectivity; no guest-auth bypass was added |
| Debug data absent | Set `ALIM_CONTEXT_DEBUG=true` and call `/api/context/compile` with `debug:true` |

Keep FastAPI bound to `127.0.0.1`. Core context functionality uses local SQLite, local embeddings,
and the configured local model; it does not require an external AI API.
