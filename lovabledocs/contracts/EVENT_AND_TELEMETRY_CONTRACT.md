# Event and Telemetry Contract

Status: CURRENT — VERIFIED 2026-09-15

Browser telemetry sends bounded operational classifications to `activity-log`; prompts, replies, attachments, documents, Calendar event data, form values, email, passwords, cookies, authorization, tokens, secrets, and keys are forbidden. `frontend/src/lib/telemetry.ts` drops forbidden keys and never forwards raw error messages.

The Edge Function authenticates bearer tokens itself because live `verify_jwt=false`. Only `auth_signin_failed` and `oauth_signin_failed` may be anonymous. It writes `usage_events` and a private `activity-logs` mirror. Admin reads use `app_metadata.role=admin`.

The checked-in source adds the same forbidden-key filtering at the function boundary. The database supplies a second guard for common credential keys.

Learning events are not telemetry: FastAPI `POST /api/context/events` stores user-scoped learning context through `SupabaseContextStore`.
