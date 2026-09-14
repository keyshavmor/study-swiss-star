# Python backend integration plan

## Final ownership

The TanStack/React frontend remains Lovable-editable. Supabase project `ucacmeadsufiedxrgqit` is the
canonical auth, Postgres, and Storage backend. FastAPI, llama.cpp, Qwen, embeddings, RAG, context
compilation, memory extraction, grading, and generation remain local.

## Implemented request path

1. The browser authenticates directly with Supabase and sends its access token to the TanStack route.
2. The route validates the session, checks thread ownership through RLS, and persists the UI message.
3. The route forwards `Authorization: Bearer …` to FastAPI on `127.0.0.1:8001`.
4. FastAPI validates the token against the configured Supabase Auth endpoint and derives the UUID from
   verified `sub`. A mismatched `X-Student-Id` is rejected.
5. FastAPI creates a fresh `SupabaseContextStore` with the publishable key and that token. There is no
   shared mutable session and no service-role bypass.
6. Context algorithms retrieve only user-scoped rows, compile a bounded prompt, and call the local
   Qwen server on `127.0.0.1:8000`.
7. Supabase messages remain the one transcript. Python persists summaries, memories, events, chunks,
   embeddings, and artifacts without maintaining a second SQLite transcript.

## Documents

The browser uploads originals to `user-materials/{auth.uid()}/…`. The authenticated bridge asks
FastAPI to fetch that object with the same user JWT, parse it in a temporary file, chunk/embed locally,
and save document/chunk rows through RLS. The temporary copy is deleted. PDF/DOCX parsing uses the
`documents` optional dependency; unsupported image extraction is marked for review rather than sent to
a cloud model.

## Storage abstraction

`ContextStore` describes only operations used by the existing algorithms. `SupabaseContextStore` is
the production adapter. `SQLiteContextStore` remains an in-memory/unit/E2E adapter and optional
non-production fixture. It is not the long-lived user store.

## Unchanged algorithms and UI invariants

- intent analysis, exact token budgets, compiler, BM25/dense fusion, RRF, reranking, and memory gates
- Qwen/Qwen3.8-27B through local llama.cpp only
- static 15-subject catalogue, SPF behavior, Swiss grade math, routes, UI component APIs and styling
- Lovable Vite/TanStack tooling, preview support, Git integration, and error reporting

Remote migration, OAuth configuration, type generation, and old-project transfer are documented in
[SUPABASE_MIGRATION.md](SUPABASE_MIGRATION.md).
