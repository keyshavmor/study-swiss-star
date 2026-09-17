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


## Authenticated startup flow — CURRENT (2026-09-17)

Signed out → `/` (sign in / sign up; authentication NEVER waits on the local AI
backend) → **`/onboarding/language` — MANDATORY once per browser
session**: select a language (persists `user_preferences.preferences.app_language`
as the durable default) or explicitly skip → **`/onboarding/model` — MANDATORY
once per browser session**: system capability probe, recommendation, model
selection and prepare/poll; the app can be entered only after an explicit backend
`ready` confirmation (AI-ready) or an explicit "Continue without AI" (non-AI) →
`/onboarding/compliance` if compliance onboarding is still required (durable,
once, CURRENT SUPABASE `account_compliance`) → `/home`.

- Session gates: `alim.language_session.v1` and `alim.ai_session.v1`
  (`sessionStorage`). They survive a refresh and are cleared on sign-out.
- `language_onboarding_completed` is LEGACY compatibility metadata only — it is
  NOT a gate. `selected_qwen_model` is a durable PREFERENCE and never means the
  model is ready. Runtime/model/GPU readiness is never stored in Supabase.
- Route order is enforced: opening `/onboarding/model` by hand with no language
  decision redirects to `/onboarding/language`, and product routes stay blocked
  until both decisions exist (`startupRedirectFor`, `_authenticated/route.tsx`).
- There is NO mandatory system-admission screen between language and model;
  capability, admission and recommendation data are shown on the model screen.
  `/onboarding/system-admission` remains an optional diagnostics surface.
- Model preparation (`/api/system/capability`, `/api/model/prepare`,
  `/api/model/operation`, `/api/system/runtime/release`) is REQUIRED FUTURE BACKEND
  (BACKEND TODO FOR CODEX). Unreachable / 404 / timeout / unparsable ⇒
  `backend_unavailable`, shown truthfully; no values are fabricated.
- Resource policy: 50/50/50 admission, 30/25/30 runtime floors — CURRENT SUPABASE
  `get_ai_runtime_policy()`. Model catalogue: CURRENT SUPABASE `ai_model_catalog`,
  hard-coded list is fallback only.
- AI-dependent actions (chat, quiz/exam generation, grading) are centrally guarded
  (`AiFeatureGate` / `useAiBlocked`): without an AI-ready session no request is
  issued and one localized red notice offers retry model setup, Settings, or
  continuing with non-AI features. Non-AI features stay fully usable.
- The per-user `auto_storage_cleanup` preference is REMOVED; cleanup is the
  platform-wide 5-minute cron in `docs/supabase/STORAGE_LIFECYCLES.md`.

Canonical: `docs/sequences/POST_LOGIN_STARTUP.mmd`,
`docs/sequences/LANGUAGE_ONBOARDING.mmd`,
`docs/backend-handoff/POST_LOGIN_LANGUAGE_MODEL_GATE_HANDOFF.md`.

## Compliance, safety & peer messaging

**Startup order (CURRENT FRONTEND / CURRENT SUPABASE, 2026-09-17):** signed out →
sign in/up → `/onboarding/language` (MANDATORY per-session decision) →
`/onboarding/model` (MANDATORY per-session decision: backend-confirmed `ready`,
or explicit continue-without-AI) → `/onboarding/compliance` if still required
(CURRENT SUPABASE flag `account_compliance.compliance_onboarding_completed`, RPC
`complete_account_compliance_onboarding`) → `/home`. The system
admission gate is NOT part of this order any more; its data is shown on the model
screen and `/onboarding/system-admission` is optional. `account_compliance.account_status
= 'suspended_pending_review'` outranks every other route and redirects to
`/account/suspended`. Legal routes: `/legal/terms`, `/legal/privacy`,
`/legal/acceptable-use`, `/legal/child-safety`. See
`sequences/SIGNUP_ROLE_GUARDIAN_CONSENT.mmd`, `sequences/POST_LOGIN_STARTUP.mmd`.

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

### Production security and performance state (2026-09-15)

In addition to `harden_auth_peer_rpcs_and_signup_defaults`, these migrations are live:

- `move_peer_authorization_helpers_private` — public peer authorization helper RPCs moved to a
  private schema; peer RLS/storage policies and peer RPCs now call the private helpers, and the
  public helper functions were dropped.
