# Supabase cutover runbook

## Responsibility split

- **Lovable:** React/TanStack UI generation, Vite tooling, preview/editor integration, and Git sync.
- **Supabase `ucacmeadsufiedxrgqit`:** Auth, Postgres, RLS, Storage, and all durable private state.
- **Local FastAPI/Qwen:** parsing, chunking, embeddings, retrieval, reranking, token budgeting,
  context compilation, memory extraction, grading/generation logic, llama.cpp, and inference.

No provider or model secret belongs in Git. Normal requests use the publishable key plus the user JWT
so RLS is enforced. This implementation does not require a secret/service-role key.

## Audited target state and deployment record

On 2026-09-14 the authenticated Supabase connector confirmed project
`ucacmeadsufiedxrgqit` is the active, healthy `GymmiExamPrep` project at the URL above. The audit
found:

- remote migrations `20260801092601`, `20260801092611`, `20260801092624`,
  `20260914122222`, `20260914123458`, `20260914131010`, and `20260914131340`, all
  reconciled into this repository;
- 23 application tables, all with RLS, four operation-specific ownership policies, and zero rows;
- ownership-safe composite foreign keys for chat, documents, working memory, summaries, quizzes,
  and mock exams;
- an empty, private `user-materials` bucket with a 50 MB limit and seven allowed MIME types;
- `pgcrypto` and `vector` installed under `extensions`;
- no security-advisor findings and no unindexed foreign keys; unused-index INFO notices are expected
  while the tables are empty.

After explicit owner approval, `20260914131010_canonical_user_backend.sql` and the targeted
`20260914131340_cover_composite_foreign_keys.sql` follow-up were applied on 2026-09-14. The live
transactional two-user isolation suite passed and rolled back all temporary rows and users. The
checked-in TypeScript types were regenerated directly from this deployed schema.

For future deployments, use an authenticated current Supabase CLI from the repository root:

```bash
supabase --version
supabase --help
supabase link --help
supabase migration --help
supabase db push --help
supabase gen types --help

supabase link --project-ref ucacmeadsufiedxrgqit
cat supabase/.temp/project-ref
supabase migration list
supabase db dump --linked --schema public,storage --file /tmp/alim-target-before.sql
supabase db push --dry-run
```

Confirm the linked ref is exactly `ucacmeadsufiedxrgqit`. Review remote migration history, schema,
extensions, buckets, and dry-run SQL. If the target contains unrepresented schema or data, stop and
reconcile it with a non-destructive pull/review workflow. Never run `supabase db reset --linked`.

Confirm the linked ref and audited remote migration versions exactly match the list above. After
reviewing the dry run, apply only genuinely pending forward migrations:

```bash
supabase db push
supabase test db
supabase gen types typescript --linked --schema public > frontend/src/integrations/supabase/types.ts
```

Run database advisors again after deployment and commit regenerated types with the migration.

## Environment

Copy `frontend/.env.example` and `backend/.env.example` to ignored local files. Required values:

- browser: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- TanStack server: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
- FastAPI: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
- optional OAuth return: `VITE_AUTH_REDIRECT_URL`

The URL is `https://ucacmeadsufiedxrgqit.supabase.co`. Never use secret/service-role keys in any
`VITE_*` value or send them to the browser.

## OAuth and URL configuration

In Supabase **Authentication → URL Configuration**, set the production site URL and add the intended
redirects: `http://localhost:8080`, production, and each supported Lovable preview URL. OAuth defaults
to the current origin; `VITE_AUTH_REDIRECT_URL` may pin it.

The callback for every provider is:
`https://ucacmeadsufiedxrgqit.supabase.co/auth/v1/callback`

### Google

1. Create a Web OAuth client in Google Cloud.
2. Add intentional application origins and the callback.
3. Enable Google in Supabase and enter the client ID/secret only in the dashboard.
4. Test sign-in, callback, refresh, sign-out, and account switching.

### Apple

1. Configure Sign in with Apple and a Services ID in Apple Developer.
2. Register the callback and create the required private-key credentials.
3. Enable Apple in Supabase and enter credentials only in the dashboard.
4. Apple may not provide a full name; collect missing fields in Alim's existing profile form.

### Microsoft

1. Create a Microsoft Entra application and register the callback.
2. Create its client secret and configure Supabase's Azure provider.
3. The frontend uses provider `azure` and requests the `email` scope.
4. Run the same session/account-switch smoke tests.

## Old-project data

Do not delete `uyzefsuiwchxtwojwcve`. Its tokens/users are invalid in the target, so cutover requires
sign-in again. To retain data: export it read-only, create an explicit old-user-to-new-user UUID map
after target accounts exist, transform ownership/foreign keys offline, and import through reviewed SQL
with row counts. Auth password/OAuth identity migration requires a Supabase-supported path or user
re-enrollment; never infer ownership from email alone. Copy Storage objects separately into mapped
target UUID prefixes.

## Verification

The repository suites run without remote credentials. `supabase test db` and live two-user checks
remain pending until the comprehensive migration is explicitly approved and applied. Then manually
use two real target users to verify Postgres and Storage isolation, similarly named private-file
retrieval, all OAuth providers, Lovable preview/build behavior, and local FastAPI/Qwen operation on
ports 8001/8000.
