# Environment variable matrix

No secret values belong in Git. Browser variables may contain only public identifiers/keys;
server and backend secrets must be supplied by the deployment environment.

| Variable | Consumer | Required | Sensitivity | Purpose / safe example |
|---|---|---:|---|---|
| `VITE_SUPABASE_URL` | Browser | Yes | Public | Project URL, `https://ucacmeadsufiedxrgqit.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser | Yes | Public | Supabase publishable key; never `sb_secret_` or `service_role` |
| `SUPABASE_URL` | TanStack server + FastAPI | Yes | Public | Same project URL |
| `SUPABASE_PUBLISHABLE_KEY` | TanStack server + FastAPI | Yes | Public | Publishable key used with the caller's bearer JWT and RLS |
| `ALIM_CONTEXT_BACKEND_URL` | TanStack server | Yes for tutoring | Internal | Defaults locally to `http://127.0.0.1:8001`; do not expose to browser code |
| `ALIM_CONTEXT_BACKEND_TIMEOUT_MS` | TanStack server | No | Public config | Backend request deadline; example `90000` |
| `ALIM_BACKEND_HOST` / `ALIM_BACKEND_PORT` | FastAPI launcher | No | Internal | Defaults `127.0.0.1:8001`; remote binding requires explicit hardening/opt-in |
| `ALIM_CORS_ALLOWED_ORIGINS` | FastAPI | No | Internal trust config | Exact local frontend origins; wildcard/Lovable origins forbidden |
| `ALIM_ALLOWED_HOSTS` | FastAPI | No | Internal trust config | Exact HTTP Host allowlist; wildcard forbidden |
| `ALIM_MODEL_PATH` | FastAPI runtime | Yes for local inference | Internal | Local GGUF/model directory |
| `ALIM_LLM_BASE_URL` | FastAPI runtime | No | Internal | Local OpenAI-compatible endpoint, default loopback |
| `ALIM_MODEL_HOST` / `ALIM_MODEL_PORT` | Model runtime | No | Internal | Local listener coordinates; keep loopback unless explicitly secured |
| `ALIM_MODEL_SERVER_COMMAND` | Model runtime | No | Sensitive config | Optional process command; deployment-controlled only |
| `ALIM_CONTEXT_DB` | FastAPI dev/test | No | Internal | SQLite fallback path; production user data uses Supabase |
| `ALIM_WEB_PROVIDER` | FastAPI | No | Public config | Web retrieval mode; local/offline modes avoid external calls |
| `MEDIA_RETENTION_CRON_SECRET` | Edge Function/Vault | Yes for cron | Secret | Authenticates scheduled cleanup; stored in Supabase Vault, never returned to clients |

Authentication bypass flags: none are supported. Tests inject a verifier into `create_app`; runtime
code always requires and verifies a bearer JWT. Use Node.js 22+ or the checked-in Bun lockfile for
the current Supabase JavaScript client toolchain. The TanStack backend URL is
validated as path-free loopback HTTP before a caller token can be forwarded.
