# Reusable application data

This directory contains local runtime state that can be reused by the context manager. The default
SQLite database is `app-data/context/alim-context.db` and stores document chunks, cached embeddings,
web-result cache entries, memories, conversation summaries, artifacts, and working memory.

Runtime contents are ignored by Git. Back up this directory if the accumulated learning context is
important.
