# Full app wireframes — index

```
Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
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
