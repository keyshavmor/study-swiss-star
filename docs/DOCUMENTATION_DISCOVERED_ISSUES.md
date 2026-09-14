# Documentation-discovered issues

```
Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466
```

Issues found while reconstructing the architecture documentation. **Nothing here was
"fixed" during the documentation pass** — each item is recorded for a later owner so
that product behaviour is not changed silently. Status labels follow
`docs/README_ARCHITECTURE.md`.

---

## 1. Sandbox/preview Supabase project diverges from production

- **Observed code behaviour:** `frontend/src/lib/account-data.ts` queries
  `public.profiles` with `.eq("user_id", userId)`, and
  `frontend/src/integrations/supabase/types.ts` types `profiles` with a `user_id`
  column and no `id`.
- **Observed Supabase behaviour:** the Supabase project reachable from the Lovable
  sandbox (a *different* project from production `ucacmeadsufiedxrgqit`) has
  `public.profiles` with an `id` primary key and the RLS policy
  `id = auth.uid()`. It also lacks `feedback`, `usage_events`,
  `media_retention_queue`, `documents` and `document_chunks`.
- **Conflicting documentation:** none any more — but it means production schema,
  RLS and buckets could not be machine-verified in this pass. All such claims in
  `docs/supabase/*` are labelled *declared from frontend types and migration
  sources; not machine-verified this pass*.
- **Backend implication:** Codex must verify the live production schema directly
  before relying on column names, and must not trust the preview project.
- **Recommended owner/action:** project owner — re-run a schema/RLS/bucket dump
  against `ucacmeadsufiedxrgqit` and attach it to `docs/supabase/SUPABASE_CURRENT_STATE.md`.

## 2. `X-Student-Id` is the only identity the local backend receives

- **Observed code behaviour:** `frontend/src/routes/api/chat.ts` verifies the
  Supabase JWT and thread ownership, then
  `frontend/src/lib/context-backend.server.ts` forwards only
  `X-Student-Id: <auth.uid()>` to `POST http://127.0.0.1:8001/api/chat`.
- **Backend implication:** that header is *context*, not an authorization
  boundary. If the local backend is ever reachable by anything other than the
  trusted server route, it must verify a Supabase JWT itself.
- **Recommended owner/action:** Codex backend pass — see
  `docs/contracts/FRONTEND_BACKEND_CONTRACT.md` and
  `docs/backend-handoff/OPEN_BACKEND_QUESTIONS.md`.

## 3. `documents` / `document_chunks` have deployment-dependent column names

- **Observed code behaviour:** `frontend/src/lib/storage-management.ts` reads
  these tables defensively (`object_path` | `storage_path` |
  `storage_object_path`; `status` | `parse_status`; `file_name` | `title` |
  `name`) and `types.ts` types them with an index signature.
- **Backend implication:** the ingestion contract has no agreed column names, so
  study-material metadata cannot be reliably joined.
- **Recommended owner/action:** Codex backend pass — freeze one schema and
  regenerate `types.ts`.

## 4. Old docs described a Lovable AI Gateway fallback that does not exist

- **Observed code behaviour:** `frontend/src/routes/api/chat.ts` has **no**
  gateway fallback. A local-backend failure returns the backend's status (503 by
  default).
- **Conflicting documentation:** `docs/wireframes/01-system-overview.mmd`,
  `docs/wireframes/09-chat.mmd` and `docs/FULL_APP_WIREFRAMES.md` (pre-pass
  versions) showed an opt-in gateway fallback. Corrected in this pass.
- **Recommended owner/action:** none; documentation corrected.

## 5. Demo-mode remnants after the feature was removed

- **Observed code behaviour:** the demo toggle and `DemoMode.tsx` are gone, but
  `frontend/src/lib/store/demo-data.ts` still exists (imported by nothing) and
  `frontend/src/lib/i18n/messages/school.ts` still ships `school.demoModeNote`
  keys in all seven languages.
- **Backend implication:** none.
- **Recommended owner/action:** frontend owner — delete the unused module and the
  orphan keys in a normal code pass (left untouched here because this was a
  documentation task).

## 6. Grades, assessments, planner events and materials are browser-local

- **Observed code behaviour:** `frontend/src/lib/store/app-data.tsx` persists all
  of it to `localStorage` under `asa.data.v2`, seeded from
  `frontend/src/lib/mock/*` (which contains hard-coded exam dates such as
  "22 September").
- **Observed Supabase behaviour:** no tables back these features.
- **Backend implication:** any backend study-plan, grading or statistics feature
  currently has **no server-side source** for grades or planner data; it would
  have to be sent by the client or migrated to Postgres first.
- **Recommended owner/action:** product owner + Codex — decide whether these
  migrate to Supabase before backend study tools are built.

## 7. Media retention is a contract without a producer

- **Observed code behaviour:** `frontend/src/lib/media-retention.ts` can enqueue
  rows and never generates descriptors client-side; nothing in the app calls
  `enqueueAssistantMedia()` today because the local backend produces no media.
- **Backend implication:** descriptor generation, descriptor upload, the
  30-minute cleanup worker and descriptor-based retrieval are all
  BACKEND TODO FOR CODEX. Safety rule: **no descriptor ⇒ never delete the binary.**
- **Recommended owner/action:** Codex backend pass.

## 8. `usage_events.user_id` is nullable

- **Observed code behaviour/types:** telemetry can be written without a user id
  (pre-auth events), so per-user analytics must tolerate nulls, and RLS cannot
  scope those rows to a user.
- **Recommended owner/action:** project owner — confirm this is intentional and
  document the admin-only read path.

## 9. General Assistant has no generator

- **Observed code behaviour:** `frontend/src/components/assistant/AssistantChat.tsx`
  persists user messages and attachments and explicitly does **not** fabricate a
  reply; `assistant_attachments.parse_status` stays `unparsed`.
- **Backend implication:** the Assistant is a stored-conversation UI until the
  backend implements generation and attachment parsing.
- **Recommended owner/action:** Codex backend pass.

## 10. Duplicate Supabase integration folder at the repository root

- **Observed code behaviour:** `src/integrations/supabase/*` exists alongside the
  real app at `frontend/src/integrations/supabase/*`. The frontend `@/*` alias
  resolves to `frontend/src/*`, so the root copy is unused by the app but is
  regenerated by tooling and can mislead readers.
- **Recommended owner/action:** platform/frontend owner — leave in place (it is
  tool-managed) but do not treat it as app code.

## 11. `responseLanguageHint` never leaves the browser

- **Observed code behaviour:** `frontend/src/lib/i18n/detect.ts` computes the
  effective response language per user message and `StudyChat.tsx` keys it to the
  message id, but neither `/api/chat` nor the Python request body carries it.
- **Observed Supabase behaviour:** `user_preferences.preferences.assistant_reply_language_policy`
  defaults to `message_then_app`.
- **Backend implication:** the policy is declared and stored but unenforced end to
  end. FRONTEND + SUPABASE CONTRACT READY / LOCAL BACKEND IMPLEMENTATION REQUIRED.
- **Recommended owner/action:** Codex backend pass, then a small frontend change
  to send the field once the backend accepts it.

## 12. `durationLabel` in `frontend/src/lib/date-utils.ts` is not localised

- **Observed code behaviour:** it renders a hard-coded English duration string
  while every other date/time helper goes through `frontend/src/lib/i18n/format.ts`.
- **Recommended owner/action:** frontend owner — localise in a later UI pass.
