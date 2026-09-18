Document status: CURRENT
Generated from: frontend authority main at f0910e6971f12efe0ad547b904f6e2a518b13856 · live Supabase evidence dated 2026-09-18
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: f0910e6971f12efe0ad547b904f6e2a518b13856

# Internationalisation and language state

Source: `frontend/src/lib/i18n/{languages.ts,detect.ts,format.ts,provider.tsx,index.ts,messages/*}`.

## The 7 approved language codes (CURRENT — FRONTEND)

Source: `frontend/src/lib/i18n/languages.ts`, `LANGUAGE_CODES` /
`LANGUAGES`. Exactly seven, and only these seven — anything else is rejected
and recovered to English by `normaliseLanguage()`:

| code | flag | locale | intlLocale | nativeName | englishName |
|---|---|---|---|---|---|
| `en` | 🇬🇧 | en-GB | en-GB | English | English |
| `de` | 🇩🇪 | de-DE | de-DE | **Hochdeutsch** | Standard German |
| `gsw` | 🇨🇭 | gsw-CH | de-CH | **Schwiizerdütsch** | Swiss German |
| `ru` | 🇷🇺 | ru-RU | ru-RU | Русский | Russian |
| `es` | 🇪🇸 | es-ES | es-ES | Español | Spanish |
| `fr` | 🇫🇷 | fr-CH | fr-CH | Français | French |
| `it` | 🇮🇹 | it-CH | it-CH | Italiano | Italian |

`DEFAULT_LANGUAGE = "en"`.

**`de` vs `gsw` are separate languages with separate copy** — not dialectal
variants of one dictionary. `de` is Standard German (Hochdeutsch); `gsw` is
Swiss German (Schwiizerdütsch). Two rules enforce their separation:

1. **No `ß` in `gsw`.** Swiss German orthography never uses `ß`; the check
   script (`scripts/check-translations.ts`) fails the build if any `gsw`
   dictionary value contains it.
2. **`gsw` has explicit weekday labels**, not `Intl`-derived ones, because
   `Intl` has no dependable `gsw` locale data. `languages.ts`:

   ```ts
   export const GSW_WEEKDAYS_LONG = [
     "Mäntig", "Zischtig", "Mittwuch", "Dunschtig", "Fritig", "Samschtig", "Sunntig",
   ] as const;
   export const GSW_WEEKDAYS_SHORT = ["Mä", "Zi", "Mi", "Du", "Fr", "Sa", "Su"] as const;
   ```

   `gsw`'s `intlLocale` is `de-CH` — used only for non-weekday `Intl` calls
   (e.g. `formatNumber`) where borrowing German/Swiss formatting is
   acceptable; weekday names always take the explicit `gsw` path in
   `lib/i18n/format.ts::formatWeekday` (`if (language === "gsw") { ... }`),
   never the `Intl.DateTimeFormat` fallback used by the other six languages.

REMOVED (per FACTS.md, must not reappear): "five-language wording" — any
older documentation or copy describing five supported languages is stale;
the current and only correct count is seven.

## Message catalogue layout (CURRENT — FRONTEND)

Source directory: `frontend/src/lib/i18n/messages/*`. One dictionary file per
functional area, each exporting a `Record<TranslationKey, string>` per
language (or is combined per-language — see `lib/i18n/messages/index.ts` for
the exact aggregation), covering:

```
assistant.ts  auth.ts      calendar.ts   chat.ts        common.ts
events.ts     feedback.ts  grades.ts     help.ts        home.ts
index.ts      materials.ts misc.ts       nav.ts         notifications.ts
planner.ts    profile.ts   school.ts     settings.ts    states.ts
```

`index.ts` assembles the final `dictionaries: Record<LanguageCode, Record<TranslationKey, string>>`
and the `TranslationKey` union consumed by `useI18n().t(key, vars)`
(`frontend/src/lib/i18n/provider.tsx`). Missing keys fall back to the English
value and log a dev-only `console.warn`; they are never shown as raw keys in
production silently — `translate()` returns the literal key string only as a
last resort placeholder.

### Key-count verification (CURRENT — FRONTEND, verified this pass)

Run from `/dev-server/frontend`:

```
bun run ./scripts/check-translations.ts
```

This pass's output:

```
✓ de — 822 keys, 0 missing
✓ gsw — 822 keys, 0 missing
✓ ru — 822 keys, 0 missing
✓ es — 822 keys, 0 missing
✓ fr — 822 keys, 0 missing
✓ it — 822 keys, 0 missing
✓ gsw contains no "ß"

English key count: 822
All languages complete.
```

The script enforces: every non-English dictionary has exactly the English
(`en`) key set (no missing, no extra, no empty values), and `gsw` never
contains `ß`. It is wired as `check:i18n` in `frontend/package.json` — see
`docs/frontend/FRONTEND_ARCHITECTURE.md`.

