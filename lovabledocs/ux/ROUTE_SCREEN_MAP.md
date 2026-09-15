Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# Route → Screen Map

Superseded document: the older top-level `docs/archive/ROUTE_SCREEN_MAP.md` is superseded by this file;
treat this file (`docs/ux/ROUTE_SCREEN_MAP.md`) as the current source of truth for route/screen
mapping. See `docs/ux/USER_JOURNEYS.md` for step-by-step user flows through the same routes.

Status labels used below: **CURRENT — FRONTEND**, **CURRENT — SUPABASE**,
**CURRENT — EXTERNAL INTEGRATION**, **EXPECTED BACKEND CONTRACT**,
**BACKEND IMPLEMENTATION UNKNOWN**, **BACKEND TODO FOR CODEX**, **DEPRECATED — REMOVED**.

All authenticated routes are nested under `frontend/src/routes/_authenticated/route.tsx`, which
gates on `supabase.auth.getUser()` (`ssr: false`, `beforeLoad` redirects to `/` when signed out —
CURRENT — SUPABASE). All routes inherit the provider stack mounted once in
`frontend/src/routes/__root.tsx`: `QueryClientProvider` → `I18nProvider` → `ThemeProvider` →
`AppDataProvider` → `AcademicYearProvider`, plus global telemetry (`installGlobalErrorTelemetry`,
`page_viewed` tracking) and a `supabase.auth.onAuthStateChange` listener that invalidates the
router/query cache. These four providers are common to every authenticated route below and are
only repeated in the "State providers used" column when a route also uses something additional.

