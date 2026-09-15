Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# Date, time and number presentation

Source: `frontend/src/lib/i18n/format.ts` (presentation), `frontend/src/lib/date-utils.ts`
(calendar math), `frontend/src/lib/i18n/provider.tsx` (`useI18n()` exposure),
`frontend/src/lib/google-calendar.ts` (external calendar timezone handling).

## Presentation rules (CURRENT — FRONTEND)

Stated verbatim in `format.ts`'s header comment:

> - date            → `dd/mm/yyyy`
> - date + weekday   → `<localized weekday>, dd/mm/yyyy`
> - time             → 24-hour `HH:mm`
>
> Textual month names are deliberately not used anywhere in system UI.

These rules are **identical across all 7 languages** — the numeric date/time
format itself does not localize; only the weekday name text localizes (with
`gsw` using explicit labels instead of `Intl`).

## Every helper in `lib/i18n/format.ts`

All helpers accept `DateInput = Date | string | number` and parse it via the
internal `parseInput()`, which special-cases `yyyy-mm-dd` strings to local
noon so a stored calendar date never shifts a day across timezones (see
"Storage timestamp vs API timestamp vs JS Date" below). Every helper returns
`""` for an unparseable input rather than throwing.

### `formatDate(value: DateInput): string`
`dd/mm/yyyy`, identical in every language — no locale parameter.
- `formatDate("2026-09-14")` → `"14/09/2026"` (same output for en/de/gsw/ru/es/fr/it).

### `formatDateCompact(value: DateInput): string`
`dd/mm`, for dense lists/calendar chips.
- `formatDateCompact("2026-09-14")` → `"14/09"`.

### `formatWeekday(value: DateInput, language: LanguageCode, style?: "long" | "short"): string`
Localized weekday name. `gsw` uses the explicit `GSW_WEEKDAYS_LONG` /
`GSW_WEEKDAYS_SHORT` arrays; every other language uses
`Intl.DateTimeFormat(intlLocaleFor(language), { weekday: style })`.
- `formatWeekday("2026-09-14", "en")` → `"Monday"`
- `formatWeekday("2026-09-14", "de")` → `"Montag"`
- `formatWeekday("2026-09-14", "gsw")` → `"Mäntig"`
- `formatWeekday("2026-09-14", "gsw", "short")` → `"Mä"`

### `formatWeekdayDate(value: DateInput, language: LanguageCode, style?: "long" | "short"): string`
`<weekday>, dd/mm/yyyy`.
- `formatWeekdayDate("2026-09-14", "gsw")` → `"Mäntig, 14/09/2026"`
- `formatWeekdayDate("2026-09-14", "fr")` → `"lundi, 14/09/2026"`

### `formatTime(value: DateInput): string`
24-hour `HH:mm`. Accepts a `Date`, or a string already starting `HH:mm`
(re-padded to 2 digits), which lets it safely re-format planner time strings
like `"9:00"` without constructing a `Date`.
- `formatTime(new Date(2026, 8, 14, 9, 5))` → `"09:05"`
- `formatTime("9:05")` → `"09:05"`
- Identical across all 7 languages — no locale parameter.

### `formatDateTime(value: DateInput): string`
`dd/mm/yyyy HH:mm`.
- `formatDateTime("2026-09-14T09:05:00")` → `"14/09/2026 09:05"`.

### `formatWeekdayDateTime(value: DateInput, language: LanguageCode): string`
`<weekday>, dd/mm/yyyy HH:mm`.
- `formatWeekdayDateTime("2026-09-14T09:05:00", "gsw")` → `"Mäntig, 14/09/2026 09:05"`.

