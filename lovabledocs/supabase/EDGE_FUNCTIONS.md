# Edge Functions

Status: CURRENT — LIVE VERIFIED AND SOURCE RETRIEVED 2026-09-20

| Function | Version | Live `verify_jwt` | Contract |
|---|---:|---:|---|
| `storage-emergency-cleanup` | 2 | false | Vault scheduler secret or verified user; global leased 90%→80% cleanup |
| `username-login` | 4 | false | bounded normalized username/password, generic credential result, no-store response |
| `activity-log` | 4 | false | optional bearer; strict anonymous event allowlist; rejects content/secret/identity fields |
| `feedback-submit` | 3 | true | bearer re-verification, sanitized context, storage-first persistence and compensating delete |
| `username-availability` | 1 | false | public bounded normalized exact-availability response |
| `media-retention-cleanup` | 2 | false | scheduler secret; owner path plus descriptor-before-delete checks |
| `delete-my-data` | 1 | true | bearer re-verification; caller-bound range/content/account deletion |

The retrieved live sources are represented in `supabase/functions/<slug>/index.ts`;
`config.toml` records the gateway settings. This repository update is local only
and did not deploy any function.

A gateway setting of `verify_jwt=false` is not authorization. Each such function
has a deliberately public/pre-auth shape or performs its own bearer/secret check.
Wildcard CORS is the observed live contract and is not a security boundary;
before deployment replace it with a reviewed environment origin allowlist that
includes required loopback frontend origins. Public pre-auth functions require
platform/gateway rate limits in addition to their bounded, non-enumerating
responses. Secrets remain environment/Vault-managed and never appear in docs or
browser configuration.
