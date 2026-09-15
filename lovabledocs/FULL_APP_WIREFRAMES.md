# Full app wireframes — index

```
Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466
```

This file is a pure **index**. The diagrams themselves live in the `.mmd` files
listed below — they are never duplicated inline, so there is exactly one source of
truth per diagram. Start at `docs/README_ARCHITECTURE.md` for reading orders and at
`docs/backend-handoff/CODEX_HANDOFF.md` if you are implementing the backend.

Status labels used throughout: `CURRENT — FRONTEND`, `CURRENT — SUPABASE`,
`CURRENT — EXTERNAL INTEGRATION`, `EXPECTED BACKEND CONTRACT`,
`BACKEND IMPLEMENTATION UNKNOWN`, `BACKEND TODO FOR CODEX`, `DEPRECATED — REMOVED`.

## Feature wireframes (`docs/wireframes/`)

| File | Purpose | Primary code paths covered |
| --- | --- | --- |
| `01-system-overview.mmd` | Browser → Supabase → local Python backend → local model, with trust boundaries. No AI-gateway fallback exists. | `frontend/src/routes/api/chat.ts`, `frontend/src/lib/context-backend.server.ts` |
| `02-routes-navigation.mmd` | Route map and navigation, incl. the seven-language flag menu between the bell and the avatar. | `frontend/src/routes/**`, `frontend/src/components/app/AppHeader.tsx`, `MobileNavigation.tsx`, `LanguageMenu.tsx` |
| `03-frontend-composition.mmd` | Provider/component composition of the authenticated shell. | `frontend/src/routes/__root.tsx`, `components/app/AppShell.tsx` |
| `04-state-ownership.mmd` | Which state lives in the browser, in Supabase, or is client-only. | `frontend/src/lib/store/app-data.tsx`, `lib/store/academic-year.tsx`, `lib/i18n/provider.tsx` |
| `05-authentication.mmd` | Protected-route gate, sign-in/up, username login, OAuth. | `frontend/src/routes/_authenticated/route.tsx`, `components/AuthForm.tsx` |
| `06-home.mmd` | `/home` dashboard composition and data sources. | `frontend/src/routes/_authenticated/home.tsx` |
| `07-school-grades.mmd` | `/school` overview, subject list, grade summaries, SPF combination. | `routes/_authenticated/school.index.tsx`, `lib/grade-math.ts` |
| `08-subject-workspace.mmd` | `/school/$subject` workspace: grades, assessments, materials, tools. | `routes/_authenticated/school.$subject.tsx` |
| `09-chat.mmd` | Tutoring chat end to end, incl. the 503/timeout branch. | `components/StudyChat.tsx`, `routes/api/chat.ts` |
| `10-planner.mmd` | `/planner`, recurrence expansion and the read-only Google Calendar merge. | `routes/_authenticated/planner.tsx`, `lib/google-calendar.ts` |
| `11-materials.mmd` | Materials panel: local files, links and notes. | `components/app/MaterialsPanel.tsx` |
| `12-ai-study-tools.mmd` | Quiz / mock exam / grading / study plan surfaces — backend not implemented. | subject workspace tools; `BACKEND TODO FOR CODEX` |
| `13-statistics.mmd` | `/stats` filters and derived summaries. | `routes/_authenticated/stats.tsx`, `components/app/StatsOverviewPanel.tsx` |
| `14-supporting-screens.mmd` | `/profile`, `/settings`, `/assistant`, `/help`, `/feedback`. No Contact-support CTA. | those route files |
| `15-offline-fallback.mmd` | What the user sees when the local backend is unreachable (no cloud fallback exists). | `routes/api/chat.ts`, `lib/ui-error.ts` |
| `16-assistant.mmd` | General Assistant persistence and attachments; no reply is fabricated. | `components/assistant/AssistantChat.tsx`, `lib/assistant-data.ts` |
| `17-settings-storage.mmd` | Settings sections, preferences, storage usage and cleanup. | `components/app/SettingsSections.tsx`, `lib/storage-management.ts` |
| `18-i18n-language.mmd` | Seven-language flow: cache, provider, Supabase authority, detection. | `lib/i18n/{languages,provider,detect,format}.ts` |
| `19-read-aloud.mmd` | Listen/Stop browser speech synthesis and its unavailable states. | `lib/speech.ts` |
| `20-media-retention.mmd` | Assistant output media, descriptor-before-delete, 30-minute queue. | `lib/media-retention.ts`, `public.media_retention_queue` |

## Runtime sequence diagrams (`docs/sequences/`)

`AUTH_SIGNUP_LOGIN.mmd` · `USERNAME_LOGIN.mmd` · `OAUTH_LOGIN.mmd` · `SIGN_OUT.mmd` ·
`APP_LANGUAGE_CHANGE.mmd` · `MULTILINGUAL_CHAT.mmd` · `SUBJECT_CHAT.mmd` ·
`GENERAL_ASSISTANT.mmd` · `CHAT_AUDIO_RESPONSE.mmd` · `DOCUMENT_UPLOAD.mmd` ·
`DOCUMENT_INDEXING.mmd` · `RAG_QUERY.mmd` · `PLANNER_EVENT.mmd` ·
`GOOGLE_CALENDAR_SYNC.mmd` · `GRADES_ASSESSMENT.mmd` · `STUDY_TOOLS.mmd` ·
`FEEDBACK_SUBMISSION.mmd` · `ACTIVITY_LOGGING.mmd` · `MEDIA_RESPONSE.mmd` ·
`MEDIA_RETENTION.mmd` · `NOTIFICATIONS.mmd` · `PROFILE_SETTINGS.mmd`

## Architecture diagrams (`docs/architecture/`)

`SYSTEM_CONTEXT.mmd` (C4 L1) · `CONTAINER_ARCHITECTURE.mmd` (C4 L2) ·
`FRONTEND_COMPONENT_ARCHITECTURE.mmd` (C4 L3) · `SUPABASE_ARCHITECTURE.mmd` ·
`BACKEND_EXPECTED_ARCHITECTURE.mmd` · `DEPLOYMENT_ARCHITECTURE.mmd`

## Other diagrams

- `docs/ux/USER_FLOW_MAP.mmd`, `docs/ux/ROUTE_SCREEN_MAP.mmd`
- `docs/frontend/COMPONENT_TREE.mmd`, `docs/frontend/STATE_OWNERSHIP.mmd`
- `docs/supabase/DATABASE_ERD.mmd`, `AUTH_STATE_MACHINE.mmd`,
  `STORAGE_ARCHITECTURE.mmd`, `STORAGE_LIFECYCLES.mmd`

## Removed concepts — do not reintroduce

`DEPRECATED — REMOVED`: Diagnostics route · Contact-support CTA · "View demo
content" / demo mode · Apple Reminders and any Apple service integration ·
five-language wording · Lovable Cloud Auth as the production provider · an
AI-gateway fallback inside `frontend/src/routes/api/chat.ts`.


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
