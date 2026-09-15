Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# Error Contracts

## The UiError rule

`frontend/src/lib/ui-error.ts` defines `UiError` as the **only** class of error whose `.message` may be shown to the user (`isUiError`/`localizedMessage`). Raw provider/backend/Supabase error text is English and may leak into a translated screen, so it is:
1. Logged (`console.error`) and/or sent through `trackFailure` (bounded classification only — see `docs/contracts/EVENT_AND_TELEMETRY_CONTRACT.md`), and
2. Replaced in the UI by a localized generic message (an i18n key), **never** rendered verbatim.

Every row below follows this rule unless noted otherwise.

## Failure catalogue

| Technical failure | Localized user-facing message (i18n key) | Retry behaviour | Telemetry behaviour | Data-loss risk |
|---|---|---|---|---|
| Frontend validation: username length/chars (`frontend/src/components/AuthForm.tsx`, `validateUsername`) | `auth.usernameLengthError`, `auth.usernameCharsError` | User edits and resubmits; no network call made | None (client-only, no `track` call) | None |
| Frontend validation: feedback too short (`frontend/src/routes/_authenticated/feedback.tsx`) | `feedback.error.tooShort` (interpolates `{min}`) | User edits and resubmits | None | None |
| Supabase error (generic table/RPC failure, e.g. `frontend/src/lib/chat.functions.ts`, `assistant-data.ts`) | Caller-specific, e.g. `settings.account.loadError`, `settings.preferences.saveError`, `settings.storage.deleteError` | Manual — user must retry the action; no automatic retry found | `trackFailure` at call sites that use it (e.g. `feedback_submit_failed`); many `chat.functions.ts` paths just `throw new Error(error.message)` without a `trackFailure` call | Depends on operation; e.g. a failed `messages` insert in `/api/chat` only logs to `console.error` and does not roll back the already-sent answer — the assistant reply may be shown but not persisted |
| Auth failure: wrong username/password | `auth.usernamePasswordError` ("That username and password combination did not work.") — deliberately does not distinguish "unknown user" from "wrong password" | User retries or uses password reset | Not explicitly tracked in provided excerpts | None (no data written) |
| Auth failure: general (`auth.authenticationFailed`) | `auth.authenticationFailed` | Manual retry | Likely `trackFailure` at the auth call site (pattern used elsewhere in the file) | None |
| Username conflict at signup | Handled via `username-availability` Edge Function pre-check; **failure of the check itself must NOT be treated as "taken"** (FACTS.md) | User can still attempt signup; conflict surfaces at signup time from Supabase's uniqueness constraint | N/A at pre-check; actual signup conflict likely surfaces as a generic Supabase error mapped to a localized signup-failure key | None |
| Backend unavailable (503) — `/api/chat` → context backend network failure | Rendered by `StudyChat.tsx` as `chat.sendFailed` ("Failed to send message") via `toast.error(t("chat.sendFailed"))` | User can resend the message manually | `chat.sendFailed` toast path; underlying `ContextBackendError` is not itself sent to telemetry in the reviewed code (would need explicit `trackFailure` at the call site) | User's already-inserted message in `messages` persists (it's saved before the backend call); assistant reply is missing until retried |
| Backend timeout (90s, `AbortError`) | Same `chat.sendFailed` path (the underlying `ContextBackendError("Context backend request timed out", 503, "context_backend_unavailable")` is not shown verbatim — only its HTTP status/body reaches the route response, which the AI SDK error path turns into the generic toast) | Manual resend | Same as above | Same as above |
| Model unavailable (backend-reported `error.code`/`error.message`) | Backend's raw `error.message` is used as the `Response` body by `frontend/src/routes/api/chat.ts` (`contextError?.message`) — **this is a rule exception worth flagging**: the route currently forwards the backend's raw message as the HTTP body rather than a `UiError`; whether `StudyChat.tsx` then shows that raw text or replaces it with `chat.sendFailed` determines actual compliance — per the toast call reviewed, the UI shows the generic `chat.sendFailed`, so raw backend text is not rendered in practice | Manual resend | Not explicitly tracked | None beyond the pending assistant reply |
| Streaming interruption (connection drop mid-stream) | No dedicated i18n key found; falls back to the same `chat.sendFailed` / AI-SDK error handling in `StudyChat.tsx` | Manual resend | Not explicitly tracked | Partial assistant text may be discarded since `onFinish` (which persists the assistant message) never runs on an aborted stream |
| Upload failure (chat/assistant attachment) | `frontend/src/lib/assistant-data.ts` `sendAssistantMessage` throws `Error("${file.name}: ${uploadError.message}")` — raw Supabase Storage message; call sites in the UI are expected to wrap this with a localized message before display (component-level, not shown in this excerpt) | Manual retry of the attach action | Not explicitly tracked in `assistant-data.ts` itself | The user text message row is already inserted before attachments upload; a failed upload leaves an orphaned message row with no attachment (metadata insert failure is compensated by removing the just-uploaded object, but a failed *upload* itself does not roll back the message row) |
| Partial feedback persistence (Edge Function insert fails after client validation passes) | `feedback.error.submitFailedGeneric` ("Your feedback was not saved. Please try again.") | Manual resubmit; the typed message is cleared only on success (`setMessage("")` runs after the invoke succeeds) — wait, message state: on error the `message` state is untouched only if the `catch` runs before `setMessage("")`; per code order, `setMessage("")` is inside the `try` after the invoke, so on failure the user's typed text is preserved for resubmission | `trackFailure("feedback_submit_failed", err, { feature: "feedback", properties: { category } })` | None — the Edge Function call is atomic (insert or nothing); no risk of a half-written feedback row from the frontend's perspective |
| Google Calendar: `not-connected` | `calendar.disconnectedStatus` / prompts `calendar.connect` | User clicks "Connect Google Calendar" | Not shown wired to telemetry in `google-calendar.ts` itself; likely tracked at the Planner call site | None (read-only feature) |
| Google Calendar: `session-expired` | `calendar.error.sessionExpired` | User reconnects | — | None |
| Google Calendar: `access-expired` | `calendar.error.accessExpired`; token is cleared from `sessionStorage` automatically on `401`/`403` | User must reconnect (`connectGoogleCalendar`) | — | None |
| Google Calendar: `request-failed` | `calendar.error.requestFailed` | User retries "Sync now" | — | None |
| Google Calendar: `manual-linking-disabled` | `calendar.error.manualLinkingDisabled` | Not user-fixable; admin/config issue | — | None |
| Google Calendar: `provider-not-enabled` | `calendar.error.providerNotEnabled` | Not user-fixable; admin/config issue | — | None |
| Google Calendar: `connect-failed` | `calendar.error.connectFailed` | User retries connect | — | None |
| Unsupported browser speech (`speechSupported()` false) | `assistant.audio.unsupported` ("Read-aloud isn't supported in this browser.") | N/A — feature is hidden/disabled, not retried | Not tracked (expected environment limitation, not an error) | None (no data involved) |
| Unsupported language code | No dedicated error path found; `lib/i18n/languages.ts` restricts selection to exactly 7 supported codes via UI (a `<Select>`-style control), so an unsupported code cannot normally be chosen. Any invalid `app_language` value in stored preferences would need a defensive fallback to `DEFAULT_LANGUAGE "en"` — behaviour not explicitly evidenced beyond the documented default. | N/A | Not tracked | None |
| Storage failure / quota exceeded | `settings.storage.deleteError`, `settings.storage.loadError`; quota status comes from the `get_storage_usage_status()` RPC (warning/emergency flags) surfaced in Settings UI, prompting `storage-emergency-cleanup` | User can delete files manually or trigger cleanup | `trackFailure` pattern used elsewhere in Settings (consistent with other `settings.*` errors) | Files are only removed after a successful Storage `remove()` call; on failure nothing is deleted (see `storage-management.ts`, which throws before mutating `documents`/`assistant_attachments` rows on removal failure) |
| Rate limits (any Supabase/Edge Function 429) | No dedicated i18n key found; would fall through to the generic operation-specific `*Error`/`*Failed` key at that call site (e.g. `chat.sendFailed`, `settings.*Error`) since no rate-limit-specific branch exists in the reviewed code | Manual retry after backoff (no automatic backoff implemented) | Same `trackFailure`/`classifyError` path, which captures `error_status` (e.g. `429`) when present on the thrown object | Depends on the specific operation, as above |

## Cross-cutting notes

- `classifyError` (`frontend/src/lib/telemetry.ts`) intentionally strips messages/stack/cause from every `trackFailure` call — see `docs/contracts/EVENT_AND_TELEMETRY_CONTRACT.md` for the exact fields kept (`error_name`, `error_status`, `error_code`).
- No frontend code was found implementing exponential backoff or automatic retry for any of the above; all "retry" behaviour listed is a manual user action (resend, reconnect, resubmit).
- Where a message is described as "raw provider text is logged, never rendered," the evidence is the presence of `console.error(...)` immediately before a localized `setError`/`toast.error` call using an i18n key, per the `UiError` rule in `frontend/src/lib/ui-error.ts`.


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