| Route path | Route file | Screen purpose | Main components | State providers used | Supabase resources | Backend involvement | Localisation message areas | Notes |
|---|---|---|---|---|---|---|---|---|
| `/` | `frontend/src/routes/index.tsx` | Public welcome + sign-in/sign-up entry point | `frontend/src/components/AuthForm.tsx`, `frontend/src/components/app/LiveClock.tsx`, `frontend/src/components/ThemeToggle.tsx` | `I18nProvider`, `ThemeProvider` (root only; `beforeLoad` redirects signed-in users before `AppDataProvider`/`AcademicYearProvider` content is needed) | `supabase.auth.getUser()` (beforeLoad); `supabase.auth.signInWithPassword`, `signUp`, `signInWithOAuth`, Edge Functions `username-login`, `username-availability` (all in `AuthForm.tsx`) — CURRENT — SUPABASE | None | `frontend/src/lib/i18n/messages/auth.ts` | Redirects signed-in users to `/home`. |
| `/auth` | `frontend/src/routes/auth.tsx` | Legacy alias, no UI | none (redirect-only route) | none | `supabase.auth.getUser()` — CURRENT — SUPABASE | None | none (no render) | Always redirects to `/` or `/home`; kept so old links keep working. |
| `/auth/update-password` | `frontend/src/routes/auth.update-password.tsx` | Set a new password after a reset-password link | `frontend/src/components/ThemeToggle.tsx`, shadcn `Button`/`Input`/`Label` | `I18nProvider`, `ThemeProvider` (root only) | `supabase.auth.updateUser({ password })` — CURRENT — SUPABASE | None | `frontend/src/lib/i18n/messages/auth.ts` | Navigates to `/home` on success. |
| `/_authenticated` (layout) | `frontend/src/routes/_authenticated/route.tsx` | Auth gate for every screen below; renders `<Outlet />` only | none | none beyond root stack | `supabase.auth.getUser()` (beforeLoad) — CURRENT — SUPABASE | None | none | `ssr: false`; redirects to `/` when signed out. |
| `/home` | `frontend/src/routes/_authenticated/home.tsx` | Daily dashboard: greeting, School/Planner cards, today's stats, school links | `frontend/src/components/app/AppShell.tsx`, `frontend/src/components/app/AcademicYearSelector.tsx`, `frontend/src/components/app/SchoolLinksSection.tsx` | root stack + `useAppData()` (AppDataProvider), `useAcademicYear()` | None directly; underlying data is `AppDataProvider` client-side prototype state (`frontend/src/lib/store/app-data.ts`), not a live query | None | `frontend/src/lib/i18n/messages/home.ts` | Stats computed client-side from `frontend/src/lib/grade-math.ts` and `frontend/src/lib/date-utils.ts`. |
| `/school` | `frontend/src/routes/_authenticated/school.index.tsx` | All subjects: grid, year average, rounding info, failing-subjects banner | `frontend/src/components/app/SubjectCard.tsx` (`SubjectGrid`), `frontend/src/components/app/StatsOverviewPanel.tsx`, `frontend/src/components/app/AssessmentDialog.tsx`, `frontend/src/components/app/TranscriptImportDialog.tsx`, `frontend/src/components/app/Badges.tsx`, `frontend/src/components/app/GradeDisplay.tsx`, `frontend/src/components/app/States.tsx` | root stack + `useAppData()`, `useAcademicYear()`, local `useState`/`useMemo` for sort/filter | None directly; grade math runs over `useAppData()` assessments | Transcript OCR/parsing is BACKEND IMPLEMENTATION UNKNOWN — `TranscriptImportDialog` collects data client-side only | `frontend/src/lib/i18n/messages/school.ts`, `frontend/src/lib/i18n/messages/grades.ts` | Sort/filter state is local, not persisted. |
| `/school/$subject` | `frontend/src/routes/_authenticated/school.$subject.tsx` | Subject dashboard with 7 mode tabs (Chat, Knowledge Analysis, Quiz Mode, Exam Mode, Study Plan, Statistics, Subject Tools) | `frontend/src/components/app/AssessmentActions.tsx`, `frontend/src/components/app/AssessmentDialog.tsx`, `frontend/src/components/app/GradeDisplay.tsx` (`AverageWithRounded`, `GradeLineChart`), `frontend/src/components/app/MaterialsPanel.tsx`, `frontend/src/components/app/States.tsx` (`EmptyState`) | root stack + `useAppData()`, local `mode` state (`useState`) | None | Quiz/Exam/Study-Plan tabs are BACKEND TODO FOR CODEX — no endpoint exists; they render inert `EmptyState` placeholders. Chat tab links out to `/chat`, it does not embed the tutoring chat | `frontend/src/lib/i18n/messages/subject.ts`, `frontend/src/lib/i18n/messages/grades.ts`, `frontend/src/lib/i18n/messages/materials.ts` | Route `loader` calls `getSchoolSubject(params.subject)` from `frontend/src/lib/mock/subjects.ts`; `notFoundComponent: SubjectNotFound` on unknown slug. |
| `/planner` | `frontend/src/routes/_authenticated/planner.tsx` | Calendar/timetable: exams, study sessions, activities, Google Calendar overlay | `frontend/src/components/app/Timetable.tsx`, `frontend/src/components/app/EventDialog.tsx`, `frontend/src/components/app/EventDetailDialog.tsx`, `frontend/src/components/app/GoogleCalendarCard.tsx`, `frontend/src/components/app/AcademicYearSelector.tsx` | root stack + `useAppData()`, `useAcademicYear()`, local calendar navigation state | None directly for events; Google Calendar overlay via `frontend/src/lib/google-calendar.ts` uses `supabase.auth.linkIdentity({ provider: "google", scopes: "calendar.readonly" })` — CURRENT — SUPABASE / CURRENT — EXTERNAL INTEGRATION | None | `frontend/src/lib/i18n/messages/planner.ts`, `frontend/src/lib/i18n/messages/events.ts`, `frontend/src/lib/i18n/messages/calendar.ts` | Google token held in `sessionStorage` only (`clearGoogleAccess`), never sent to any backend. |
| `/stats` | `frontend/src/routes/_authenticated/stats.tsx` | Cross-subject statistics overview | `frontend/src/components/app/StatsOverviewPanel.tsx`, `frontend/src/components/app/AcademicYearSelector.tsx`, `frontend/src/components/app/GradeDisplay.tsx` | root stack + `useAppData()`, `useAcademicYear()` | None directly; client-side grade math | None | `frontend/src/lib/i18n/messages/stats.ts`, `frontend/src/lib/i18n/messages/grades.ts` | Reuses `AssessmentDialog`/`AssessmentActions` from School. |
| `/help` | `frontend/src/routes/_authenticated/help.tsx` | Static help/FAQ + supported-languages reference | `frontend/src/components/app/AppShell.tsx`, `frontend/src/components/app/Breadcrumbs.tsx` (`PageNav`) | root stack only | None | None | `frontend/src/lib/i18n/messages/help.ts` | Lists the 7 supported languages from `frontend/src/lib/i18n/languages.ts`; no "Contact support" CTA (DEPRECATED — REMOVED). |
| `/feedback` | `frontend/src/routes/_authenticated/feedback.tsx` | User feedback form (category + message) | `frontend/src/components/app/AppShell.tsx`, shadcn `Select`/`Textarea`/`Button`/`Label` | root stack only, local form `useState` | Edge Function `feedback-submit` (`supabase.functions.invoke`, line 64) — CURRENT — SUPABASE; writes a `feedback` row + `feedback-messages` storage object per FACTS | None | `frontend/src/lib/i18n/messages/feedback.ts` | Telemetry via `frontend/src/lib/telemetry.ts` (`track`/`trackFailure`). |
| `/profile` | `frontend/src/routes/_authenticated/profile.tsx` | Account profile: avatar, name fields, year summary | `frontend/src/components/app/EditProfileDialog.tsx`, `frontend/src/components/app/AcademicYearSelector.tsx`, `frontend/src/components/app/AppShell.tsx` | root stack + `useAppData()`, `useAcademicYear()` | `supabase.auth.getUser()`; `frontend/src/lib/account-data.ts` (`fetchAccountProfile`, `avatarSignedUrl`) reads `public.profiles` and signs `profile-avatars` bucket URLs — CURRENT — SUPABASE | None | `frontend/src/lib/i18n/messages/profile.ts` | Avatar bucket `profile-avatars`, max 2 MiB (`AVATAR_MAX_BYTES`) per FACTS. |
| `/settings` | `frontend/src/routes/_authenticated/settings.tsx` | Preferences: language, model, assistant reply-language policy, audio, notifications, storage | `frontend/src/components/app/SettingsSections.tsx`, `frontend/src/components/app/AppShell.tsx` | root stack only; preferences read/written through `frontend/src/lib/account-data.ts` (`UserPreferences`) | `public.user_preferences` (per-user `preferences` jsonb) — CURRENT — SUPABASE (declared); RPC `get_storage_usage_status()` for the storage panel; `storage-emergency-cleanup` Edge Function (`frontend/src/lib/storage-management.ts:199`) — CURRENT — SUPABASE | None | `frontend/src/lib/i18n/messages/settings.ts`, `frontend/src/lib/i18n/messages/notifications.ts` | `app_language` here is the authoritative source (`public.user_preferences.preferences.app_language`); `localStorage` key `alim.app_language` is a signed-out/flash-avoidance cache only. |
| `/chat` | `frontend/src/routes/_authenticated/chat.index.tsx` | Tutoring Study Chat: thread list / create-then-redirect | none rendered directly (redirects) | root stack + `useQuery`/server functions | `frontend/src/lib/chat.functions.ts` (`listThreads`, `createThread`) reading/writing `public.threads` — CURRENT — SUPABASE | None at this route (redirect only) | `frontend/src/lib/i18n/messages/chat.ts` | Uses `useServerFn` (`@tanstack/react-start`) to call the thread-listing server functions, then navigates into `/chat/$threadId`. |
| `/chat/$threadId` | `frontend/src/routes/_authenticated/chat.$threadId.tsx` | Tutoring Study Chat conversation screen | `frontend/src/components/StudyChat.tsx` | root stack + AI SDK chat state inside `StudyChat.tsx` | `public.threads`/`public.messages` (ownership check, message inserts) — CURRENT — SUPABASE | POST `/api/chat` (`frontend/src/routes/api/chat.ts`) → local Python context backend — EXPECTED BACKEND CONTRACT | `frontend/src/lib/i18n/messages/chat.ts` | Speech playback via `frontend/src/lib/speech.ts` (browser `speechSynthesis`, ephemeral, ties into `assistant_audio_enabled`/`assistant_audio_autoplay` preferences). |
| `/assistant` | `frontend/src/routes/_authenticated/assistant.index.tsx` | General Assistant, new/most-recent thread view | `frontend/src/components/app/AppShell.tsx`, `frontend/src/components/app/Breadcrumbs.tsx`, `frontend/src/components/assistant/AssistantChat.tsx` | root stack only | `public.assistant_threads`/`public.assistant_messages`/`public.assistant_attachments` via `frontend/src/lib/assistant-data.ts` — CURRENT — SUPABASE | Assistant message generation and attachment parsing are BACKEND IMPLEMENTATION UNKNOWN — the frontend never fabricates assistant rows itself, per FACTS | `frontend/src/lib/i18n/messages/assistant.ts` | Distinct from the tutoring Study Chat (`/chat`); separate tables and a separate component tree. |
| `/assistant/$threadId` | `frontend/src/routes/_authenticated/assistant.$threadId.tsx` | General Assistant, specific thread | `frontend/src/components/app/AppShell.tsx`, `frontend/src/components/app/Breadcrumbs.tsx`, `frontend/src/components/assistant/AssistantChat.tsx` | root stack only; `useParams()` for `threadId` | Same as `/assistant` — CURRENT — SUPABASE | Same as `/assistant` — BACKEND IMPLEMENTATION UNKNOWN | `frontend/src/lib/i18n/messages/assistant.ts` | Attachments go through `CHAT_ATTACHMENT_BUCKET`/media-retention flow described in `frontend/src/lib/media-retention.ts` and `frontend/src/lib/storage-management.ts`. |
| `/api/chat` (server route, no screen) | `frontend/src/routes/api/chat.ts` | POST endpoint backing the tutoring Study Chat screen | none (server-only `createFileRoute` with `server.handlers.POST`) | none (server route; no React providers) | Verifies bearer token via `supabase.auth.getClaims`; reads/writes `public.threads`/`public.messages` — CURRENT — SUPABASE | Calls `requestContextAnswer` (`frontend/src/lib/context-backend.server.ts`) → local Python context backend at `ALIM_CONTEXT_BACKEND_URL` (default `http://127.0.0.1:8001`) — EXPECTED BACKEND CONTRACT; no Lovable AI Gateway fallback exists in current code (DEPRECATED — REMOVED, must not reappear) | none (no UI strings) | Streams an AI-SDK UI message stream (`text-start`/`text-delta`/`text-end` + `data-context-metadata` part); consumed exclusively by `/chat/$threadId`. |
| `__root.tsx` (not a screen) | `frontend/src/routes/__root.tsx` | Global provider shell, 404/error boundaries, `<html>` document shell | `frontend/src/components/ui/sonner.tsx` (`Toaster`) | Mounts `QueryClientProvider` → `I18nProvider` → `ThemeProvider` → `AppDataProvider` → `AcademicYearProvider` for every route | `supabase.auth.onAuthStateChange` listener — CURRENT — SUPABASE | None | `frontend/src/lib/i18n/messages/common.ts`, `frontend/src/lib/i18n/messages/misc.ts` | Also wires `installGlobalErrorTelemetry()` and `frontend/src/lib/lovable-error-reporting.ts`; `notFoundComponent`/`errorComponent` render `common.notFound.*`/`common.error.*` copy. |

## Notes

- Every authenticated screen also shares `frontend/src/components/app/AppShell.tsx` (header, nav,
  academic-year context surface) unless noted otherwise; it is omitted from the "Main components"
  cell above only where the route renders no visible chrome (e.g. `/chat` redirect, `/api/chat`).
- "Localisation message areas" lists the primary `frontend/src/lib/i18n/messages/*.ts` module(s)
  a screen draws its strings from; most screens also pull a few keys from
  `frontend/src/lib/i18n/messages/common.ts` and `frontend/src/lib/i18n/messages/nav.ts` (shared
  nav/breadcrumb copy), which are not repeated per row.
- Superseded document: the older top-level `docs/archive/ROUTE_SCREEN_MAP.md` predates the routes/props
  documented here (e.g. it does not reflect the current `_authenticated` layout, `/assistant`
  routes, or `/api/chat` contract) and must not be treated as current; this file supersedes it.


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
