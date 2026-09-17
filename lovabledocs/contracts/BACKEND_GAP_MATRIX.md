Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# Backend Gap Matrix

"Backend implementation verified" is UNKNOWN everywhere below because FACTS.md verifies no backend implementation (no backend source in this repo/sandbox).

| Feature | Frontend exists | Supabase exists | Backend contract defined | Backend implementation verified | Codex action |
|---|---|---|---|---|---|
| Message-language override sent to backend | NO (only client-side `effectiveResponseLanguage`, `frontend/src/lib/i18n/detect.ts`) | N/A | NO | UNKNOWN | Define a request field (e.g. `response_language_hint`) and consume it |
| Audio response generation (server TTS) | NO (browser-only `speechSynthesis`, `frontend/src/lib/speech.ts`) | N/A | NO | UNKNOWN | Define an audio contract if server-side TTS is desired |
| Browser speech fallback | YES (`speechSupported()`, `assistant.audio.unsupported` copy) | N/A | N/A (client-only) | N/A | None — working as designed |
| Context management / budgeting | PARTIAL (sends `academicYear`/`gradeLevel`/`subject_id`, no truncation logic) | N/A | PARTIAL (inputs only) | UNKNOWN | Document backend-side budgeting behaviour |
| Document ingestion | NO explicit upload-to-ingestion flow found; `documents`/`document_chunks` read defensively | YES (`user-materials` bucket, `documents` table) | NO | UNKNOWN | Define ingestion endpoint/contract |
| RAG (retrieval + reranking) | YES (consumes `sources[]`, `retrieval_summary`) | N/A | YES (response shape fixed) | UNKNOWN | Verify backend implementation against `ContextChatResponse` |
| Subject chat | YES (`StudyChat.tsx`, `/api/chat`) | YES (`threads`, `messages`) | YES (`FRONTEND_BACKEND_CONTRACT.md`) | UNKNOWN | Verify implementation, add integration tests |
| General Assistant | YES (`AssistantChat` route family, `assistant-data.ts`) | YES (`assistant_threads/messages/attachments`) | NO (no endpoint call for assistant replies) | UNKNOWN | Define assistant-reply contract |
| Study plans | PARTIAL (referenced only in chat copy) | N/A (no dedicated table) | NO | UNKNOWN | Define structured study-plan contract if needed, or confirm free-text-via-chat is sufficient |
| Grading | YES for manual grade entry (`stats.tsx`, `grade-math.ts`) | YES (grades data, exact table not in FACTS.md table list) | N/A (no AI grading contract) | UNKNOWN | Confirm whether AI-assisted grading is in scope |
| Mock exams / quizzes | PARTIAL (chat copy mentions quizzes only) | N/A | NO | UNKNOWN | Define structured quiz contract if needed |
| Memory (student memory across sessions) | NO | N/A | NO | UNKNOWN | Define if in scope; not implied by current UI |
| Web retrieval | YES (`allow_web:true` flag sent) | N/A | PARTIAL (flag only, no source-type contract) | UNKNOWN | Confirm web source shape reuses `sources[].url` |
| Media descriptor creation | YES (frontend enqueues rows expecting a descriptor path) | YES (`media_retention_queue`, `assistant-descriptors` bucket) | PARTIAL (row shape defined, generation process not) | UNKNOWN | Implement descriptor generation + upload before deletion |
| Media retention enqueue | YES (`enqueueAssistantMedia`, `frontend/src/lib/media-retention.ts`) | YES (`media_retention_queue` table) | YES (row shape + 30-min `delete_after`) | UNKNOWN | Implement the 30-minute cleanup worker |
| Google Calendar backend requirements | YES (frontend calls Google directly) | PARTIAL (Supabase only brokers OAuth identity link) | N/A (backend not involved today) | N/A | None required unless a server-side Calendar proxy is later desired |
| Telemetry / error integration | YES (`telemetry.ts` → `activity-log` Edge Function) | YES (`usage_events` table, `activity-logs` bucket) | YES (sanitised payload shape) | UNKNOWN (Edge Function internals not machine-verified) | Verify Edge Function persists exactly the sanitised shape |

| System admission check (`/api/system/admission/check`) | OPTIONAL surface (`SystemAdmissionGate`, `/onboarding/system-admission`) — NOT a startup gate | PARTIAL (`get_system_admission_policy()` policy only) | YES (contract documented) | UNKNOWN | Implement admission endpoint. It NEVER blocks login: admission/capacity data is shown on the model decision screen, and a user without AI can always continue with non-AI features |
| System health (`/api/system/health`) | YES (`SystemHealthPanel`, `/system-health`) | PARTIAL (`get_user_visible_supabase_health()` covers Supabase-only quotas) | YES | UNKNOWN | Implement health endpoint; until then `SystemHealthPanel` shows local/model health as unavailable |
| Session heartbeat / runtime release (`/api/system/session/heartbeat`, `/api/system/runtime/release`) | YES (sign-out best-effort release call) | N/A | YES | UNKNOWN | Implement heartbeat + release; until then abandoned sessions are not reclaimed (see sign-out note below) |
| Model recommendation (`/api/system/model/recommendation`) | YES (called during model-readiness gate) | N/A | YES | UNKNOWN | Implement recommendation endpoint; until then frontend falls back to last-known/manual model selection |
| Content safety moderation (`/api/safety/moderate`) | YES (`/api/chat` calls it before storing/answering; `messaging/SafetyNotice`) | YES (`moderation_events`, `guardian_notification_queue` read/write by service role) | YES (verdict enum documented) | UNKNOWN | Implement moderation endpoint; until then `/api/chat` fails closed with HTTP 503 `X-Safety-Verdict: safety_unavailable` and peer-message sends are blocked client-side |
| Peer message send (`/api/peer-messaging/send`) | YES (`MessageComposer`, `messaging/MessageThread`) | YES (destination tables/RLS exist, but direct client writes are disabled) | YES | UNKNOWN | Implement send endpoint; until then `MessageComposer` fails closed — no client-side insert path exists |
| Attachment safety scan (`/api/safety/attachment-scan`) | YES (`AttachmentPicker`) | YES (`peer-message-attachments` private bucket exists) | YES | UNKNOWN | Implement attachment-scan endpoint; until then `AttachmentPicker` cannot complete an upload — no attachment scan is available |

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

## Post-login gate gaps (2026-09-17)

| Capability | Frontend today | Supabase today | Required future backend |
| --- | --- | --- | --- |
| Language decision per browser session | DONE (`alim.language_session.v1`, select or skip) | `app_language` durable default; `language_onboarding_completed` legacy only | none |
| Model decision per browser session | DONE (`alim.ai_session.v1`; ready only on explicit backend confirmation) | `selected_qwen_model` preference only; readiness never stored | `/api/system/capability`, `/api/model/prepare`, `/api/model/operation` |
| Route-order enforcement | DONE (`startupRedirectFor`: `/onboarding/model` → `/onboarding/language` when undecided) | n/a | none |
| Non-AI mode guarding | DONE (`AiFeatureGate` / `useAiBlocked`, no request issued when blocked) | n/a | none |
| Runtime release / lease TTL on sign-out | best-effort call only | n/a | heartbeat + lease TTL sweeper |