## Persistence: Supabase authoritative, localStorage cache only (CURRENT — SUPABASE / CURRENT — FRONTEND)

Source: `frontend/src/lib/i18n/provider.tsx`, header comment is explicit:

> Supabase `user_preferences.preferences.app_language` is authoritative for a
> signed-in user. A localStorage cache only prevents a flash of the wrong
> language and keeps the last chosen language on the signed-out welcome
> screen.

Concretely:

- **Authoritative store:** `public.user_preferences.preferences` (jsonb),
  key `app_language`, read/written via `UserPreferences.app_language` (see
  `docs/frontend/FRONTEND_DATA_MODEL.md` §3). `fetchPreferences()`/
  `savePreferences()` in `lib/account-data.ts` and the provider's own direct
  `supabase.from("user_preferences")` calls both touch this same column.
- **localStorage cache key:** `"alim.app_language"`
  (`LANGUAGE_STORAGE_KEY` in `languages.ts`). Read once, after hydration,
  by `I18nProvider` to avoid a server/client mismatch flash; written every
  time `setLanguage()` runs or the Supabase value loads. It is explicitly
  **not** a source of truth — `writeCachedLanguage()`'s catch comment states
  "storage may be unavailable; the Supabase value stays authoritative".
- For a signed-out user (no `userId` from `supabase.auth.getUser()`), the
  cache is the only language state — there is nothing else to be
  authoritative over.
- On `SIGNED_IN` / `USER_UPDATED` auth events, the provider re-reads
  `user_preferences` and overwrites both React state and the cache — the
  Supabase row always wins once a session exists.

## `documentElement.lang` (CURRENT — FRONTEND)

`I18nProvider` sets `document.documentElement.lang = language` (the 2-3
letter app language code, e.g. `"gsw"`) on every language change:

```ts
useEffect(() => {
  if (typeof document !== "undefined") document.documentElement.lang = language;
}, [language]);
```

Note this sets the raw `LanguageCode` (`"en"`, `"de"`, `"gsw"`, …), not the
richer BCP-47 `locale` field (`"en-GB"`, `"de-DE"`, `"gsw-CH"`, …) that
`localeFor()` produces for `Intl`/speech-synthesis use.

## The four distinct language concepts (CURRENT — FRONTEND)

The frontend deliberately tracks **four separate** language notions. They are
never merged into a single "language" setting:

1. **Interface language** — `UserPreferences.app_language`. Controls every
   translated UI string (`useI18n().t`) and date/number formatting locale.
   Selected explicitly by the user in Settings; persisted per "Persistence"
   above.
2. **User-message language** — the language a student actually typed their
   chat message in, as guessed client-side by
   `lib/i18n/detect.ts::detectLanguage(text, fallback)`. This is a per-message,
   ephemeral classification — never persisted, never shown as a setting.
3. **AI-response language** — the language the assistant's reply *should* be
   in. The frontend computes a **hint** for this
   (`effectiveResponseLanguage(text, uiLanguage)`) but — per
   `context-backend.types.ts`/`account-data.ts` comments — enforcing it is a
   **BACKEND GAP** responsibility today; see "State
   precedence" below.
4. **Speech (TTS) language** — the `speechSynthesis` locale used by
   `lib/speech.ts`, chosen per FACTS.md as "effectiveResponseLanguage else app
   language", respecting `assistant_audio_enabled`, entirely
   BROWSER-ONLY/ephemeral (never persisted, per `speech.ts`'s own docs).

These four can legitimately disagree at any moment: a student with
`app_language = "en"` can type a message in French, expect a French reply,
while the UI chrome around the chat stays in English.

## State precedence (CURRENT — FRONTEND / EXPECTED LOCAL BACKEND CONTRACT)

`lib/i18n/detect.ts::effectiveResponseLanguage`:

```ts
export function effectiveResponseLanguage(text: string, uiLanguage: LanguageCode): LanguageCode {
  const detected = detectLanguage(text, uiLanguage);
  return detected.confident ? detected.language : uiLanguage;
}
```

Precedence rule, in order:

1. **A confidently detected, supported message language wins.**
   `detectLanguage()` returns `{ language, confident: true }` only when
   there's clear signal (Cyrillic is always deterministic → `ru`; Latin
   scripts need `best score ≥ 2`, or `≥ 1` on very short input, plus a clear
   margin over the runner-up — see the stop-word/diacritic scoring in
   `detect.ts`).
2. **Otherwise, the app (interface) language is used** as the fallback —
   both as `detectLanguage`'s own fallback argument and as
   `effectiveResponseLanguage`'s return value when detection isn't confident.