- `optimize_compliance_admin_rls` — own/admin SELECT policies combined and `(select auth.jwt())`
  used; the previous `auth_rls_initplan` and multiple-permissive-policy performance warnings are
  gone.
- `cover_peer_and_guardian_foreign_keys` — added covering indexes for seven previously-unindexed
  foreign keys:
  `guardian_notification_queue(student_user_id)`, `peer_conversations(created_by)`,
  `peer_message_attachments(conversation_id)`, `peer_message_attachments(message_id)`,
  `peer_message_notifications(conversation_id)`, `peer_message_notifications(message_id)`,
  `peer_messages(moderation_event_id)`.

**Security Advisor — SUPERSEDED 2026-09-17.** The statement above (intentional signed-in
`SECURITY DEFINER` application-RPC warnings remaining) was superseded by the external live
hardening recorded in "2026-09-17 — external live security hardening (CURRENT)" below: the
Security Advisor no longer reports any public `SECURITY DEFINER` executable warnings. Only the
two project-level Auth advisories (leaked-password protection, insufficient MFA options) remain,
and those are Supabase Auth project settings, not database/frontend settings.

**Performance Advisor state.** The Supabase Performance Advisor now reports **ZERO
`unindexed_foreign_keys` findings** — the `cover_peer_and_guardian_foreign_keys` migration above
resolved the last of them. It still emits `unused_index` INFO findings, including the brand-new
FK-covering indexes above, purely because they have not yet accumulated query usage. These fresh,
required foreign-key-covering indexes must NOT be dropped on the basis of a current `unused_index`
finding; the absence of `unindexed_foreign_keys` warnings depends on them remaining in place.

## HISTORICAL (superseded 2026-09-15, see "CAPTCHA removed" below) — urgent production authentication smoke test

- The frontend build remains pinned to the canonical production project URL and matching public
  key. A direct `@supabase/supabase-js` probe reached that project successfully.
- `username-availability` returned HTTP 200 with `valid:true, available:true` for a fresh random
  username. The v2 `username-login` function returned HTTP 200 with the expected
  `invalid_credentials` payload for the not-created account.
- Both direct `auth.signUp(...)` and `auth.signInWithPassword(...)` returned HTTP 400 with stable
  code `captcha_failed`. This is the reproduced blocker: production Auth requires CAPTCHA, while
  the prior frontend sent no challenge token. The rejected signup did not return a user or session.
- CURRENT FRONTEND repair: email signup, email sign-in and password-reset request now render the
  configured hCaptcha widget, require its one-time token, pass `options.captchaToken`,
  clear it after each attempt and never persist or log it. Missing public widget configuration
  fails closed with localized copy instead of sending a guaranteed-to-fail request.
- MANUAL BLOCKER (updated): hCaptcha is now configured as the provider. Add the separate
  public `VITE_AUTH_CAPTCHA_SITE_KEY` to both environment contexts. Confirm the same
  provider's private secret and allowed app hostnames in the production Auth dashboard. The site
  key is public; the secret must never enter source or a `VITE_*` variable.
- Email confirmation is enabled (`mailer_autoconfirm=false`) in the public production settings, so
  a corrected successful signup intentionally returns no session until the email link is opened.
  Site/redirect allow-list, SMTP, password policy/leaked-password protection, exact rate limits and
  OAuth credentials remain manual dashboard checks.
- Because no production CAPTCHA site key/token is available in this environment, a real account
  could not be created after the repair; therefore email signup/login, username login/setSession,
  trigger-created profile/preferences/compliance rows and final sign-out are **NOT marked PASS**.

## Repository environment wiring corrected (2026-09-15)

(CAPTCHA statements in this section are HISTORICAL; see "CAPTCHA removed" below.)

- CURRENT FRONTEND: the repository-root `.env` still targeted the retired Lovable-managed project
  instead of authoritative production `ucacmeadsufiedxrgqit`. All six Supabase entries
  (`SUPABASE_PROJECT_ID`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and the `VITE_` equivalents)
  now point at production, and `frontend/.env` matches byte-for-byte. Only the public publishable
  key is stored; no secret or service-role key is present in any env file or source file.
- The values agree with the canonical pin in `frontend/vite.config.ts`, so browser and server reads
  resolve to the same production project regardless of which env file the runtime loads.
