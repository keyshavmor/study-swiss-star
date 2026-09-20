# Live migration history and forward reconciliation

Verified read-only from project `ucacmeadsufiedxrgqit` on 2026-09-20. This is
an evidence ledger, not synthetic migration source. Production was not changed.

| Version | Name | Original SQL in Git |
|---|---|---|
| `20260801092601` | `0c1ae180-35e2-49b7-bef2-22956fd8768e` | Yes |
| `20260801092611` | `e7bbb174-7036-4eca-9fe0-acdbcd97e178` | Yes |
| `20260801092624` | `0f86a6c3-83bc-4cb4-b40b-d6d53d43381a` | Yes |
| `20260914122222` | `harden_chat_and_private_user_materials` | Yes |
| `20260914123458` | `optimize_user_isolation_policies_and_indexes` | Yes |
| `20260914131010` | `canonical_user_backend` | Yes |
| `20260914131340` | `cover_composite_foreign_keys` | Yes |
| `20260914175145` | `assistant_settings_storage_management` | No; partial Drizzle source only |
| `20260914193052` | `auth_calendar_feedback_activity_hardening` | No |
| `20260914193520` | `optimize_admin_audit_policies` | No |
| `20260914204525` | `multilingual_preferences_and_assistant_media_retention` | No |
| `20260914204626` | `enable_media_retention_scheduler` | No |
| `20260914204647` | `schedule_media_retention_cleanup` | No |
| `20260914211937` | `extend_supported_languages_swiss_german_italian` | No |
| `20260914212346` | `language_defaults_and_reply_policy` | No |
| `20260915104658` | `post_auth_language_model_gate_and_capacity_cleanup_policy` | No |
| `20260915104721` | `language_onboarding_default_for_new_users` | No |
| `20260915104807` | `schedule_storage_capacity_cleanup` | No |
| `20260915104855` | `global_storage_cleanup_not_user_toggle` | No |
| `20260915105026` | `reconcile_least_privilege_fk_and_retention` | Yes |
| `20260915105236` | `cover_media_retention_attachment_owner_fk` | Yes |
| `20260915151420` | `peer_messaging_compliance_foundation` | No |
| `20260915151521` | `privacy_health_and_user_data_rights` | No |
| `20260915151622` | `system_admission_and_load_balancing_policy` | No |
| `20260915194726` | `harden_auth_peer_rpcs_and_signup_defaults` | No |
| `20260915200051` | `move_peer_authorization_helpers_private` | No |
| `20260915200137` | `optimize_compliance_admin_rls` | No |
| `20260915202926` | `cover_peer_and_guardian_foreign_keys` | No |
| `20260916001241` | `add_per_user_combined_50mb_quota` | No |
| `20260916001942` | `restrict_quota_rpcs_to_authenticated` | No |
| `20260917223625` | `harden_user_facing_security_definer_rpcs` | No |
| `20260917223810` | `move_privileged_rpc_implementations_out_of_public` | No |

Nine exact applied SQL files are available in `supabase/migrations`; 23 original
bodies are absent from every Git ref inspected. Their identities must remain in
the linked migration ledger. Do not create guessed files with those versions,
rename applied migrations, repair history blindly, or run a linked reset.

## Prompt 07 forward migration

`20260920120000_harden_exposed_grants_and_function_paths.sql` is a new,
not-deployed forward migration. It is designed to advance a database that
already has the 32-entry baseline. It removes anonymous public-table grants,
changes default function privileges to opt-in, restricts privileged definer
entry points, and removes writable-schema search paths from quota helpers.

Before deployment: review the SQL diff, test on a disposable branch/local clone
of the complete baseline, regenerate types, run both SQL security suites, run
security/performance advisors, and obtain explicit production authorization.
Rollback is another forward migration restoring only a specifically reviewed
ACL/search-path requirement; applied migration history is never edited.

## Fresh-local limitation

A clean local reset cannot reproduce production until the missing 23 original
bodies are recovered or a reviewed baseline dump is captured. The repository
therefore makes no clean-reset claim. `supabase/scripts/local.sh` exposes the
local lifecycle while clearly reporting this limitation. Current generated
TypeScript types and the seven verified Edge Function sources capture the live
contract, but they are not substitutes for migration SQL.
