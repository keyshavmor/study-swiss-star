# Per-user combined 50 MB quota — CURRENT SUPABASE

Live migration: `add_per_user_combined_50mb_quota` (production project, verified
2026-09-16). The SQL is owned by the production project. This document IS the repository
record of that live contract; no repository migration re-applies it (the
`supabase/migrations/` folder is managed and must not be hand-edited).

## Numbers

| Value | Bytes | Shown as |
| --- | --- | --- |
| Limit | 52 428 800 | 50 MB |
| Warning threshold (90 %) | 47 185 920 | 90 % |

## RPCs

| RPC | Args | Returns |
| --- | --- | --- |
| `get_my_quota_status()` | none | ONE JSON object: `database_bytes`, `storage_bytes`, `total_bytes`, `limit_bytes`, `warning_threshold_bytes`, `remaining_bytes`, `usage_fraction`, `warning`, `at_limit` |
| `can_allocate_my_quota(p_additional_bytes bigint)` | planned write size | `boolean` |

Both run under the caller's own session; RLS keeps them per-user. No
service-role key is involved anywhere in this path.

## Enforcement surfaces

1. **Database trigger** — hard-guards inserts/updates on user-owned public
   tables and raises `user_data_quota_exceeded`.
2. **Storage policies** — user-writable buckets run the same preflight.
3. **Frontend preflight** — `preflightQuota(bytes)` before sizable writes so the
   user gets a friendly message instead of only a database/RLS error.

The server is always authoritative: a passing preflight is permission to TRY,
never a guarantee, and a failing preflight never blocks the attempt.

## Frontend implementation (CURRENT FRONTEND)

- `frontend/src/lib/user-quota.ts` — typed client: `fetchMyQuotaStatus`,
  `canAllocateBytes`, `preflightQuota`, `isQuotaExceededError`, `quotaPercent`,
  `normaliseQuotaStatus` (derives missing fields, never invents usage).
- `frontend/src/components/app/UserQuotaCard.tsx` — Settings surface: combined
  usage, 50 MB allowance, remaining allowance, progress indicator, split of
  study data vs files, warning at ≥ 90 %, "allowance full" copy at 100 %.
- Upload paths with preflight: avatar upload (`lib/account-data.ts`) and
  assistant attachments (`lib/assistant-data.ts`). Both map the server
  rejection through `isQuotaExceededError` to the localized
  `quota.exceededError` message.
- Browser storage-quota APIs are never used to approximate usage.
- Ownerless system assets are not user data: they are neither counted nor
  deleted by anything in this path.

## Tests

`frontend/src/lib/user-quota.test.ts` covers 89.9 % (no warning), exactly 90 %
(warning), 100 % (at limit, zero remaining), derived fields, the two RPC call
shapes, preflight-unavailable behaviour and `user_data_quota_exceeded` mapping.
