Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

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
   **BACKEND IMPLEMENTATION UNKNOWN** responsibility today; see "State
   precedence" below.
4. **Speech (TTS) language** — the `speechSynthesis` locale used by
   `lib/speech.ts`, chosen per FACTS.md as "effectiveResponseLanguage else app
   language", respecting `assistant_audio_enabled`, entirely
   BROWSER-ONLY/ephemeral (never persisted, per `speech.ts`'s own docs).

These four can legitimately disagree at any moment: a student with
`app_language = "en"` can type a message in French, expect a French reply,
while the UI chrome around the chat stays in English.

## State precedence (CURRENT — FRONTEND / EXPECTED BACKEND CONTRACT)

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
**BACKEND IMPLEMENTATION UNKNOWN** — per `FACTS.md`: *"response-language
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
  J --> K["BACKEND IMPLEMENTATION UNKNOWN:<br/>response-language enforcement not verified"]
  K --> L["Frontend renders whatever answer text arrives,<br/>in whatever language the backend actually used"]
```
