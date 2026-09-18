# Local backend documentation

| Field | Value |
|---|---|
| Owner | Backend maintainers |
| Status | `CURRENT — LOCAL BACKEND` only where code/tests prove it |
| Canonical path | `backend/docs/README.md` |
| Backend foundation | Prompt 03 implementation begun from `f61aeaf21ad3aa3030fb6c1db42203cadb9d8f8c` |
| Frontend contract authority | `f0910e6971f12efe0ad547b904f6e2a518b13856` |
| Last reviewed | 2026-09-18 |

This tree owns implemented backend behavior and the handoff for moving that
backend toward the authoritative frontend contract. Cross-system UX and API
meanings remain canonical under `docs/`; backend code cannot weaken them.

## Map

| Concern | Landing page |
|---|---|
| Service/process architecture | [architecture](architecture/SYSTEM.md) |
| Endpoints, schemas and errors | [API](api/README.md) |
| Model registry/acquisition/runtime | [models](models/README.md) |
| Context, RAG and documents | [RAG](rag/README.md) |
| Caller-token and privileged Supabase access | [Supabase](supabase/README.md) |
| Environments, ports and launcher contract | [operations](operations/ENVIRONMENTS_AND_LAUNCH.md) |
| Implementation order and known gaps | [handoff](handoff/README.md) |

Current strengths include JWT verification, user-token/RLS persistence,
private Storage ownership checks, context compilation, memory/artifacts,
hybrid retrieval/reranking, document parsing, local/web reference lookup,
versioned/redacted API errors, loopback/Host/CORS validation, cancellable
OpenAI-compatible local inference and one Qwen 3.8 27B lifecycle. Model,
admission, health, safety, peer messaging, Assistant and assessment contracts
remain incomplete as listed in the handoff.
