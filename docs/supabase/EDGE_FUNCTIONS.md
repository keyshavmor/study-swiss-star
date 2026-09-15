# Edge Functions

Status: CURRENT — LIVE VERIFIED AND SOURCE RETRIEVED 2026-09-15

Exact current deployed sources were retrieved into `supabase/functions/<slug>/index.ts`.

| Function | Version | Live `verify_jwt` | Contract |
|---|---:|---:|---|
| `storage-emergency-cleanup` | 2 | false | custom authorization accepts the Vault-held scheduler secret or a verified user; enforces the global 90% → 80% capacity policy |
| `username-login` | 1 | false | validates normalized username/password, resolves username with trusted client, signs in with public client, returns session tokens |
| `activity-log` | 2 | false | custom optional bearer verification; only two named auth-failure events may be anonymous; rejects secret/content-shaped properties |
| `feedback-submit` | 2 | true | re-verifies bearer, sanitizes context, writes feedback row and private text mirror |
| `username-availability` | 1 | false | public normalized validation/availability response |
| `media-retention-cleanup` | 2 | false | accepts only the Vault-held retention secret; validates owner paths and descriptor presence before deletion |

Repository `supabase/config.toml` records the same JWT settings. Secret values are environment/Vault-managed and are not documented.

The three reconciliation-hardened functions were deployed and re-fetched with byte-for-byte source
parity. `storage-emergency-cleanup` v2 was deployed concurrently by another actor and was re-fetched
without modification.