This precedence mirrors the Supabase preference
`assistant_reply_language_policy: "message_then_app"` (the live default; see
`docs/frontend/FRONTEND_DATA_MODEL.md` §3) — "message" (if confident) then
"app". The alternative stored policy value, `"app_only"`, is a valid
Supabase value the frontend *reads and writes*, but **`detect.ts` does not
branch on it today** — `effectiveResponseLanguage` always applies the
message-then-app rule regardless of the stored policy. Wiring
`assistant_reply_language_policy` into `effectiveResponseLanguage` (so
`"app_only"` disables message detection) is unimplemented frontend work, and
actually enforcing whichever policy is selected inside AI responses is
**BACKEND GAP** — per `FACTS.md`: *"response-language
enforcement"* is explicitly listed as NOT implemented in the local Python
backend.

**Status label for this whole precedence mechanism:**
FRONTEND + SUPABASE CONTRACT READY / LOCAL BACKEND IMPLEMENTATION REQUIRED.
The frontend fully computes, stores, and is ready to send a language
hint/policy; no backend code path is verified to consume it.

## Flow diagram 1 — language selector → provider → re-render → Supabase

```mermaid
flowchart TD
  A["User picks a language in Settings"] --> B["SettingsSections calls useI18n().setLanguage(next)"]
  B --> C["I18nProvider.setLanguage: normaliseLanguage(next)"]
  C --> D["setLanguageState(safe) triggers React re-render"]
  C --> E["writeCachedLanguage(safe) -> localStorage alim.app_language"]
  D --> F["useMemo rebuilds I18nValue: t(), formatDate, formatWeekday, ..."]
  F --> G["Every component using useI18n() re-renders with new strings/dates"]
  C --> H["documentElement.lang effect updates <html lang>"]
  C --> I["Async: supabase.auth.getUser()"]
  I --> J{"Signed in?"}
  J -- "no" --> K["Cache-only; nothing written to Supabase"]
  J -- "yes" --> L["Read current user_preferences.preferences row"]
  L --> M["Upsert preferences with app_language: safe merged in"]
  M --> N["public.user_preferences.preferences.app_language updated"]
```

## Flow diagram 2 — user message → detection → hint → expected backend policy → AI response language

```mermaid
flowchart TD
  A["Student types a chat message"] --> B["detectLanguage(text, appLanguage)"]
  B --> C{"Confident match?<br/>(Cyrillic deterministic,<br/>Latin stop-word/diacritic scoring)"}
  C -- "yes" --> D["responseLanguageHint = detected language"]
  C -- "no" --> E["responseLanguageHint = appLanguage (fallback)"]
  D --> F["effectiveResponseLanguage result, CLIENT-ONLY today"]
  E --> F
  F --> G["NOT sent to backend today (FACTS.md: responseLanguageHint is client-only)"]
  H["UserPreferences.assistant_reply_language_policy<br/>(message_then_app default, or app_only)"] --> I["Stored in Supabase user_preferences.preferences"]
  G --> J["EXPECTED: local Python context backend applies policy<br/>and replies in the resolved language"]
  I --> J
  J --> K["BACKEND GAP:<br/>response-language enforcement not verified"]
  K --> L["Frontend renders whatever answer text arrives,<br/>in whatever language the backend actually used"]
```


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
  (FUTURE CODEX IMPLEMENTATION). Unreachable / 404 / timeout / unparsable ⇒
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

## Post-login gate — CURRENT (2026-09-17)

Supersedes any statement earlier in this file that language onboarding is a
once-per-account step or that model setup is optional/advisory.

Canonical order after Supabase Auth succeeds (account suspension pre-empts
everything):
**language decision for this browser session** (select a language or explicit
skip) → **model decision for this browser session** (backend-confirmed `ready`,
or an explicit "Continue without AI") → compliance onboarding *if still
required* (durable, once) → `/home` and the rest of the product.
Ordinary compliance onboarding NEVER appears before the language and model
decisions; a suspended account (`suspended_pending_review`) still outranks all
of them.

- Authentication and non-AI product areas never depend on the local AI backend.
- `user_preferences.preferences.app_language` is a SAVED DEFAULT VISUAL HINT
  only. It never counts as the session selection: Continue on the language screen
  stays disabled until the user clicks a language in this session, or the user
  explicitly skips. `language_onboarding_completed` is kept only as legacy
  compatibility metadata and is not a gate.
- `selected_qwen_model` persists a *preference*; readiness comes only from an
  explicit backend `ready` state (`alim.ai_session.v1` in `sessionStorage`).
- The decisions survive a refresh in the same session and are cleared on
  sign-out; direct navigation to a protected route re-runs the same gate.
- AI actions are centrally guarded (`AiFeatureGate` / `useAiBlocked`): blocked
  actions issue no request and show one localized red notice with retry,
  Settings and non-AI paths.

Full contract: `docs/backend-handoff/POST_LOGIN_LANGUAGE_MODEL_GATE_HANDOFF.md`;
sequence: `docs/sequences/POST_LOGIN_STARTUP.mmd`.