### `formatMonth(value: DateInput): string`
`mm/yyyy` — month granularity **without a textual month name** (the "no
textual month" rule applied at helper level).
- `formatMonth("2026-09-14")` → `"09/2026"`, same in every language.

### `formatNumber(value: number, language: LanguageCode, options?: Intl.NumberFormatOptions): string`
The only helper that actually varies its `Intl` locale by language (via
`intlLocaleFor(language)`), for grouping/decimal separator conventions (e.g.
grade averages).
- `formatNumber(5.25, "de")` → `"5,25"`
- `formatNumber(5.25, "en")` → `"5.25"`

All of the above are re-exposed, curried with the current app language, on
`useI18n()` (`frontend/src/lib/i18n/provider.tsx`) as
`formatDate`/`formatDateCompact`/`formatWeekday`/`formatWeekdayDate`/
`formatTime`/`formatDateTime`/`formatWeekdayDateTime`/`formatMonth`/
`formatNumber` — components never import `lib/i18n/format.ts` directly, they
call `useI18n()`.

## Which components/routes use which helper (verified with `rg`)

Verified 2026-09-14 by `rg -n "format(Date|Time|Weekday|Month|Number)"` across
`frontend/src`:

| Helper | Used in |
|---|---|
| `formatWeekdayDate` | `components/app/EventDetailDialog.tsx`, `components/app/LiveClock.tsx` |
| `formatWeekday` | `components/app/EventDetailDialog.tsx`, `components/app/EventDialog.tsx`, `routes/_authenticated/planner.tsx` |
| `formatTime` | `components/app/GoogleCalendarCard.tsx`, `components/app/LiveClock.tsx` |
| `formatDate` | `components/app/SubjectCard.tsx`, `routes/_authenticated/home.tsx`, `routes/_authenticated/profile.tsx`, `routes/_authenticated/school.$subject.tsx`, `routes/_authenticated/stats.tsx` |
| `formatDateCompact` | `routes/_authenticated/planner.tsx` (occurrence chips, week/month range header) |
| `formatMonth` | `routes/_authenticated/planner.tsx` (month-view header), `routes/_authenticated/school.$subject.tsx` (grade-trend chart labels) |
| `formatDateTime` / `formatWeekdayDateTime` / `formatNumber` | no direct call sites found outside `format.ts`/`provider.tsx` at this commit — exposed on `useI18n()` but not currently consumed by any component `rg` matched |

`lib/grade-math.ts` and `lib/notifications.ts` also matched the search
pattern but for unrelated reasons (grade-boundary math and notification
de-duplication, not date formatting) — confirmed by inspection, not
date/time helper usage.

## Storage timestamp vs API timestamp vs JS Date vs displayed value

Four distinct representations of "when", each with a specific owner:

1. **Storage timestamp** — what Postgres/Supabase actually persists.
   Timestamptz columns (`created_at`, `updated_at`, `occurred_at`,
   `delete_after`, `deleted_at` in `integrations/supabase/types.ts`) are ISO
   8601 UTC strings. Calendar-only fields the frontend owns directly (e.g.
   `PlannerEvent.date`, `Assessment.date` in `lib/store/types.ts`) are plain
   `yyyy-mm-dd` strings with **no time or zone component at all** — a
   deliberate choice so a Thursday study session stays on Thursday regardless
   of the viewer's timezone (see `date-utils.ts` header comment).
2. **API timestamp** — the shape crossing the `/api/chat` boundary
   (`ContextChatResponse.created_at`) and Google Calendar API responses
   (`start.dateTime`/`start.date`, RFC 3339) — both ISO 8601 strings, handled
   as opaque strings until parsed.
3. **JS `Date`** — the only form any arithmetic happens on. `date-utils.ts`'s
   `fromIso()` parses a `yyyy-mm-dd` string at **local noon**
   (`new Date(y, m-1, d, 12, 0, 0, 0)`) specifically to dodge any
   DST/timezone edge that could roll the date backward or forward a day.
   `format.ts`'s `parseInput()` does the same for the same reason. Neither
   file ever calls `Date.UTC` or treats a bare `yyyy-mm-dd` as UTC midnight.
4. **Displayed value** — always the output of one `lib/i18n/format.ts`
   helper (`dd/mm/yyyy`, `HH:mm`, etc.), never a raw `Date#toString()` or
   `Intl` call inlined in a component.

Net effect: a planner event's `date` field is a timezone-less calendar day
end-to-end (Supabase text column → `fromIso` local-noon `Date` → `formatDate`
string) — it is never converted through UTC. Only genuinely instant-in-time
values (message `created_at`, Google event `dateTime`) carry real UTC/offset
information, and those are converted to the *viewer's* local wall-clock time
for display (see `google-calendar.ts`'s `localIsoDate`/`localTime` below),
never shown in UTC.

## Timezone semantics

- **Calendar-only frontend data** (planner events, assessments, materials'
  `added` field, `StudentProfile.dateOfBirth`): timezone-less by design —
  a `yyyy-mm-dd` string, parsed at local noon, so no timezone conversion ever
  applies to it.
- **True instants** (Supabase `timestamptz` columns, `ContextChatResponse.created_at`,
  Google Calendar `dateTime` fields): stored/transmitted as UTC ISO 8601,
  converted to the browser's local timezone only at the moment of display via
  `new Date(...)` + a `format.ts` helper (or, for Google Calendar events, via
  the module's own `localIsoDate`/`localTime`, see below). The frontend never
  performs its own timezone-offset math — it always defers to the JS `Date`
  object's local getters (`getHours()`, `getDate()`, etc.).

## Google Calendar timezone behaviour (`lib/google-calendar.ts`)

Read-only integration; per its header comment, the Google account is linked
via `supabase.auth.linkIdentity` with the read-only Calendar scope, and the
provider token lives only in `sessionStorage` for the current browser
session.

- **All-day events** (`raw.start.date` present, no time component) are mapped
  straight through as a bare date string with a fixed `"00:00"`–`"23:59"`
  synthetic time window — no timezone conversion happens because there is no
  time-of-day to convert:
  ```ts
  if (raw.start?.date) {
    return { id, title, date: raw.start.date, start: "00:00", end: "23:59", allDay: true, ... };
  }
  ```
- **Timed events** (`raw.start.dateTime`, an RFC 3339 instant with an offset)
  are parsed with `new Date(raw.start.dateTime)` and then read back out using
  **local** getters (`toEvent()`'s `localIsoDate`/`localTime` helpers) — i.e.
  Google's UTC/offset instant is converted to the viewer's browser-local
  wall-clock date and time, exactly once, at ingestion:
  ```ts
  function localIsoDate(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  function localTime(date: Date): string {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  ```
- If an event's end instant falls on a different local calendar day than its
  start, the frontend clamps its displayed end time to `"23:59"` rather than
  showing a start time later than end:
  ```ts
  const sameDayEnd = localIsoDate(endDate) === localIsoDate(startDate) ? localTime(endDate) : "23:59";
  ```
- The two range-query bounds sent to the Google API (`fetchGoogleCalendarEvents`)
  are constructed from local `T00:00:00`/`T23:59:59` boundaries and converted
  to ISO/UTC via `.toISOString()` before being sent — so the *query window* is
  timezone-aware (local day boundaries expressed in UTC), while the *returned
  events* are converted back to local time as described above.
- `googleOccurrences()` then wraps each mapped event into a read-only
  `PlannerEvent` (`externalSource: "google"`, `readOnly: true`) merged for
  display only — never written into the editable planner state, and its
  `date`/`start`/`end` fields at that point are already the same
  timezone-less local strings used everywhere else in the planner, so all
  downstream formatting goes through the same `lib/i18n/format.ts` helpers.

## The no-textual-month rule

Restated because it is easy to violate accidentally: **no component may print
a textual month name** (e.g. "September") in system UI. `formatMonth()`
enforces this at the helper level by emitting `mm/yyyy` instead of a month
name, and `formatDate`/`formatDateCompact`/`formatWeekdayDate` never include
a month name either — only the localized *weekday* name is ever spelled out
as a word. Any future helper or component that calls
`Intl.DateTimeFormat(..., { month: "long" | "short" })` would violate this
documented rule; none currently do (`rg -n "month:" frontend/src/lib/i18n/format.ts`
returns nothing).

## Known exception: `durationLabel` in `lib/date-utils.ts` — NOT localised

```ts
export function durationLabel(start: string, end: string): string {
  const total = minutesOf(end) - minutesOf(start);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
```

This hard-codes the English abbreviations `"min"` and `"h"` for every
language — it does not go through `useI18n().t()` or any per-language
dictionary, unlike every other user-facing date/time string in the app. It is
used in `components/app/EventDetailDialog.tsx` and
`routes/_authenticated/{home,planner}.tsx` to show an event's duration (e.g.
`"1 h 30 min"`) regardless of the active app language.

**This is a recorded, deliberate exception — do not change it as part of any
i18n or date/time documentation pass.** If it needs to be localized in the
future, that is a separate, explicit product decision, not an oversight to
silently "fix".
