# Backend Acceptance Criteria

Status: CURRENT

Accepted by automated backend tests:

- bearer token required and invalid token rejected;
- verified token subject owns identity;
- mismatched `X-Student-Id` rejected;
- matching header succeeds;
- cross-user context isolation;
- request-scoped Supabase filters;
- context budgets/retrieval/memory/summaries;
- model/runtime/platform behavior;
- document/model management paths;
- all seven language codes reach the compiler;
- structured errors and request IDs.

Code-review acceptance:

- no browser service-role/secret key;
- caller JWT is forwarded only server-to-server;
- no token in errors/telemetry/persistence;
- Google token/calendar content remain browser-only;
- private material path starts with verified user ID and temp file is deleted;
- generated media cannot be deleted without a durable descriptor.

Release acceptance still requires the frontend gates and authenticated staging/live contract tests listed in the sync report.