- Re-ran the real production Auth smoke test after the correction with freshly generated throwaway
  values: `username-availability` returned HTTP 200 (`valid`, `available`), `username-login`
  returned HTTP 200 `{ok:false,error_code:"invalid_credentials"}` for the uncreated account, and
  both `auth.signUp(...)` and `auth.signInWithPassword(...)` still returned HTTP 400
  `captcha_failed`. No account was created.
- CONCLUSION: the env mismatch was a real defect and is fixed, but it was not the cause of the
  password-Auth failure. The remaining blocker is unchanged and manual: production Auth CAPTCHA
  enforcement with no public sitekey available to this environment (hCaptcha provider now confirmed). End-to-end signup and
  sign-in therefore remain **NOT PASS**; a headless script cannot solve a CAPTCHA challenge, so the
  final confirmation must be a browser attempt once `VITE_AUTH_CAPTCHA_PROVIDER` and
  `VITE_AUTH_CAPTCHA_SITE_KEY` are configured to match the production Auth CAPTCHA secret.


## HISTORICAL (superseded 2026-09-15, see "CAPTCHA removed" below) — confirmed hCaptcha provider; public sitekey missing

CURRENT FRONTEND: both environment contexts select `hcaptcha`; canonical production Supabase
public settings are aligned, including the root browser-facing entries which had drifted.
No retired project reference remains in active frontend source or Vite configuration.
The official React hCaptcha widget handles verification, expiration, errors and reset after each
auth attempt. Email login, username-login v3, signup and password reset all require the token.
Raw Auth errors are not logged. Tokens stay in React state and are never persisted or telemetered.

