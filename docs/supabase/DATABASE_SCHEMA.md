# Production Database Schema

Status: CURRENT — GENERATED/CATALOG VERIFIED 2026-09-15

All listed `public` tables have RLS enabled and a `user_id` ownership key unless noted.

| Domain | Tables | Notes |
|---|---|---|
| account/chat | `profiles`, `user_preferences`, `threads`, `messages` | `profiles.user_id` is the PK; thread/message composite ownership FKs prevent cross-user attachment |
| frontend domain | `assessments`, `planner_events`, `school_links`, `notification_state` | Live tables exist, but current UI state remains in browser key `asa.data.v2` |
| context backend | `documents`, `document_chunks`, `student_memories`, `learning_events`, `conversation_summaries`, `context_artifacts`, `working_memory` | Used by request-scoped `SupabaseContextStore` |
| study tools | `quizzes`, `quiz_attempts`, `mock_exams`, `mock_exam_attempts`, `grading_results`, `study_plans` | Schema present; current placeholder UI does not yet call generation endpoints |
| feedback/telemetry | `feedback`, `usage_events` | Admin-only reads use `app_metadata.role`; approved pre-auth usage events may have null `user_id` |
| Assistant | `assistant_threads`, `assistant_messages`, `assistant_attachments`, `media_retention_queue` | Composite ownership FKs; user queue inserts must start `pending` |

Important verified constraints:

- usernames are trimmed lowercase, 3–30 chars, and match `^[a-z0-9._-]+$`;
- message roles are `user|assistant|system|data`;
- `document_chunks.embedding` is JSONB and the adapter sends JSON arrays;
- `documents(id,user_id)`, `threads(id,user_id)`, assistant thread/message pairs, quiz pairs, and mock-exam pairs back composite ownership FKs;
- telemetry JSON rejects `password`, `access_token`, `refresh_token`, and `oauth_token`;
- assistant media rows require non-empty descriptor/object paths and a 30-minute default `delete_after`.

The complete machine-readable schema is `frontend/src/integrations/supabase/types.ts`.
