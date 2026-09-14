# State and storage ownership

This is the current architecture decision. It supersedes the former staged/localStorage design.

| Data | Canonical owner | Local behavior |
| --- | --- | --- |
| Auth identity | Supabase Auth `auth.users.id` | Browser holds the normal Supabase session |
| Profile, preferences, assessments, planner, links, notifications | Supabase Postgres with RLS | `AppDataProvider` keeps optimistic memory state and an account-scoped disposable cache |
| Threads and UI messages | Supabase `threads` / `messages` | One authoritative transcript; Python reads it for context but does not duplicate it |
| Original student files | Private `user-materials` Storage bucket | Objects use `{auth.uid()}/…`; local parsing uses a deleted temporary file |
| Document metadata/chunks/embeddings | Supabase `documents` / `document_chunks` with direct ownership | Parsing, chunking, token counting, embedding, retrieval, and reranking execute locally |
| Memories, events, summaries, artifacts, working memory | Supabase Postgres with RLS | Context and memory algorithms execute locally |
| Quiz/exam/grading/study-plan/usage/feedback history | Supabase Postgres with RLS | Local Qwen generates/evaluates; cloud stores durable results |
| Theme | Device | Pure device preference may remain local |
| Demo data | Device/in-memory | Isolated from signed-in data and never uploaded |
| Non-sensitive web/reference cache | Local ephemeral cache | Must contain no durable private user history |
| SQLite | Unit/E2E test adapter | Never the production canonical user store |

## Account switching and offline behavior

The provider clears private state before hydrating a new `auth.users.id`. Cache keys include that UUID
(`asa.data.v3.{uuid}` and `asa.year.v2.{uuid}`), so data from account A cannot render for account B.
Cloud mutations are optimistic; failures remain in that account's local cache and show a visible sync
error. The cache is not authoritative.

## Security boundaries

- Every user-owned row has `user_id uuid` referencing `auth.users(id)` and explicit SELECT, INSERT,
  UPDATE, and DELETE policies using `(select auth.uid())`.
- Composite foreign keys enforce message/thread, chunk/document, summary/thread, working/thread,
  quiz/attempt, and mock-exam/attempt ownership.
- Normal frontend and FastAPI access uses a publishable key plus the user's JWT. Secret/service-role
  keys are not used for end-user CRUD.
- FastAPI rejects `X-Student-Id` when it disagrees with verified `sub`.
- Storage is private and checks the first path segment with `storage.foldername(name)`.

The migration/runbook is in [SUPABASE_MIGRATION.md](SUPABASE_MIGRATION.md).
