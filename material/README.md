# Learning material

Place source textbooks, notes, syllabi, worksheets, past examinations, and marking schemes here.
The files themselves remain external to prompts until they are chunked through the backend document
ingestion API. Keep copyright-restricted material out of Git.

`material/web/` is the first source used when a question asks for web/current-information context.
Add UTF-8 `.md`, `.txt`, `.html`, or `.htm` snapshots there. Alim searches them locally, labels
results with `local://` provenance, and applies the normal context budget. If nothing relevant is
found, the default `auto` provider fetches a current Wikipedia reference. Set
`ALIM_WEB_PROVIDER=local` to prohibit that fallback or `wikipedia` to bypass local search.
