# Backend Capabilities

Status: CURRENT — VERIFIED 2026-09-15

Implemented: Supabase JWT verification; request IDs/errors; subject chat; context compilation/budgeting; recent and summarized conversation context; student/episodic/working memory; artifacts; sparse/dense/hybrid retrieval; embeddings; bounded web retrieval; private document ingestion; request-scoped Supabase persistence; local Qwen model orchestration/runtime; health/model status; seven response languages.

Implemented infrastructure without a current producer: assistant-media retention cleanup and descriptor persistence contract.

Live but intentionally not yet integrated into the local backend: the authenticated-read-only
`ai_model_catalog` and guarded `get_ai_runtime_policy()` RPC. Connecting them requires an explicit
service-authentication and offline-fallback decision; the reconciliation does not invent that
operational contract.

Deferred because the visible product contract is not yet defined: General Assistant generation/attachment parsing, quiz/mock-exam/grading/study-plan generation endpoints, and transcript OCR. Current UI placeholders and persistence remain unchanged.
