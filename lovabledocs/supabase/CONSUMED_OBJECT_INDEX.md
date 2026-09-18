# 04 — Frontend ↔ Supabase contract

| Field | Value |
|---|---|
| Owner | Supabase and frontend |
| Status | `CURRENT — SUPABASE` where live-verified; gaps are explicit |
| Canonical path | `docs/supabase/CONSUMED_OBJECT_INDEX.md` |
| Verified | project `ucacmeadsufiedxrgqit`, read-only, 2026-09-18 |

Live metadata was read from `ucacmeadsufiedxrgqit` on 2026-09-18. No live
mutation occurred. Current Supabase security guidance requires explicit grants
plus RLS and notes that automatic Data API exposure defaults are changing; the
future schema pass must audit both layers, not RLS alone.

## Client/auth boundary

`frontend/src/integrations/supabase/{client,client.server,auth-middleware,
types}.ts` supplies browser/server clients. Browser code may contain only the
project URL and publishable key. User JWTs authorize data through RLS. Secret/
service-role keys must never enter `VITE_*`, browser bundles, telemetry, or
errors.

Auth surfaces include email/password, exact-username lookup/login Edge
Functions, OAuth (GitHub, LinkedIn, Spotify), password recovery, auth-state
change, sign out, compliance, and Google identity linking. Authorization roles
come from controlled `app_metadata`, never user-editable metadata.

## Live public tables (37, all RLS-enabled)

| Domain | Tables |
|---|---|
| Study chat | `threads`, `messages` |
| Identity/preferences | `profiles`, `user_preferences` |
| Academic/product | `assessments`, `planner_events`, `school_links`, `notification_state` |
| Context/RAG | `documents`, `document_chunks`, `student_memories`, `learning_events`, `conversation_summaries`, `context_artifacts`, `working_memory` |
| Assessments | `quizzes`, `quiz_attempts`, `mock_exams`, `mock_exam_attempts`, `grading_results`, `study_plans` |
| Support/telemetry | `feedback`, `usage_events` |
| Assistant/media | `assistant_threads`, `assistant_messages`, `assistant_attachments`, `media_retention_queue` |
| AI control plane | `ai_model_catalog` |
| Compliance/safety | `account_compliance`, `user_legal_consents`, `moderation_events`, `guardian_notification_queue` |
| Peer messaging | `peer_conversations`, `peer_conversation_members`, `peer_messages`, `peer_message_attachments`, `peer_message_notifications` |

Frontend generated types reflect current live corrections such as
`sender_user_id`, `owner_user_id`, `conversation_type`, nullable
`created_by`, JSON health results, and `approved` moderation status.

## Live Storage buckets (all private)

| Bucket | Limit | Main ownership/use |
|---|---:|---|
| `profile-avatars` | 2 MiB | `auth.uid()` first path segment |
| `user-materials` | 50 MiB | private learning material, owner prefix |
| `chat-attachments` | 50 MiB | assistant inputs/media, owner prefix |
| `peer-message-attachments` | 250,000 B | compressed/scanned peer attachments, conversation membership |
| `feedback-messages` | 1 MiB | write-own, admin read |
| `activity-logs` | 256 KiB | sanitized events, admin read |
| `assistant-descriptors` | 1 MiB | owner-readable descriptor-before-delete artifacts |

Upload/upsert paths require the relevant insert/select/update policies. Quota
checks are present in Storage write checks. File extensions/MIME values supplied
by browsers remain untrusted.

## Live public API/control RPCs

Frontend-facing invoker functions include `can_allocate_my_quota`,
`get_my_quota_status`, `get_storage_usage_status`,
`get_ai_runtime_policy`, `get_system_admission_policy`,
`get_user_visible_supabase_health`, `get_my_data_summary`,
`complete_account_compliance_onboarding`, `find_peer_by_exact_username`,
`get_or_create_direct_peer_conversation`, and
`mark_peer_conversation_read`.

Privileged/worker functions include confirmed-strike, emergency-cleanup, and
service deletion operations. Several are `SECURITY DEFINER`; future security
work must verify explicit execute grants, fixed search paths, caller checks, and
private-schema implementations. Trigger/helper functions exist for quota,
updated timestamps, auth defaults, thread touch, and message notifications.

## Live Edge Functions

| Function | JWT configuration | Contract note |
|---|---|---|
| `username-login` | gateway verification off | function must authenticate safely and avoid email enumeration |
| `username-availability` | off | public/pre-auth bounded lookup |
| `activity-log` | off | function performs event/auth allowlisting; never log secrets |
| `feedback-submit` | on | returns `ok`, `database_recorded`, `storage_recorded` |
| `storage-emergency-cleanup` | off | protected worker secret/function validation required |
| `media-retention-cleanup` | off | scheduled protected worker; descriptor-before-delete |
| `delete-my-data` | on | user-authorized deletion workflow |

Gateway `verify_jwt:false` does not mean unauthenticated behavior is acceptable;
the implementation must contain the documented alternative protection.

## Model and policy control plane

`ai_model_catalog` has ten enabled rows, in this order:
`Qwen/Qwen3.8-27B`, `Qwen/Qwen3.5-27B`, `Qwen/Qwen3-14B`,
`Qwen/Qwen3.5-9B`, `Qwen/Qwen3-8B`, `Qwen/Qwen3.5-4B`,
`Qwen/Qwen3-4B`, `Qwen/Qwen3.5-2B`, `Qwen/Qwen3-1.7B`, and
`Qwen/Qwen3-0.6B`. Authenticated users have read-only catalogue access.

`get_ai_runtime_policy` supplies new-allocation free thresholds and runtime free
floors. `get_system_admission_policy` supplies maximum users, utilization caps,
rebalance and recommendation flags. These are policy inputs; Supabase does not
measure local hardware or establish runtime readiness.

## Migration reconciliation fact

Live migration history contains 32 entries through
`move_privileged_rpc_implementations_out_of_public` (20260917223810). `main`
commits only three early migration files; the backend branch commits six later
reconciliation migrations/Edge Functions. Neither tree alone reconstructs live
state. Applied migrations are immutable history: future work must pull/reconcile
forward, never delete or edit applied versions merely to match `main` paths.

## Live advisory findings

- `WARN`: leaked-password protection disabled.
- `WARN`: insufficient MFA options.
- `INFO`: 20 currently unused indexes; do not drop based on low traffic alone.

These are decisions/manual configuration tasks, not changes authorized by this
planning run.

## Verification requirements

Generate types from the live/local reconciled schema; run two-user CRUD/RPC/
Storage isolation tests; inspect grants and RLS; test direct-write denial for
moderated peer messages; test quota races; test every `SECURITY DEFINER` execute
path; run security/performance advisors; and verify the exact project ref before
any future write.
