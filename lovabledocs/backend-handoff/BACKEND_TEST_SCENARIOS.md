# Backend Test Scenarios

Status: CURRENT

Automated suites cover:

- no token → 401;
- invalid token → 401;
- mismatched student header → 403;
- valid token/matching header → success;
- cross-user retrieval isolation;
- all seven response languages plus unsupported-language rejection;
- subject-chat source metadata and compiled context;
- request error envelopes and IDs;
- Supabase adapter owner assertion and explicit read filters;
- retrieval fusion/deduplication, budgets, memory, summaries, artifacts, web fallback;
- model download/runtime/platform selection and environment setup.
- exact inventory/auth/error/version checks for all 27 local endpoints;
- assessment lifecycle, timing, retries, grading, cancellation and isolation;
- privacy deletion, runtime lease expiry/recovery and concurrent preparation;
- route-to-layer traceability for every shipped frontend screen.

Frontend-focused Bun tests cover the bearer/header/language bridge, backend error/request-ID propagation without token leakage, seven-language detection/mixed fallback, telemetry sanitization, and Google read-only occurrence mapping.

Manual/staging scenarios remain for real Supabase tokens, RLS CRUD across two users, OAuth providers, bucket MIME/size limits, Edge Function behavior, cron retry behavior, and browser speech availability.

The canonical test strategy, residual severity/owners and recovery steps live in
[`../testing/README.md`](../testing/README.md). Do not treat static Supabase
checks, tiny model fixtures or simulated platform profiles as physical proof.
