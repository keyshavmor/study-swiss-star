# Live migration history

Verified from project `ucacmeadsufiedxrgqit` on 2026-09-15. This list is an inventory, not a set
of synthetic migration files.

| Version | Name | Original SQL in this repository |
|---|---|---|
| `20260801092601` | `0c1ae180-35e2-49b7-bef2-22956fd8768e` | Yes |
| `20260801092611` | `e7bbb174-7036-4eca-9fe0-acdbcd97e178` | Yes |
| `20260801092624` | `0f86a6c3-83bc-4cb4-b40b-d6d53d43381a` | Yes |
| `20260914122222` | `harden_chat_and_private_user_materials` | Yes |
| `20260914123458` | `optimize_user_isolation_policies_and_indexes` | Yes |
| `20260914131010` | `canonical_user_backend` | Yes |
| `20260914131340` | `cover_composite_foreign_keys` | Yes |
| `20260914175145` | `assistant_settings_storage_management` | No; live state and Drizzle sources document the result |
| `20260914193052` | `auth_calendar_feedback_activity_hardening` | No; live state and deployed function source document the result |
| `20260914193520` | `optimize_admin_audit_policies` | No; live catalog is authoritative |
| `20260914204525` | `multilingual_preferences_and_assistant_media_retention` | No; live catalog and generated types are authoritative |
| `20260914204626` | `enable_media_retention_scheduler` | No; live extension/catalog state is authoritative |
| `20260914204647` | `schedule_media_retention_cleanup` | No; live cron catalog is authoritative |
| `20260914211937` | `extend_supported_languages_swiss_german_italian` | No; live constraints are authoritative |
| `20260914212346` | `language_defaults_and_reply_policy` | No; live defaults/constraints are authoritative |
| `20260915115245` | `reconcile_least_privilege_fk_and_retention` | Pending local forward migration; **not applied** to the live project |

The reconciliation deliberately does not fabricate the eight unavailable historical SQL bodies.
Before making future schema changes, first capture a reviewed schema diff into a new forward-only
migration. Do not rename, reorder, or replay the entries above on the linked project.