MANUAL BLOCKER: **SITEKEY_MISSING**. Accessible environment/public configuration contains no real
public hCaptcha sitekey. The operator must supply the PUBLIC sitekey, not the secret. The secret
belongs only in Supabase Auth > Bot and Abuse Protection, per the
[official guide](https://supabase.com/docs/guides/auth/auth-captcha).
No production signup, login, session, row-creation or cleanup PASS is claimed this pass; no new
throwaway account was created. Previously observed email confirmation requirements still apply,
but were not independently re-tested in this pass. (Security Advisor state as of that date; superseded by the 2026-09-17 external hardening below.)

## 2026-09-15 — CAPTCHA removed as an authentication dependency (CURRENT)

CURRENT FRONTEND: the operator no longer uses hCaptcha. All CAPTCHA code, UI, tests and
environment configuration are removed:

- No CAPTCHA widget in any auth mode (signup, email sign-in, username sign-in, password reset);
  no `captchaToken`, no `captcha_token`, no `captcha_required` / `captcha_failed` user flow and no
  fail-closed configuration message.
- `AuthCaptcha.tsx`, `auth-captcha.ts` and the CAPTCHA-only tests are deleted, and
  `@hcaptcha/react-hcaptcha` is removed from dependencies.
- `VITE_AUTH_CAPTCHA_PROVIDER` and `VITE_AUTH_CAPTCHA_SITE_KEY` are removed from the root and
  frontend env files. The canonical production Supabase URL / project id / public publishable key
  wiring is unchanged.
- Email sign-in uses `signInWithPassword({ email, password })`; signup uses
  `signUp({ email, password, options: { emailRedirectTo, data } })` with the existing username
  validation/availability preflight and confirm-email handling; reset uses
  `resetPasswordForEmail(email, { redirectTo })`; `username-login` receives ONLY
  `{ username, password }` (v4).
- A challenge-shaped stable code (`captcha_failed`) now maps to the generic localized auth error;
  raw provider payloads are never shown, logged or telemetered (the OAuth `console.error` of the
  raw provider error was also removed).

OBSERVED RUNTIME (2026-09-15): a fresh production `auth.signUp` made with NO challenge token
**succeeded** — it created the user and sent the confirmation email, with no `captcha_failed`. Bot
and Abuse Protection therefore did not block tokenless signup in the observed runtime and is not
described as a blocking prerequisite. Production `mailer_autoconfirm=false`, so the successful
signup returned no session; full successful password and username login remains pending a
confirmed account in the smoke test and is **NOT declared PASS** from signup alone. Whether
Bot/Abuse Protection is enabled or disabled in the dashboard is not independently verified from
here; historically, while it was enabled, tokenless signup/sign-in/recovery returned HTTP 400
`captcha_failed` (see the historical entries above). Unit tests alone are not treated as evidence.
(Security Advisor state as of that date; superseded by the 2026-09-17 external hardening below.)

## 2026-09-15 — live production signup observed succeeding without CAPTCHA (CURRENT)

Independently observed against production Supabase `ucacmeadsufiedxrgqit` on 2026-09-15:

- A fresh production `auth.signUp` made with NO challenge token **succeeded**: it created the user
  and sent the confirmation email. There was no `captcha_failed`. Bot/Abuse Protection therefore
  did not block tokenless signup in the observed runtime and is no longer described as an unverified
  remaining prerequisite.
- Production `mailer_autoconfirm=false`, so the successful signup returned **no session** until the
  confirmation email link is used. Full successful password login and username-login v4 login
  therefore remain **pending a confirmed account** in the smoke test and are **NOT declared PASS**
  from signup alone.
- The frontend still has no CAPTCHA dependency; no code changed in this documentation follow-up.

Historical hCaptcha/CAPTCHA incidents above remain clearly marked HISTORICAL.

## 2026-09-16 corrective completion pass

1. **FIXED — AI runtime blocked authenticated product access.**
   `startup-flow.ts` made the system admission lease and the model readiness gate
   mandatory fail-closed startup gates, so a valid Supabase session could not
   reach any product page while the local backend was absent. Both are now
   optional AI-readiness surfaces; `aiSetupPending()` is advisory.
2. **CORRECTED SCHEMA ASSUMPTION.** Earlier documents stated the live project had
   no assessment tables. It does: `quizzes`, `quiz_attempts`, `mock_exams`,
   `mock_exam_attempts`, `grading_results`, `assessments`, `study_plans`.
   Documentation and contracts now say REUSE/EXTEND, never duplicate.
3. **NEW LIVE MIGRATION recorded:** `add_per_user_combined_50mb_quota` with
   `get_my_quota_status()` and `can_allocate_my_quota()`; frontend integration
   documented in `docs/contracts/USER_QUOTA_CONTRACT.md`.
4. **NEW CONTRACT:** local system capability probe + load-balancing-aware model
   recommendation (`docs/contracts/SYSTEM_CAPABILITY_CONTRACT.md`). The probe
   itself is FUTURE BACKEND / CODEX; the frontend never infers hardware values.
5. **STALE DIAGRAMS:** `POST_LOGIN_STARTUP.mmd` and
   `STARTUP_COMPLIANCE_LANGUAGE_ADMISSION_MODEL_HOME.mmd` describe the previous
   mandatory-gate order and are superseded by
   `AUTH_STARTUP_HOME_VS_OPTIONAL_AI.mmd`.
6. Security advisor state — SUPERSEDED 2026-09-17: the intentional signed-in
   SECURITY DEFINER application-RPC warnings described here were resolved by the
   external live hardening recorded below; only the two Auth-project advisories
   (leaked-password protection, MFA options) remain open.


## Post-login gate — CURRENT (2026-09-17)

Supersedes any statement earlier in this file that language onboarding is a
once-per-account step or that model setup is optional/advisory.

Canonical order after Supabase Auth succeeds (account suspension pre-empts
everything):
**language decision for this browser session** (select a language or explicit
skip) → **model decision for this browser session** (backend-confirmed `ready`,
or an explicit "Continue without AI") → compliance onboarding *if still
required* (durable, once) → `/home` and the rest of the product.
Ordinary compliance onboarding NEVER appears before the language and model
decisions; a suspended account (`suspended_pending_review`) still outranks all
of them.

- Authentication and non-AI product areas never depend on the local AI backend.
- `user_preferences.preferences.app_language` is a SAVED DEFAULT VISUAL HINT
  only. It never counts as the session selection: Continue on the language screen
  stays disabled until the user clicks a language in this session, or the user
  explicitly skips. `language_onboarding_completed` is kept only as legacy
  compatibility metadata and is not a gate.
- `selected_qwen_model` persists a *preference*; readiness comes only from an
  explicit backend `ready` state (`alim.ai_session.v1` in `sessionStorage`).
- The decisions survive a refresh in the same session and are cleared on
  sign-out; direct navigation to a protected route re-runs the same gate.
- AI actions are centrally guarded (`AiFeatureGate` / `useAiBlocked`): blocked
  actions issue no request and show one localized red notice with retry,
  Settings and non-AI paths.

Full contract: `docs/backend-handoff/POST_LOGIN_LANGUAGE_MODEL_GATE_HANDOFF.md`;
sequence: `docs/sequences/POST_LOGIN_STARTUP.mmd`.
