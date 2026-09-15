# Documentation-Discovered Issues

Status: CURRENT — REASSESSED 2026-09-15

| Issue | Status | Evidence / action |
|---|---|---|
| Production Supabase could not be inspected | NOT AN ISSUE AFTER LIVE VERIFICATION | Project, migrations, tables, RLS, buckets, functions, cron, types, and advisors were queried |
| Production lacked domain/context tables | NOT AN ISSUE AFTER LIVE VERIFICATION | 28 RLS-enabled public tables include domain, context, study-tool, Assistant, and model-catalog tables |
| TanStack forwarded only `X-Student-Id` | RESOLVED IN THIS BRANCH | verified bearer token and matching header are both forwarded |
| Response-language hint was frontend-only | RESOLVED IN THIS BRANCH | current message detection > app language > English is sent explicitly to FastAPI; seven languages tested |
| Backend implementation described as unknown | RESOLVED IN THIS BRANCH | architecture/contracts now reference verified FastAPI/context/model sources |
| Assistant backend status unclear | STILL CURRENT | persistence/UI exist; generation and attachment parsing have no sufficiently defined contract |
| Media cleanup described as absent | NOT AN ISSUE AFTER LIVE VERIFICATION | Edge Function and every-minute Vault/cron job are active; descriptor producer remains absent because backend produces no media |
| Retention helper used unsupported `descriptor_ready` status | RESOLVED IN THIS BRANCH | live constraint accepts `pending/ready/processing/deleted/failed`; helper now requires a descriptor path and inserts `ready` |
| Retention queue lacked owner-bound paths/attachment FK | RESOLVED IN PRODUCTION | migration `20260915105026` added path checks and composite ownership; the v2 worker also rejects mismatches |
| Browser-local state conflicts with live domain tables | NOT AN ISSUE AFTER LIVE VERIFICATION | table existence does not change `asa.data.v2` ownership |
| Materials metadata implied indexing | RESOLVED IN DOCUMENTATION | backend ingestion exists but current Materials UI is not wired; metadata does not claim indexed state |
| Supabase migration sources are incomplete/duplicated | STILL CURRENT | exact Supabase SQL exists through `20260914131340`; later applied SQL is partly Drizzle/external and is documented without fabricated history |
| Generated frontend Supabase types were partial | RESOLVED IN THIS BRANCH | regenerated directly from project `ucacmeadsufiedxrgqit` |
| Edge Function source was absent | RESOLVED IN THIS BRANCH | exact current sources retrieved into `supabase/functions/` |
| Edge telemetry sanitizer was narrower than browser policy | RESOLVED IN PRODUCTION | `activity-log` and `feedback-submit` v2 deployed and re-fetched with exact source parity |
| Excessive Data API grants and four uncovered foreign keys | RESOLVED IN PRODUCTION | migrations `20260915105026` and `20260915105236` reduced grants and cleared all unindexed-FK findings |
| Security advisor flags privileged read-only RPCs | ACCEPTED — INTENTIONAL | both storage-usage and AI-runtime-policy RPCs have empty search paths, authenticated-only ACLs, `auth.uid()` guards, and bounded outputs |
| User-facing automatic-cleanup toggle had no server effect | RESOLVED IN THIS BRANCH | concurrent live migration made cleanup global; obsolete preference/UI control removed while manual cleanup remains |
| Concurrent production changes during reconciliation | RESOLVED/DOCUMENTED | four external migrations plus `storage-emergency-cleanup` v2 were re-inspected, preserved, typed, and documented |
| Frontend runtime/gates unavailable in this environment | RESOLVED | standalone Bun 1.4.2 in `/tmp` ran tests, typecheck, lint, translations, formatting, and production build |
| Authenticated two-user live RLS CRUD not executed | DEFERRED — EXPLICIT REASON | no disposable test users/tokens supplied; catalog policies and static RLS tests were inspected |
| Remaining i18n/date defects | NOT FOUND BY AUTOMATED GATES | all locale modules have 822 keys, Swiss German has no `ß`, and seven-language detection/fallback tests pass |
