# 03 — UX, UI, and frontend inventory

| Field | Value |
|---|---|
| Owner | Product UX and frontend |
| Status | `CURRENT — FRONTEND`; backend responsibilities are explicitly marked |
| Canonical path | `docs/ux/ROUTE_AND_SCREEN_INVENTORY.md` |
| Verified against | frontend `f0910e6971f12efe0ad547b904f6e2a518b13856` |
| Last reviewed | 2026-09-18 |

This is the compact navigation/control index. Exact behavior remains the source
at `frontend/src`; the detailed ownership paths are in handover 07.

## Public and startup routes

| Route | Screen and meaningful controls | Ownership/status |
|---|---|---|
| `/` | Welcome; sign-in/sign-up form, mode switch, email/username/password, role, DOB/guardian fields, legal consent checkboxes, OAuth buttons | `CURRENT — FRONTEND` + Supabase Auth/Edge Functions |
| `/auth` | Auth redirect compatibility | `CURRENT — FRONTEND` |
| `/auth/update-password` | new password, confirm, submit, invalid-link recovery/back | `CURRENT — FRONTEND` + Supabase Auth |
| `/legal/{terms,privacy,acceptable-use,child-safety}` | localized legal content and navigation | `CURRENT — FRONTEND`; legal review still required |
| `/onboarding/language` | seven language cards, retry preference, continue, explicit skip, sign out | `CURRENT — FRONTEND` |
| `/onboarding/model` | capability assessment, recommendation, catalogue selector, prepare/retry/progress, continue with AI, continue without AI, sign out | `CURRENT — FRONTEND`; backend endpoints are gaps |
| `/onboarding/system-admission` | optional check/retry, continue, logout | `CURRENT — FRONTEND`; backend gap |
| `/onboarding/compliance` | account role/DOB/guardian data, required consent checkboxes, save, retry, sign out | `CURRENT — FRONTEND` + `CURRENT — SUPABASE` |
| `/account/suspended` | refresh status, legal/help links, sign out | `CURRENT — FRONTEND` + `CURRENT — SUPABASE` |

## Authenticated shell

`AppShell`, `AppHeader`, and `MobileNavigation` provide logo/home, desktop/mobile
navigation, unread messages, notifications, language, theme, profile/settings,
academic-year selection, breadcrumbs/back links, and sign out. Sign out clears
session gates and attempts runtime release before Supabase sign-out.

## Product routes

| Route | Main controls and states | Backend role |
|---|---|---|
| `/home` | school/planner cards, schedule/overview, AI status/recovery | non-AI navigation; readiness banner only |
| `/school` | add subject, import transcript, academic year, sort/filter, subject cards/links | mostly browser/Supabase; AI-independent |
| `/school/$subject` | component selector, mode tabs, combined/component stats, grades add/edit/duplicate/move/delete, materials, chat link, quiz/exam/study-plan/tool actions, notify | mixed; AI controls require future backend |
| `/chat`, `/chat/$threadId` | subject/title inputs, create/delete thread, prompt input, send/stop, citations, exam tip/model metadata, read aloud, sign out | `/api/chat` → safety → local backend |
| `/assistant`, `/assistant/$threadId` | thread list/create/delete, prompt, attachments/remove, send, persisted messages | persistence exists; generation/parsing gap |
| `/messages`, `/messages/$conversationId` | conversation list, new username conversation, message composer, compressed attachments, send, safety notice, read marking | Supabase read/RPC + local safety/send gap |
| `/planner` | calendar/list view, previous/today/next, add/edit/delete event, all-day switch, recurring scope, Google connect/sync/disconnect/detail | browser/Supabase + direct Google; no local AI required |
| `/stats` | subject filter, grade/stat views, add grade/assessment, charts | primarily browser-local/manual |
| `/profile` | edit profile/avatar, personal/school/account summaries, content/data links | Supabase profile/Storage |
| `/settings` | account, preferences, language/reply policy/theme/model, readiness retry, Calendar, storage quota, cleanup, retention, data range/all/account deletion | mixed Supabase/local-backend |
| `/feedback` | category selector, textarea validation, submit/partial retry | Edge Function + private Storage |
| `/help` | help sections and seven localized PDF guides | frontend static |
| `/system-health` | local/Supabase health, GPUs/processes/queue/recommendation, refresh | backend health + Supabase health RPC |

## Shared control families

- `AssessmentSetup/ModePanel/GenerationWaitingRoom/Runner/QuestionNavigator/
  AnswerInputs/SubmissionReview/Results/KnowledgeProfile`: full assessment UI;
  backend generation/grading is not implemented.
- `ModelReadinessPanel/SystemCapabilityPanel/SystemHealthPanel`: normalize
  untrusted server payloads and never infer ready hardware state.
- `DataRightsPanel/UserQuotaCard/SettingsSections`: quota, cleanup, deletion and
  account actions.
- `MaterialsPanel/TranscriptImportDialog/SchoolLinkDialog`: academic data and
  uploads, with some browser-local/prototype behavior.
- `NotificationCenter`, `LanguageMenu`, `ThemeToggle`, `LiveClock`,
  `AcademicYearSelector`: cross-cutting UI state.

## States that future work must preserve

Every actionable surface has loading/disabled, success, validation, empty,
retry, and unavailable behavior. AI-unavailable controls must issue no AI
request. Safety-unavailable message/chat actions fail closed. Unknown hardware
values remain null/unknown. Partial feedback/deletion/retention results must not
be shown as full success. User-visible errors are localized and never raw backend
or provider messages.

## Known frontend-only remnants

`frontend/src/lib/store/demo-data.ts` and translated `school.demoModeNote` are
unreferenced remnants after demo-mode removal. Root `src/integrations/supabase`
is tool-managed, not active app code. Both require archive classification, not
casual deletion.
