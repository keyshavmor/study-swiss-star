# Supabase

Supabase configuration and forward-only migrations remain isolated here. Project
`ucacmeadsufiedxrgqit` owns authentication, Postgres, RLS, private Storage, all durable user state,
transcripts, chunks, memories, summaries, artifacts, and AI history. FastAPI still performs all AI
computation locally. Read [`../docs/SUPABASE_MIGRATION.md`](../docs/SUPABASE_MIGRATION.md) before
linking or applying migrations; never use `db reset --linked`.
