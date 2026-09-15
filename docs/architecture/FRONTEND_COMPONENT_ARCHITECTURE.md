```
Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466
```

# Frontend Component Architecture (C4 Level 3) — Alim / Gymi Genius

Scope: for each route file, the screen components it renders and the `lib/` services those components
call, down to the Supabase client or the `/api/chat` server route. Real paths only.

## `frontend/src/routes/__root.tsx`
Providers: `QueryClientProvider` → `I18nProvider` → `ThemeProvider` → `AppDataProvider` →
`AcademicYearProvider`. Installs `installGlobalErrorTelemetry` (`lib/telemetry.ts`) and subscribes to
`supabase.auth.onAuthStateChange` (`integrations/supabase/client.ts`).

## `frontend/src/routes/index.tsx` (`/`) and `auth.tsx` / `auth.update-password.tsx`
- Component: `components/AuthForm.tsx`
- Services: `integrations/supabase/client.ts` → `supabase.auth.signInWithPassword` / `signUp` /
  `signInWithOAuth` (github, linkedin_oidc, spotify) / `linkIdentity` (google, `calendar.readonly`);
  Edge Functions `username-login`, `username-availability` (also via the Supabase client, invoked as
  functions).

## `frontend/src/routes/_authenticated/route.tsx`
- Gate component (ssr:false) redirecting unauthenticated sessions to `/auth`.
- Service: `integrations/supabase/client.ts` (`supabase.auth.getSession`/claims check).

## `frontend/src/routes/_authenticated/home.tsx`
- Components: `components/app/AppShell.tsx`, `AppHeader.tsx`, `Breadcrumbs.tsx`, `SubjectCard.tsx`,
  `LiveClock.tsx`, `NotificationCenter.tsx`, `Badges.tsx`.
- Services: `lib/store/app-data.tsx` (`AppDataProvider` context), `lib/account-data.ts`,
  `lib/store/academic-year.tsx` → Supabase `profiles`, `user_preferences` tables via
  `integrations/supabase/client.ts`.

## `frontend/src/routes/_authenticated/school.index.tsx` and `school.$subject.tsx`
- Components: `components/app/SubjectCard.tsx`, `MaterialsPanel.tsx`, `GradeDisplay.tsx`,
  `AssessmentDialog.tsx`, `AssessmentActions.tsx`, `TranscriptImportDialog.tsx`,
  `SourceSnippetList.tsx`.
- Services: `lib/grade-math.ts`, `lib/storage-management.ts` (bucket `user-materials`),
  `lib/mock/{subjects,grades,materials,academic}.ts` (fixtures), `lib/store/app-data.tsx` →
  Supabase `documents` / `document_chunks` tables and `user-materials` storage bucket via
  `integrations/supabase/client.ts`.

## `frontend/src/routes/_authenticated/planner.tsx`
- Components: `components/app/EventDialog.tsx`, `EventDetailDialog.tsx`, `Timetable.tsx`,
  `GoogleCalendarCard.tsx`, `AcademicYearSelector.tsx`.
- Services: `lib/google-calendar.ts` → Google Calendar API v3 (read-only); `lib/store/academic-year.tsx`;
  `lib/date-utils.ts`; `lib/notifications.ts` → Supabase `user_preferences` (`exam_reminders`,
  `daily_study_summary`).

## `frontend/src/routes/_authenticated/{chat.index,chat.$threadId}.tsx` (tutoring)
- Components: `components/StudyChat.tsx`, `components/ThreadList.tsx`,
  `components/ai-elements/{conversation,message,prompt-input,shimmer}.tsx`.
- Services: `lib/chat.functions.ts`, `lib/speech.ts` (TTS) → Supabase `threads`/`messages` tables directly
  via `integrations/supabase/client.ts`, and outbound to `frontend/src/routes/api/chat.ts` (the frontend
  API client boundary) for AI responses.

## `frontend/src/routes/_authenticated/{assistant.index,assistant.$threadId}.tsx` (general Assistant)
- Components: `components/assistant/AssistantChat.tsx`, `components/ThreadList.tsx`,
  `components/ai-elements/*`.
- Services: `lib/assistant-data.ts` → Supabase `assistant_threads`/`assistant_messages`/
  `assistant_attachments` tables and `chat-attachments` storage bucket; `lib/media-retention.ts` for the
  30-minute retention queue (`media_retention_queue`); `lib/speech.ts`.

## `frontend/src/routes/_authenticated/stats.tsx`
- Components: `components/app/StatsOverviewPanel.tsx`, `GradeDisplay.tsx`.
- Services: `lib/grade-math.ts`, `lib/telemetry.ts` (reads `usage_events` indirectly via Edge Function
  `activity-log`), `lib/store/app-data.tsx`.

## `frontend/src/routes/_authenticated/help.tsx`
- Static/i18n content via `lib/i18n/*`. No backend calls beyond auth session.

## `frontend/src/routes/_authenticated/feedback.tsx`
- Service: Edge Function `feedback-submit` (`lib/telemetry.ts`-adjacent call site at
  `routes/_authenticated/feedback.tsx:64`) → `feedback` table row + `feedback-messages` storage object.

## `frontend/src/routes/_authenticated/profile.tsx`
- Components: `components/app/EditProfileDialog.tsx`.
- Services: `lib/account-data.ts` → Supabase `profiles` table, `profile-avatars` storage bucket
  (`AVATAR_BUCKET`, 2 MiB max).

## `frontend/src/routes/_authenticated/settings.tsx`
- Components: `components/app/SettingsSections.tsx`, `LanguageMenu.tsx`, `ThemeToggle.tsx`,
  `SchoolLinksSection.tsx`, `SchoolLinkDialog.tsx`.
- Services: `lib/account-data.ts` → `user_preferences.preferences` jsonb (language, Qwen model, reply
  language policy, audio/notification toggles), `lib/storage-management.ts` (RPC
  `get_storage_usage_status`, Edge Function `storage-emergency-cleanup`).

## `frontend/src/routes/api/chat.ts`
- Not a screen: the TanStack server route acting as the frontend's sole outbound client toward the local
  backend. See `docs/architecture/CONTAINER_ARCHITECTURE.md` and `docs/contracts/FRONTEND_BACKEND_CONTRACT.md`.

## Diagram

See `FRONTEND_COMPONENT_ARCHITECTURE.mmd`.


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
