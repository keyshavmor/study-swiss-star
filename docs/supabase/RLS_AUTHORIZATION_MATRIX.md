# RLS Authorization Matrix

Status: CURRENT — LIVE VERIFIED 2026-09-15

| Resource class | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| normal user-owned public tables | own rows | `auth.uid() = user_id` | own rows, with ownership `WITH CHECK` | own rows |
| `feedback` | admin via `app_metadata.role=admin` | own row | none | none |
| `usage_events` | admin via `app_metadata.role=admin` | own authenticated row; approved anonymous events go through Edge Function | none | none |
| `media_retention_queue` | own rows | own row with `status='pending'` | cleanup service only | cleanup service only |
| `ai_model_catalog` | all enabled/disabled catalog rows for authenticated users | none | none | none |
| `activity-logs`, `feedback-messages` objects | admin only | owner-prefixed path | none | none |
| `assistant-descriptors` objects | owner-prefixed path | trusted descriptor producer only | trusted producer only | retention/admin only |
| `chat-attachments`, `profile-avatars`, `user-materials` objects | owner-prefixed path | owner-prefixed path | owner-prefixed path | owner-prefixed path |

Every normal update policy has both `USING` and `WITH CHECK`. Admin claims come from non-user-editable `app_metadata`, not `user_metadata`. The Python adapter adds explicit `user_id=eq.<verified sub>` filters in addition to RLS.

Migrations `20260915105026` and `20260915105236` removed unnecessary `TRUNCATE`, `REFERENCES`, and
`TRIGGER` grants from Data API roles, removed anonymous Assistant/retention access, restricted the
retention queue to authenticated SELECT/INSERT, and added owner-bound paths plus a composite owner FK.
Future migrations must use explicit grants because new public tables may no longer be auto-exposed.
