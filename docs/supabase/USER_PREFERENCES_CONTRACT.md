Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# `UserPreferences` contract

**Storage location:** `public.user_preferences.preferences` (jsonb), one row per `user_id`
(primary key), row-level-security-scoped to the owner. Reader/writer:
`frontend/src/lib/account-data.ts` (`fetchPreferences`, `savePreferences`,
`frontend/src/lib/account-data.ts:186-235`). Type source: `UserPreferences` interface,
`frontend/src/lib/account-data.ts:43-59`; defaults: `DEFAULT_PREFERENCES`,
`frontend/src/lib/account-data.ts:61-71`.

**Fallback behaviour when the row or a key is absent:** `fetchPreferences()` returns
`DEFAULT_PREFERENCES` outright when signed out or when no `user_preferences` row exists
(`maybeSingle()` returns null). When a row exists but a specific key is missing from the `preferences`
JSON, each key falls back individually to its default (see per-key notes below) rather than the
whole object being defaulted.

**Writer semantics:** `savePreferences(next)` always reads the current merged preferences first,
shallow-merges `next` on top, then `upsert`s the **entire merged object** back into
`preferences` (`onConflict: "user_id"`) — never a raw partial JSON patch.

| Key | Type | Default | Allowed values | Fallback when absent | Reader/writer |
| --- | --- | --- | --- | --- | --- |
| `selected_qwen_model` | `string` | `"Qwen/Qwen3.8-27B"` (first of `QWEN_MODELS`) | one of the 10 `QWEN_MODELS` strings, largest first: `Qwen/Qwen3.8-27B`, `Qwen/Qwen3.5-27B`, `Qwen/Qwen3-14B`, `Qwen/Qwen3.5-9B`, `Qwen/Qwen3-8B`, `Qwen/Qwen3.5-4B`, `Qwen/Qwen3-4B`, `Qwen/Qwen3.5-2B`, `Qwen/Qwen3-1.7B`, `Qwen/Qwen3-0.6B` | any stored value not in `QWEN_MODELS` falls back to the default | `account-data.ts:201-205` |
| `app_language` | `LanguageCode` | `"en"` (`DEFAULT_LANGUAGE`) | exactly 7 codes: `en`, `de`, `gsw`, `ru`, `es`, `fr`, `it` (`frontend/src/lib/i18n/languages.ts`) | `undefined` → `DEFAULT_LANGUAGE`; any other stored value is passed through `normaliseLanguage()` | `account-data.ts:210-213`; authoritative source per `I18nProvider` once signed in; `localStorage` key `alim.app_language` is only a flash-avoidance cache for signed-out users |
| `assistant_reply_language_policy` | `"message_then_app" \| "app_only"` | `"message_then_app"` | `message_then_app`, `app_only` | any stored value other than the literal string `"app_only"` falls back to `"message_then_app"` (`account-data.ts:206-209`) | `account-data.ts`; **BACKEND TODO FOR CODEX** — the local AI backend does not enforce this policy yet |
| `assistant_audio_enabled` | `boolean` | `true` | `true`, `false` | non-boolean stored value → default | `account-data.ts:214`; gates the Listen/Stop control in `lib/speech.ts` consumers |
| `assistant_audio_autoplay` | `boolean` | `false` | `true`, `false` | non-boolean stored value → default | `account-data.ts:215`; autoplays only newly completed assistant messages |
| `exam_reminders` | `boolean` | `true` | `true`, `false` | non-boolean → default | `account-data.ts:216`; settings screen |
| `daily_study_summary` | `boolean` | `true` | `true`, `false` | non-boolean → default | `account-data.ts:217`; settings screen |
| `sound_effects` | `boolean` | `false` | `true`, `false` | non-boolean → default | `account-data.ts:218`; settings screen |
| `language_onboarding_completed` | `boolean` | `false` | `true`, `false` | non-boolean → default | `account-data.ts:224`; set by `/onboarding/language`; gates the language-onboarding step of `resolveStartupDestination()` — CURRENT FRONTEND / CURRENT SUPABASE |

## Reader/writer modules

- **Read:** `fetchPreferences()` (`frontend/src/lib/account-data.ts:186-221`) — used by
  `frontend/src/routes/_authenticated/settings.tsx`, `_authenticated/profile.tsx`, `I18nProvider`
  (for `app_language` once signed in), assistant chat components (for
  `selected_qwen_model`/`assistant_reply_language_policy`/`assistant_audio_*`).
- **Write:** `savePreferences(next)` (`frontend/src/lib/account-data.ts:223-235`) — used by the
  settings screen and any UI control that toggles one of the above keys.

## Backend enforcement status — BACKEND TODO FOR CODEX

The local Python context backend does **not** currently read any `user_preferences` key. In
particular:

- `app_language` — responses are not localized server-side; only client-side speech synthesis and
  UI strings honour it today.
- `assistant_reply_language_policy` — no server-side enforcement of `message_then_app` vs.
  `app_only`; `frontend/src/lib/i18n/detect.ts`'s `effectiveResponseLanguage()` is a **client-only**
  hint (`responseLanguageHint`) and is explicitly **not sent to the backend today**.
- `selected_qwen_model` — not confirmed to be forwarded to `/api/chat` or the context backend
  request body (`ContextChatRequest` in `frontend/src/lib/context-backend.server.ts` does not
  include it per current contract knowledge).
- `assistant_audio_enabled` / `assistant_audio_autoplay` — frontend-only (Web Speech API), never
  backend-relevant.
- **REMOVED:** the per-user `auto_storage_cleanup` preference key no longer exists in
  `user_preferences.preferences` (CURRENT SUPABASE). Storage cleanup is now a platform-wide,
  non-user-disableable scheduled job — see `docs/supabase/STORAGE_LIFECYCLES.md` and
  `docs/supabase/EDGE_FUNCTIONS.md`.
- `selected_qwen_model` is now also read against `public.ai_model_catalog` (CURRENT SUPABASE,
  read-only authenticated table) for the list of selectable models; the stored preference value
  itself is unchanged in shape.

All of the above are BACKEND TODO FOR CODEX: reading and honouring these preference keys server-side
is not yet implemented anywhere in this repository.

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
