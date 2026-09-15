# RLS Authorization Matrix

Status: CURRENT — LIVE VERIFIED 2026-09-15

| Resource class | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| normal user-owned public tables | own rows | `auth.uid() = user_id` | own rows, with ownership `WITH CHECK` | own rows |
| `feedback` | admin via `app_metadata.role=admin` | own row | none | none |
| `usage_events` | admin via `app_metadata.role=admin` | own authenticated row; approved anonymous events go through Edge Function | none | none |
| `media_retention_queue` | own rows | own row with `status='pending'` | cleanup service only | cleanup service only |
| `activity-logs`, `feedback-messages` objects | admin only | owner-prefixed path | none | none |
| `assistant-descriptors` objects | owner-prefixed path | trusted descriptor producer only | trusted producer only | retention/admin only |
| `chat-attachments`, `profile-avatars`, `user-materials` objects | owner-prefixed path | owner-prefixed path | owner-prefixed path | owner-prefixed path |

Every normal update policy has both `USING` and `WITH CHECK`. Admin claims come from non-user-editable `app_metadata`, not `user_metadata`. The Python adapter adds explicit `user_id=eq.<verified sub>` filters in addition to RLS.

The live project currently includes broader table privileges than the clients need, including
`TRUNCATE`, `REFERENCES`, and `TRIGGER` grants and anonymous grants on Assistant/retention tables.
RLS remains the live row-access boundary, but these grants violate least-privilege defense in depth.
`supabase/migrations/20260915115245_reconcile_least_privilege_fk_and_retention.sql` contains the
reviewable correction and is intentionally not applied pending staging and production approval.
Future migrations must use explicit grants because new public tables may no longer be auto-exposed.
