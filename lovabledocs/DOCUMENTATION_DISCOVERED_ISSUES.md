# Documentation-Discovered Issues

Status: CURRENT — REASSESSED 2026-09-15

| Issue | Status | Evidence / action |
|---|---|---|
| Production Supabase could not be inspected | NOT AN ISSUE AFTER LIVE VERIFICATION | Project, migrations, tables, RLS, buckets, functions, cron, types, and advisors were queried |
| Production lacked domain/context tables | NOT AN ISSUE AFTER LIVE VERIFICATION | 27 RLS-enabled public tables include domain, context, study-tool, and Assistant tables |
| TanStack forwarded only `X-Student-Id` | RESOLVED IN THIS BRANCH | verified bearer token and matching header are both forwarded |
| Response-language hint was frontend-only | RESOLVED IN THIS BRANCH | current message detection > app language > English is sent explicitly to FastAPI; seven languages tested |
| Backend implementation described as unknown | RESOLVED IN THIS BRANCH | architecture/contracts now reference verified FastAPI/context/model sources |
| Assistant backend status unclear | STILL CURRENT | persistence/UI exist; generation and attachment parsing have no sufficiently defined contract |
| Media cleanup described as absent | NOT AN ISSUE AFTER LIVE VERIFICATION | Edge Function and every-minute Vault/cron job are active; descriptor producer remains absent because backend produces no media |
| Retention helper used unsupported `descriptor_ready` status | RESOLVED IN THIS BRANCH | live constraint accepts `pending/ready/processing/deleted/failed`; helper now requires a descriptor path and inserts `ready` |
| Retention queue lacked owner-bound paths/attachment FK | STILL CURRENT UNTIL APPROVAL | live table is empty; helper and pending worker source reject cross-owner paths, while the unapplied migration adds path checks and a composite owner FK |
| Browser-local state conflicts with live domain tables | NOT AN ISSUE AFTER LIVE VERIFICATION | table existence does not change `asa.data.v2` ownership |
| Materials metadata implied indexing | RESOLVED IN DOCUMENTATION | backend ingestion exists but current Materials UI is not wired; metadata does not claim indexed state |
| Supabase migration sources are incomplete/duplicated | STILL CURRENT | exact Supabase SQL exists through `20260914131340`; later applied SQL is partly Drizzle/external and is documented without fabricated history |
| Generated frontend Supabase types were partial | RESOLVED IN THIS BRANCH | regenerated directly from project `ucacmeadsufiedxrgqit` |
| Edge Function source was absent | RESOLVED IN THIS BRANCH | deployed v1 sources retrieved into `supabase/functions/` |
| Edge telemetry sanitizer was narrower than browser policy | STILL CURRENT UNTIL DEPLOYMENT | checked-in source hardened; live version must be redeployed/re-fetched to verify |
| Excessive Data API grants and four uncovered foreign keys | STILL CURRENT UNTIL APPROVAL | reviewed forward migration is checked in but production application was blocked due blast radius |
| Security advisor flags storage-usage RPC definer rights | ACCEPTED — INTENTIONAL | fixed empty search path, authenticated-only ACL, `auth.uid()` guard, and aggregate-only output reviewed |
| Frontend runtime/gates unavailable in this environment | RESOLVED | standalone Bun 1.4.2 in `/tmp` ran tests, typecheck, lint, translations, formatting, and production build |
| Authenticated two-user live RLS CRUD not executed | DEFERRED — EXPLICIT REASON | no disposable test users/tokens supplied; catalog policies and static RLS tests were inspected |
| Remaining i18n/date defects | NOT FOUND BY AUTOMATED GATES | all locale modules have 822 keys, Swiss German has no `ß`, and seven-language detection/fallback tests pass |
