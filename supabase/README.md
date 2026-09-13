# Supabase

Supabase configuration and migrations remain isolated here. Supabase owns authentication and the
durable chat thread/message tables. Local RAG, memory, web-cache, and artifact state are stored in
`app-data/context/alim-context.db` instead.
