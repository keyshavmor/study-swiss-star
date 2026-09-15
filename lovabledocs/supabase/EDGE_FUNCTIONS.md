# Edge Functions

Status: CURRENT — LIVE VERIFIED AND SOURCE RETRIEVED 2026-09-15

Exact deployed v1 sources were retrieved into `supabase/functions/<slug>/index.ts`.

| Function | Live `verify_jwt` | Contract |
|---|---:|---|
| `storage-emergency-cleanup` | true | additionally verifies an actual user, runs storage quota RPCs, deletes selected objects, updates metadata |
| `username-login` | false | validates normalized username/password, resolves username with trusted client, signs in with public client, returns session tokens |
| `activity-log` | false | custom optional bearer verification; only two named auth-failure events may be anonymous; writes `usage_events` and private log mirror |
| `feedback-submit` | true | re-verifies bearer, writes feedback row and private text mirror |
| `username-availability` | false | public normalized validation/availability response |
| `media-retention-cleanup` | false | accepts only Vault-held retention secret; descriptor-presence check precedes deletion |

Repository `supabase/config.toml` records the same JWT settings. Secret values are environment/Vault-managed and are not documented.

The reconciliation hardens secret-like property filtering in the checked-in `activity-log` and feedback context source without changing endpoint/auth behavior. Deployment status is recorded in the sync report.
