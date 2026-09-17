Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# `UserPreferences` contract

**Storage location:** `public.user_preferences.preferences` (jsonb), one row per `user_id`
(primary key), row-level-security-scoped to the owner. Reader/writer:
`frontend/src/lib/account-data.ts` (`fetchPreferences`, `savePreferences`,
`frontend/src/lib/account-data.ts:186-235`). Type source: `UserPreferences` interface,
`frontend/src/lib/account-data.ts:43-59`; defaults: `DEFAULT_PREFERENCES`,
`frontend/src/lib/account-data.ts:61-71`.

**Fallback behaviour when the row or a key is absent:** `fetchPreferences()` returns
`DEFAULT_PREFERENCES` outright when signed out or when no `user_preferences` row exists
(`maybeSingle()` returns null). When a row exists but a specific key is missing from the `preferences`
JSON, each key falls back individually to its default (see per-key notes below) rather than the
whole object being defaulted.

**Writer semantics:** `savePreferences(next)` always reads the current merged preferences first,
shallow-merges `next` on top, then `upsert`s the **entire merged object** back into
`preferences` (`onConflict: "user_id"`) — never a raw partial JSON patch.

| Key | Type | Default | Allowed values | Fallback when absent | Reader/writer |
| --- | --- | --- | --- | --- | --- |
| `selected_qwen_model` | `string` | `"Qwen/Qwen3.8-27B"` (first of `QWEN_MODELS`) | one of the 10 `QWEN_MODELS` strings, largest first: `Qwen/Qwen3.8-27B`, `Qwen/Qwen3.5-27B`, `Qwen/Qwen3-14B`, `Qwen/Qwen3.5-9B`, `Qwen/Qwen3-8B`, `Qwen/Qwen3.5-4B`, `Qwen/Qwen3-4B`, `Qwen/Qwen3.5-2B`, `Qwen/Qwen3-1.7B`, `Qwen/Qwen3-0.6B` | any stored value not in `QWEN_MODELS` falls back to the default | `account-data.ts:201-205` |
| `app_language` | `LanguageCode` | `"en"` (`DEFAULT_LANGUAGE`) | exactly 7 codes: `en`, `de`, `gsw`, `ru`, `es`, `fr`, `it` (`frontend/src/lib/i18n/languages.ts`) | `undefined` → `DEFAULT_LANGUAGE`; any other stored value is passed through `normaliseLanguage()` | `account-data.ts:210-213`; authoritative source per `I18nProvider` once signed in; `localStorage` key `alim.app_language` is only a flash-avoidance cache for signed-out users |
| `assistant_reply_language_policy` | `"message_then_app" \| "app_only"` | `"message_then_app"` | `message_then_app`, `app_only` | any stored value other than the literal string `"app_only"` falls back to `"message_then_app"` (`account-data.ts:206-209`) | `account-data.ts`; **BACKEND TODO FOR CODEX** — the local AI backend does not enforce this policy yet |
| `assistant_audio_enabled` | `boolean` | `true` | `true`, `false` | non-boolean stored value → default | `account-data.ts:214`; gates the Listen/Stop control in `lib/speech.ts` consumers |
| `assistant_audio_autoplay` | `boolean` | `false` | `true`, `false` | non-boolean stored value → default | `account-data.ts:215`; autoplays only newly completed assistant messages |
| `exam_reminders` | `boolean` | `true` | `true`, `false` | non-boolean → default | `account-data.ts:216`; settings screen |
| `daily_study_summary` | `boolean` | `true` | `true`, `false` | non-boolean → default | `account-data.ts:217`; settings screen |
| `sound_effects` | `boolean` | `false` | `true`, `false` | non-boolean → default | `account-data.ts:218`; settings screen |
| `language_onboarding_completed` | `boolean` | `false` | `true`, `false` | non-boolean → default | `account-data.ts:224`; set by `/onboarding/language`; gates the language-onboarding step of `resolveStartupDestination()` — CURRENT FRONTEND / CURRENT SUPABASE |

## Reader/writer modules

- **Read:** `fetchPreferences()` (`frontend/src/lib/account-data.ts:186-221`) — used by
  `frontend/src/routes/_authenticated/settings.tsx`, `_authenticated/profile.tsx`, `I18nProvider`
  (for `app_language` once signed in), assistant chat components (for
  `selected_qwen_model`/`assistant_reply_language_policy`/`assistant_audio_*`).
- **Write:** `savePreferences(next)` (`frontend/src/lib/account-data.ts:223-235`) — used by the
  settings screen and any UI control that toggles one of the above keys.

## Backend enforcement status — BACKEND TODO FOR CODEX

The local Python context backend does **not** currently read any `user_preferences` key. In
particular:

- `app_language` — responses are not localized server-side; only client-side speech synthesis and
  UI strings honour it today.
- `assistant_reply_language_policy` — no server-side enforcement of `message_then_app` vs.
  `app_only`; `frontend/src/lib/i18n/detect.ts`'s `effectiveResponseLanguage()` is a **client-only**
  hint (`responseLanguageHint`) and is explicitly **not sent to the backend today**.
- `selected_qwen_model` — not confirmed to be forwarded to `/api/chat` or the context backend
  request body (`ContextChatRequest` in `frontend/src/lib/context-backend.server.ts` does not
  include it per current contract knowledge).
- `assistant_audio_enabled` / `assistant_audio_autoplay` — frontend-only (Web Speech API), never
  backend-relevant.
- **REMOVED:** the per-user `auto_storage_cleanup` preference key no longer exists in
  `user_preferences.preferences` (CURRENT SUPABASE). Storage cleanup is now a platform-wide,
  non-user-disableable scheduled job — see `docs/supabase/STORAGE_LIFECYCLES.md` and
  `docs/supabase/EDGE_FUNCTIONS.md`.
- `selected_qwen_model` is now also read against `public.ai_model_catalog` (CURRENT SUPABASE,
  read-only authenticated table) for the list of selectable models; the stored preference value
  itself is unchanged in shape.

All of the above are BACKEND TODO FOR CODEX: reading and honouring these preference keys server-side
is not yet implemented anywhere in this repository.

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

## Post-login gate — CURRENT (2026-09-17)

Supersedes any statement earlier in this file that language onboarding is a
once-per-account step or that model setup is optional/advisory.

Canonical order after Supabase Auth succeeds:
compliance (durable, once) → **language decision for this browser session**
(select a language or explicit skip) → **model decision for this browser
session** (backend-confirmed `ready`, or an explicit "Continue without AI") →
`/home` and the rest of the product.

- Authentication and non-AI product areas never depend on the local AI backend.
- `user_preferences.preferences.app_language` stays the durable default used to
  preselect the language screen; `language_onboarding_completed` is kept only as
  legacy compatibility metadata and is not a gate.
- `selected_qwen_model` persists a *preference*; readiness comes only from an
  explicit backend `ready` state (`alim.ai_session.v1` in `sessionStorage`).
- The decisions survive a refresh in the same session and are cleared on
  sign-out; direct navigation to a protected route re-runs the same gate.
- AI actions are centrally guarded (`AiFeatureGate` / `useAiBlocked`): blocked
  actions issue no request and show one localized red notice with retry,
  Settings and non-AI paths.

Full contract: `docs/backend-handoff/POST_LOGIN_LANGUAGE_MODEL_GATE_HANDOFF.md`;
sequence: `docs/sequences/POST_LOGIN_STARTUP.mmd`.
