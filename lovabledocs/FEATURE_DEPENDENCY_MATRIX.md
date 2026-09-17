Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# Feature Dependency Matrix

| Feature | Route | Components | Supabase tables | Storage | Edge Functions | Local backend | External service |
|---|---|---|---|---|---|---|---|
| Auth (email/password, username, OAuth) | `frontend/src/routes/index.tsx`, `auth.tsx`, `auth.update-password.tsx` | `AuthForm.tsx` | `profiles`, `user_preferences` (created on first sign-in) | `profile-avatars` (later, in Settings) | `username-login`, `username-availability` | none | GitHub, LinkedIn, Spotify OAuth |
| Subject tutoring chat | `_authenticated/chat.index.tsx`, `chat.$threadId.tsx` | `StudyChat.tsx`, `ThreadList.tsx` | `threads`, `messages` | none directly | none | local context backend via `POST /api/chat` | none |
| General Assistant chat | `_authenticated/assistant.index.tsx`, `assistant.$threadId.tsx` | `components/assistant/*` | `assistant_threads`, `assistant_messages`, `assistant_attachments` | `chat-attachments` | none (no backend reply contract exists — see BACKEND_GAP_MATRIX.md) | none today | none |
| School / subjects overview | `_authenticated/school.index.tsx`, `school.$subject.tsx` | `components/app/*` | subject/material data (mock or `documents`-backed per FACTS.md) | `user-materials` | none | none | none |
| Planner + Google Calendar overlay | `_authenticated/planner.tsx` | planner components under `components/app` | `user_preferences` (planner events, per app-data store) | none | none | none | Google Calendar API v3 (read-only) |
| Stats / grades | `_authenticated/stats.tsx` | grade display components | grades data (per `lib/grade-math.ts`, `mock/grades.ts`) | none | none | none | none |
| Feedback | `_authenticated/feedback.tsx` | inline form in the route | `feedback` | `feedback-messages` | `feedback-submit` | none | none |
| Profile | `_authenticated/profile.tsx` | profile components | `profiles` | `profile-avatars` | none | none | none |
| Settings (preferences, storage) | `_authenticated/settings.tsx` | settings components | `user_preferences`, `documents`, `assistant_attachments` (for storage cleanup) | `profile-avatars`, `user-materials`, `chat-attachments` | `storage-emergency-cleanup` | none | none |
| Help | `_authenticated/help.tsx` | static content | none | none | none | none | none |
| Telemetry / activity logging | app-wide (`__root.tsx` installs global handlers) | n/a (library, `lib/telemetry.ts`) | `usage_events` | `activity-logs` | `activity-log` | none | none |
| Media retention (assistant-generated media) | surfaces in Settings storage view | `lib/media-retention.ts` consumers | `media_retention_queue` | `assistant-descriptors`, plus the original media bucket | none (cleanup worker is BACKEND TODO FOR CODEX) | expected but unimplemented (descriptor generation) | none |


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

## Post-login gate dependencies (2026-09-17)

- Supabase Auth has NO dependency on the local AI backend; sign-in, compliance,
  the language decision and every non-AI feature work with the backend absent.
- The language decision depends only on `sessionStorage` plus (optionally) the
  durable `app_language` preference; a failed preference read never skips it.
- The model decision depends on the REQUIRED FUTURE BACKEND for a `ready`
  confirmation, but never for progress: the explicit continue-without-AI path
  always exists.
- AI features (chat, RAG, quiz/exam generation, grading) depend on an AI-ready
  session; they are disabled centrally instead of failing at request time.
- No user content, readiness data or hardware measurement is persisted for the
  gate: only `app_language` and `selected_qwen_model` reach Supabase, and session
  decisions are discarded on sign-out.