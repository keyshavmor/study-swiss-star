```
Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466
```

# Container Architecture (C4 Level 2) — Alim / Gymi Genius

## Browser containers (CURRENT — FRONTEND)

- **Router** — TanStack Router file-based routes under `frontend/src/routes` (`index.tsx`, `auth.tsx`,
  `auth.update-password.tsx`, `_authenticated/route.tsx` gate, and the authenticated screens).
- **Auth UI** — `_authenticated/route.tsx` (ssr:false gate → `/auth`) + `components/AuthForm.tsx`.
- **Home** — `_authenticated/home.tsx`.
- **School** — `_authenticated/school.index.tsx`, `_authenticated/school.$subject.tsx` (subject workspace).
- **Planner** — `_authenticated/planner.tsx`.
- **Assistant** — `_authenticated/assistant.index.tsx`, `_authenticated/assistant.$threadId.tsx`,
  `_authenticated/chat.index.tsx`, `_authenticated/chat.$threadId.tsx`, using
  `components/StudyChat.tsx`, `components/assistant/AssistantChat.tsx`, `components/ThreadList.tsx`,
  `components/ai-elements/*`.
- **Statistics** — `_authenticated/stats.tsx`.
- **Help** — `_authenticated/help.tsx`.
- **Feedback** — `_authenticated/feedback.tsx`.
- **Profile/Settings** — `_authenticated/profile.tsx`, `_authenticated/settings.tsx`.
- **i18n layer** — `lib/i18n/{languages,detect,format,provider,index,messages/*}`, mounted as
  `I18nProvider` in `__root.tsx`.
- **Speech layer** — `lib/speech.ts` (Web Speech API `speechSynthesis`, browser-only, ephemeral).
- **Supabase client** — `integrations/supabase/client.ts`, used by nearly every screen and by
  `lib/account-data.ts`, `lib/assistant-data.ts`, `lib/storage-management.ts`, `lib/telemetry.ts`,
  `lib/media-retention.ts`.
- **Google Calendar client** — `lib/google-calendar.ts`.

## TanStack server runtime container (CURRENT — FRONTEND)

- **`/api/chat` server route** (`frontend/src/routes/api/chat.ts`) — the frontend's only outbound API
  client boundary toward the local backend. Verifies the Supabase bearer token, checks thread ownership,
  writes the user message, calls `lib/context-backend.server.ts` → local backend, and streams an AI-SDK UI
  message stream back to the browser.

## Supabase containers (CURRENT — SUPABASE, declared)

- **Auth** — username/password, OAuth (GitHub, LinkedIn, Spotify), Google identity linking.
- **PostgreSQL** — `feedback`, `usage_events`, `profiles`, `user_preferences`, `media_retention_queue`,
  `documents`, `document_chunks`, `assistant_threads`, `assistant_messages`, `assistant_attachments`,
  `threads`, `messages`, plus RPC `get_storage_usage_status()`.
- **Storage** — buckets `profile-avatars`, `user-materials`, `chat-attachments`, `feedback-messages`,
  `activity-logs`, `assistant-descriptors`, all private, path convention `<uid>/...`.
- **Edge Functions** — `username-login`, `username-availability`, `activity-log`, `feedback-submit`,
  `storage-emergency-cleanup`.
- **RLS** — row-level security enforced per-table (see `docs/supabase/RLS_AUTHORIZATION_MATRIX.md`).
- **Retention infrastructure** — `media_retention_queue` table backing `lib/media-retention.ts` and the
  `storage-emergency-cleanup` Edge Function (30-minute delete-after convention).

## Local backend containers (BACKEND IMPLEMENTATION UNKNOWN / EXPECTED)

The following are named after the visible `backend/app` tree for orientation only; the frontend contract
does not describe their internals, so each is labelled EXPECTED BACKEND CONTRACT (the boundary the frontend
depends on) or BACKEND IMPLEMENTATION UNKNOWN (everything behind that boundary):

- **Chat endpoint** — `POST /api/chat` on `127.0.0.1:8001` — EXPECTED BACKEND CONTRACT.
- **Context manager** — BACKEND IMPLEMENTATION UNKNOWN.
- **Retrieval / RAG** — BACKEND IMPLEMENTATION UNKNOWN.
- **Document processing** — BACKEND IMPLEMENTATION UNKNOWN.
- **Student memory** — BACKEND IMPLEMENTATION UNKNOWN.
- **AI orchestration** — BACKEND IMPLEMENTATION UNKNOWN.
- **Local model interface** — calls the local model runtime on `:8000` — BACKEND IMPLEMENTATION UNKNOWN.
- **Media processing** — BACKEND IMPLEMENTATION UNKNOWN.
- **Web retrieval** — requested via `allow_web:true` in the chat request — BACKEND IMPLEMENTATION UNKNOWN.

## Diagram

See `CONTAINER_ARCHITECTURE.mmd`.


## Authenticated startup flow — CURRENT (2026-09-17)

Signed out → `/` (sign in / sign up; authentication NEVER waits on the local AI
backend) → `/onboarding/compliance` (durable, once, CURRENT SUPABASE
`account_compliance`) → **`/onboarding/language` — MANDATORY once per browser
session**: select a language (persists `user_preferences.preferences.app_language`
as the durable default) or explicitly skip → **`/onboarding/model` — MANDATORY
once per browser session**: system capability probe, recommendation, model
selection and prepare/poll; the app can be entered only after an explicit backend
`ready` confirmation (AI-ready) or an explicit "Continue without AI" (non-AI) →
`/home`.

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
sign in/up → `/onboarding/compliance` (CURRENT SUPABASE flag
`account_compliance.compliance_onboarding_completed`, RPC
`complete_account_compliance_onboarding`) → `/onboarding/language` (MANDATORY
per-session decision) → `/onboarding/model` (MANDATORY per-session decision:
backend-confirmed `ready`, or explicit continue-without-AI) → `/home`. The system
admission gate is NOT part of this order any more; its data is shown on the model
screen and `/onboarding/system-admission` is optional. `account_compliance.account_status
= 'suspended_pending_review'` outranks every other route and redirects to
`/account/suspended`. Legal routes: `/legal/terms`, `/legal/privacy`,
`/legal/acceptable-use`, `/legal/child-safety`. See
`sequences/SIGNUP_ROLE_GUARDIAN_CONSENT.mmd`, `sequences/POST_LOGIN_STARTUP.mmd`.
