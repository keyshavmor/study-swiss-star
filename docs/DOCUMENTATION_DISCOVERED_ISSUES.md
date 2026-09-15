# Documentation-discovered issues

```
Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
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
- **CURRENT FRONTEND (resolved 2026-09-15):** the sandbox process environment
  injected the preview project's `VITE_SUPABASE_*` / `SUPABASE_*` values, which
  override `frontend/.env`, so the running app queried the preview schema and
  `/onboarding/compliance` failed with PostgREST `PGRST205 … account_compliance`.
  `frontend/vite.config.ts` now pins the canonical production project URL,
  project id and *publishable* key via `vite.define` for both `import.meta.env`
  and the server-side `process.env` reads. Only public values are inlined.
- **BACKEND TODO FOR CODEX / owner:** `process.env['SUPABASE_SERVICE_ROLE_KEY']`
  is still whatever the host injects and is NOT pinned; any privileged
  server-side path must be given the canonical project's service key by the
  deployment environment before it is used.


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


## Added this pass — authenticated startup flow

Signed out → `/` → `/onboarding/language` (once, CURRENT SUPABASE flag
`language_onboarding_completed`) → `/onboarding/model` (every new browser session, CURRENT
FRONTEND sessionStorage gate `alim.ai_session.v1`) → `/home`. Guard: `_authenticated/route.tsx`.
Model preparation backend (`/api/model/prepare`, `/api/model/operation`) is EXPECTED LOCAL BACKEND
CONTRACT / BACKEND TODO FOR CODEX. Resource policy: 50/50/50 admission, 30/25/30 runtime floors —
CURRENT SUPABASE `get_ai_runtime_policy()`. Model catalog: CURRENT SUPABASE `ai_model_catalog`
(10 Qwen entries), hard-coded list is fallback only. The per-user `auto_storage_cleanup`
preference is REMOVED; storage cleanup is now the platform-wide 5-minute cron job described in
`docs/supabase/STORAGE_LIFECYCLES.md`. See `docs/sequences/POST_LOGIN_STARTUP.mmd`,
`LANGUAGE_ONBOARDING.mmd`, `MODEL_SELECTION_READINESS.mmd`, `MODEL_CACHED_SHARED_DOWNLOAD.mmd`,
`RESOURCE_BLOCKED_NON_AI.mmd`, `SETTINGS_MODEL_RETRY.mmd`, `MODEL_DOWNLOAD_DEDUPLICATION.mmd`,
`AI_SESSION_STATE_MACHINE.mmd`, `STORAGE_CAPACITY_CLEANUP.mmd`.

## Compliance, system admission, safety & peer messaging (this pass)

**Startup order (CURRENT FRONTEND / CURRENT SUPABASE):** signed out → sign in/up →
`/onboarding/compliance` (gated on CURRENT SUPABASE flag
`account_compliance.compliance_onboarding_completed`, RPC
`complete_account_compliance_onboarding`) → `/onboarding/language` → SYSTEM ADMISSION gate
(`/onboarding/system-admission`, every new browser session, sessionStorage lease
`alim.admission_session.v1`, FAILS CLOSED — EXPECTED LOCAL BACKEND CONTRACT) → model readiness gate
(`alim.ai_session.v1`) → `/home`. `account_compliance.account_status = 'suspended_pending_review'`
outranks every other route and redirects to `/account/suspended`. New legal routes:
`/legal/terms`, `/legal/privacy`, `/legal/acceptable-use`, `/legal/child-safety`. See
`sequences/SIGNUP_ROLE_GUARDIAN_CONSENT.mmd`,
`sequences/STARTUP_COMPLIANCE_LANGUAGE_ADMISSION_MODEL_HOME.mmd`.

**System admission (EXPECTED LOCAL BACKEND CONTRACT, policy is CURRENT SUPABASE via
`get_system_admission_policy()`):** max 10 admitted users; login requires ≥50% free GPU/RAM/local
disk; automatic model rebalancing preserves in-flight requests and queues new allocations; health
informs model recommendation. Effective utilisation ceiling reconciles the earlier free-floor
policy (GPU≥30% free, RAM≥25% free, storage≥30% free) with the new 75%-used ceiling as an
ADDITIONAL cap: effective max used = GPU 70%, RAM 75%, storage 70%. See
`sequences/ADMISSION_MAX10_LOGIN50_RULE.mmd`, `sequences/EFFECTIVE_CAPS_75_VS_30_25_30_FLOORS.mmd`,
`sequences/MODEL_LOAD_BALANCING_LIGHTER_ASSIGNMENT.mmd`,
`sequences/INFLIGHT_PRESERVE_NEWCOMER_QUEUE_SAFE_REBALANCE.mmd`,
`sequences/SYSTEM_HEALTH_AGGREGATION.mmd`. New route: `/system-health`.

**Content safety (EXPECTED LOCAL BACKEND CONTRACT; queue/strike tables are CURRENT SUPABASE):**
verdicts `allow | block_warning | block_suspend_pending_review | safety_unavailable | scanning`.
First CONFIRMED violation blocks content and records a warning; second CONFIRMED violation sets
`suspended_pending_review` and, for students, queues a `guardian_notification_queue` item for
HUMAN review only — no automatic permanent deletion, no guardian disclosure from an unreviewed AI
classification. `apply_confirmed_safety_strike(...)` is service-role only, never callable from the
browser. Age-appropriate curriculum discussion of history/war/medicine/sexual health is explicitly
allowed; explicit/graphic/instructional/glorifying content unsuitable for minors is blocked. See
`sequences/FIRST_SAFETY_STRIKE.mmd`, `sequences/SECOND_STRIKE_SUSPENSION_GUARDIAN_REVIEW.mmd`.

**Peer messaging (CURRENT SUPABASE reads; sends are EXPECTED LOCAL BACKEND CONTRACT):** exact
username discovery only (`find_peer_by_exact_username`, no directory);
`get_or_create_direct_peer_conversation`, `mark_peer_conversation_read`; tables
`peer_conversations`, `peer_conversation_members`, `peer_messages`, `peer_message_attachments`,
`peer_message_notifications`, all RLS-scoped by membership. Direct client writes to messages and
attachments are intentionally disabled — only the local backend, after an `allow` verdict, may
persist them via `sendPeerMessage`. Attachments: private bucket `peer-message-attachments`, hard
250000-byte limit, PDF/DOC/DOCX/JPEG/PNG/WEBP allow-list, client-side compression ladder before
upload, no authenticated direct upload. New preferences: `peer_message_notifications` (default
true), `browser_message_notifications` (default false). New routes: `/messages`,
`/messages/$conversationId`. See `sequences/PEER_CHAT_CREATION_BY_USERNAME.mmd`,
`sequences/PEER_MESSAGE_MODERATION_SEND_NOTIFY.mmd`,
`sequences/ATTACHMENT_COMPRESS_SCAN_STORE.mmd`,
`sequences/OFFLINE_MESSAGE_NEXT_LOGIN_UNREAD.mmd`,
`sequences/MESSAGING_STORAGE_RLS_BOUNDARIES.mmd`.

**Endpoints (EXPECTED LOCAL BACKEND CONTRACT, centralised in
`frontend/src/lib/local-backend-endpoints.ts`):** `/api/model/*`,
`/api/system/admission/check`, `/api/system/health`, `/api/system/session/heartbeat`,
`/api/system/runtime/release`, `/api/system/model/recommendation`, `/api/safety/moderate`,
`/api/peer-messaging/send`, `/api/safety/attachment-scan`. The browser never talks to the local
backend directly: a TanStack server function forwards the caller's already-verified Supabase
bearer JWT server-to-server; `X-Student-Id` is context/cross-check only, never an authorization
boundary; no service-role key is used anywhere in this path.

**Sign-out (CURRENT FRONTEND; sweeper is BACKEND TODO FOR CODEX):** best-effort runtime release
call while the token is still valid, then Supabase `signOut()`, then clearing the AI session,
admission lease, Google token, transient messaging state and object URLs. A heartbeat/lease-TTL
sweeper that reclaims an abandoned session's model process/VRAM, session CPU/context RAM and
temporary local artifacts when the browser closes mid-flight is **not implemented** anywhere in
this repository. See `sequences/RELEASE_MY_MODEL.mmd`,
`sequences/SIGNOUT_RUNTIME_RELEASE_LEASE_TTL_FALLBACK.mmd`.

**Data rights (CURRENT SUPABASE):** `get_user_visible_supabase_health()` (unsupported quotas
reported as `not_exposed_by_sql`, never invented), `get_my_data_summary()`, and the JWT-protected
Edge Function `delete-my-data` (`range | all_content | delete_account`, Storage objects deleted
before DB rows, caller-only, no target-user-id parameter accepted). See
`sequences/DELETE_MY_DATA_RANGE.mmd`, `sequences/DELETE_MY_DATA_ALL_CONTENT_KEEP_ACCOUNT.mmd`,
`sequences/DELETE_ACCOUNT.mmd`, `sequences/GDPR_PRIVACY_DATA_MAP_RIGHTS_WORKFLOW.mmd`.

**LEGAL REVIEW REQUIRED BEFORE PRODUCTION:** see `legal/LEGAL_REVIEW_REQUIRED.md`. This pass makes
no claim of GDPR or any other regulatory certification; lawful basis, DPAs, records of processing,
breach procedures, jurisdictional guardian-consent rules and cookie/ePrivacy analysis are
organisational decisions outside what frontend code can establish.

## 2026-09-15 — live-schema mismatch corrective pass (Lovable-managed frontend only)

Verified against production Supabase project `ucacmeadsufiedxrgqit` on 2026-09-15. These edits
exist in the Lovable-managed project state only; no claim is made that they are on any GitHub
branch, and no backend/Python code was touched.

| # | Stale assumption (before) | Live truth (now consumed) |
| - | - | - |
| 1 | `peer_conversations.last_message_at`, `kind` | Columns do not exist. Lists sort by `updated_at`; type is `conversation_type`. |
| 2 | `peer_messages.sender_id`, `safety_verdict` | Live columns are `sender_user_id`, `moderation_status`, `moderation_event_id`. |
| 3 | `peer_message_attachments.owner_id`, `scan_status` | Live column is `owner_user_id`; there is no `scan_status` — pending state derives from the parent message's `moderation_status`. |
| 4 | `get_or_create_direct_peer_conversation` returns a string | Returns a ROW SET (`conversation_id, peer_user_id, peer_username, peer_preferred_name`); the frontend extracts `conversation_id` and caches the peer label. |
| 5 | `mark_peer_conversation_read` returns an id | Returns `void`. |
| 6 | Flat health columns (`object_storage_used_bytes`, …) | `get_user_visible_supabase_health()` returns one JSON object with nested `object_storage`, `database`, `bandwidth`, `realtime`, `edge_functions` groups. Missing keys render "Not exposed", never `0`. |
| 7 | Ad-hoc data-summary counts | `get_my_data_summary()` returns exactly `peer_messages, peer_attachments, peer_attachment_bytes, assistant_messages, assistant_attachments, assistant_attachment_bytes, study_chat_messages, documents, document_bytes, planner_events, feedback_items`. |
| 8 | `user_legal_consents.document_kind` | Live columns: `document_type, document_version, accepted_at, withdrawn_at, consent_source, created_at`. |
| 9 | `complete_account_compliance_onboarding` returns void/text | Returns JSONB. |
| 10 | Raw provider `error.message` shown in auth UI | `frontend/src/lib/auth-errors.ts` maps stable Supabase `code`/HTTP status to localized copy in all seven languages; raw messages are never displayed. Username login stays generic and never reveals the account email. |
| 11 | Signup assumed an immediate session | Signup inspects `data.session`: session → `resolveStartupDestination()`; no session → localized confirm-email state, back to sign-in. |
| 12 | `/auth/update-password` assumed a valid link and `/home` | Requires a recovery/auth session, shows a localized invalid/expired-link state otherwise, and after update invalidates startup state and routes via `resolveStartupDestination()`. |
| 13 | Signed-out telemetry could call `activity-log` for any event | Only the six whitelisted anonymous pre-session auth events are sent; identifiers, credentials, tokens and raw form values are stripped. |

Production migration `harden_auth_peer_rpcs_and_signup_defaults` is live: the auth trigger creates
username, default preferences and an empty `account_compliance` row, and signup role/DOB/guardian
values remain auth-metadata prefills until validated on `/onboarding/compliance` (legal checkboxes
are never auto-accepted).

**NOT VERIFIABLE FROM HERE:** external Supabase Auth dashboard settings — email confirmation
on/off, redirect/site URL allow-list, password minimum length and leaked-password protection,
rate-limit values, SMTP sender, and OAuth provider client credentials. These must be confirmed by a
human with project console access.

## 2026-09-15 — final targeted corrective audit (Lovable-managed frontend only)

Verified again against production Supabase project `ucacmeadsufiedxrgqit` on 2026-09-15. Lovable
project state only; no GitHub-branch claim, no backend/Python change.

| # | Stale assumption (before) | Live truth (now consumed) |
| - | - | - |
| 14 | `LegalDocumentType` included `child_safety` | `user_legal_consents_document_type_check` allows EXACTLY `terms`, `privacy`, `acceptable_use`, `safety_notice`, and the live RPC inserts `safety_notice`. `LEGAL_VERSIONS.safety_notice` now carries the version; the user-facing `/legal/child-safety` page keeps its title. |
| 15 | Attachment pending unless `moderation_status` was `allowed`/`clean` | Peer RLS exposes rows only when `moderation_status = 'approved'`, so every visible production message was wrongly stuck pending. `isAttachmentPending()` now treats `approved` as the openable state and invents no further states. |
| 16 | `peer_conversations.created_by` typed `string` | The live column is NULLABLE → `string \| null`. |
| 17 | `username-login` failure assumed HTTP 401 | v2 returns HTTP 200 payloads: `{ok:true, access_token, refresh_token, expires_in, token_type}`, `{ok:false, error_code:"invalid_credentials"}`, `{ok:false, error_code:"authentication_unavailable"}`. Invalid credentials show the generic username/password message; unavailability shows a generic service error. This removes the 401/blank-screen failure for an ordinary typo. |
| 18 | Any signup `unexpected_failure`/HTTP 500 mapped to `auth.usernameTaken` | Blanket mapping removed: a 500 can be an outage. The exact username is re-checked via `username-availability` and only `available:false` shows "username taken"; otherwise a generic localized error. Raw `error.message` is never inspected. |
| 19 | Every HTTP 400/403/422 mapped to invalid credentials / account-in-use | Only stable codes decide copy. `identity_already_exists` → account-in-use; `validation_failed` / `unexpected_failure` → generic; 401 → invalid credentials; 429 → rate limited; 400/403/422 without a recognised code → generic. |

| 20 | Any `session.provider_token` captured as the Google Calendar token | GitHub / LinkedIn / Spotify sessions also carry a `provider_token`. Capture now requires the `alim.google-calendar.connect-pending` marker (set just before `linkIdentity`) or a `google=connected` callback; unattributed tokens and plain session refreshes are ignored. The marker is cleared on capture, disconnect and terminal connect failure. |
| 21 | Feedback success decided by `fnError` alone | `feedback-submit` reports `ok`, `database_recorded`, `storage_recorded`. The form is only cleared on all-true; a partial 2xx (e.g. 207) keeps the text and shows `feedback.error.partial`. |
| 22 | `user_legal_consents.consent_source` typed nullable | The live column is NOT NULL with a default → `string`. |
| 23 | Signup `unexpected_failure`/500 special case | Removed entirely; the availability preflight owns the duplicate case and everything else uses the generic safe mapper. |
| 24 | External Auth-console configuration undocumented | `docs/supabase/AUTHENTICATION.md` now lists the manual, unverifiable items: Site URL and redirect allow-list, email-confirmation setting, SMTP, password policy / leaked-password protection, rate limits, and OAuth client credentials / provider enablement. |

### Production security state (2026-09-15)

In addition to `harden_auth_peer_rpcs_and_signup_defaults`, these migrations are live:

- `move_peer_authorization_helpers_private` — public peer authorization helper RPCs moved to a
  private schema; peer RLS/storage policies and peer RPCs now call the private helpers, and the
  public helper functions were dropped.
- `optimize_compliance_admin_rls` — own/admin SELECT policies combined and `(select auth.jwt())`
  used; the previous `auth_rls_initplan` and multiple-permissive-policy performance warnings are
  gone.

**Security Advisor is NOT claimed to be at zero warnings.** It still reports the intentionally
callable signed-in `SECURITY DEFINER` application RPCs. There is NO anon `SECURITY DEFINER` warning
any more.
