# Open Backend Decisions

Status: CURRENT — ONLY UNRESOLVED PRODUCT/OPERATIONS ITEMS

1. What exact General Assistant generation contract should be used: endpoint name, history ownership, attachment parsing semantics, cancellation/streaming behavior, and whether subject memories participate?
2. Which product actions should trigger quiz, mock-exam, grading, and study-plan generation, and what stable DTOs/errors should those modes expose?
3. Should the current Materials UI gain a real upload/index action, or should ingestion remain operator/API-only?
4. Which component will produce assistant-generated media and durable descriptors? Cleanup exists, but there is no producer.
5. What production transport protects the TanStack-to-local-FastAPI bearer-token hop if the services are not on the same host?
6. Who approves deploying the source-level telemetry sanitizer hardening and the forward-only
   least-privilege/index migration to production after a staging smoke test?
7. Which environment runs authenticated two-user RLS/Storage contract tests without touching real user data?

These questions are intentionally not answered by inventing visible product behavior.
