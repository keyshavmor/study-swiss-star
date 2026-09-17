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
  `/api/model/operation`, `/api/system/release`) is REQUIRED FUTURE BACKEND
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
