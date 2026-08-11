# Local Development with the Python Backend

Three processes run side by side on the same machine: the Lovable frontend, the FastAPI backend,
and the model server.

## Port map

| Service | URL | Owner |
| --- | --- | --- |
| Lovable frontend (Vite) | `http://localhost:8080` | this repo |
| Python FastAPI backend | `http://localhost:8001` | backend repo |
| Ollama / local model server | `http://localhost:11434` | Ollama |
| Remote vLLM / GPU endpoint | configured in the Python backend `.env` | backend repo |

## 1. Frontend

```bash
bun install
bun run dev
```

Open:

```text
http://localhost:8080
```

Notes:
- Bun is the package manager — do not mix in npm/yarn lockfiles.
- The Vite dev server hot-reloads on save; no restart is needed after editing `src/`.
- Signing in still uses Lovable Cloud (Supabase), so the first sign-in needs internet access.

## 2. Python FastAPI backend

```bash
cd backend
conda activate alim-study-assistant
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Open:

```text
http://localhost:8001
http://localhost:8001/docs
http://localhost:8001/health
```

Notes:
- Bind to `127.0.0.1` so the backend is not reachable from other devices on the network.
- CORS must allow origin `http://localhost:8080`, methods `GET, POST, OPTIONS`, and headers
  `Content-Type, Authorization, X-Student-Id`.
- `http://localhost:8001/docs` (Swagger) is the fastest way to verify the contract in
  `docs/API_EXPECTATIONS.md`.

## 3. Local model server (Ollama)

```bash
ollama serve
```

```text
http://localhost:11434
```

The Python backend — not the browser — talks to the model server. Switching between local Ollama
and a remote vLLM/GPU endpoint is a Python-side configuration change; the frontend only observes
the result through `GET /api/model/status`.

## 4. Frontend `.env.local`

Create `.env.local` in the project root (gitignored):

```env
VITE_PYTHON_API_BASE_URL=http://localhost:8001
VITE_BACKEND_MODE=python
VITE_USE_MOCK_AI=false
VITE_ENABLE_LOVABLE_AI_FALLBACK=false
```

| Variable | Values | Meaning |
| --- | --- | --- |
| `VITE_PYTHON_API_BASE_URL` | URL | FastAPI base URL |
| `VITE_BACKEND_MODE` | `python` \| `lovable` \| `mock` | Which AI path the UI uses |
| `VITE_USE_MOCK_AI` | `true` \| `false` | Force canned AI responses (UI work without a backend) |
| `VITE_ENABLE_LOVABLE_AI_FALLBACK` | `true` \| `false` | Allow falling back to Lovable AI Gateway when Python is unreachable |

Vite only exposes variables prefixed with `VITE_`. Restart `bun run dev` after editing `.env.local`.

## 5. Recommended startup order

1. `ollama serve` (or make the remote endpoint reachable)
2. `uvicorn app.main:app --reload --host 127.0.0.1 --port 8001` → check `/health`
3. `bun run dev` → open `http://localhost:8080`
4. Check `/diagnostics` in the app: backend health green, model status shows provider and model.

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Backend banner stays amber | Backend not running, or wrong port | `curl http://localhost:8001/health` |
| CORS error in the browser console | FastAPI CORS not allowing `http://localhost:8080` | Add the origin to `CORSMiddleware` |
| Chat still uses Lovable AI | `VITE_BACKEND_MODE` not `python`, or dev server not restarted | Fix `.env.local`, restart `bun run dev` |
| Answers in the wrong language | `language` missing from the request | Check the subject → language map in `SUBJECT_MODEL_AND_LANGUAGE_RULES.md` |
| Model status unreachable | `ollama serve` not running | Start Ollama, or switch the backend to the remote endpoint |
| Sign-in fails offline | Supabase auth needs internet | Expected in Stage 1; see open question about guest/demo mode |

## 7. Security note — `VITE_*` variables are browser-exposed

Anything prefixed with `VITE_` is compiled into the JavaScript bundle and readable by anyone with
the app open. Therefore:

- **Safe in `VITE_*`:** the Python base URL, backend mode flags, the Supabase publishable/anon key.
- **Never in `VITE_*`:** the Supabase service-role key, `LOVABLE_API_KEY`, OpenAI/Anthropic/HF API
  keys, remote GPU or vLLM tokens, database passwords, or any private backend token.
- Private model credentials belong in the **Python backend's** `.env`, read server-side only.
- The browser calls FastAPI; FastAPI calls the model provider. No provider key ever reaches the
  browser.
- Do not commit `.env.local`, and do not paste secrets into the frontend repo.
