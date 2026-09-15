/**
 * Centralised date, time and number presentation for the whole frontend.
 *
 * Presentation rules for every system-owned surface:
 * - date            → `dd/mm/yyyy`
 * - date + weekday   → `<localized weekday>, dd/mm/yyyy`
 * - time             → 24-hour `HH:mm`
 *
 * Textual month names are deliberately not used anywhere in system UI.
 * Only the stored values' presentation changes here — never their timezone
 * semantics or the underlying value.
 */
import {
  GSW_WEEKDAYS_LONG,
  GSW_WEEKDAYS_SHORT,
  intlLocaleFor,
  type LanguageCode,
} from "./languages";

export type DateInput = Date | string | number;

/** Parses `yyyy-mm-dd` at local noon so a day never shifts across timezones. */
function parseInput(value: DateInput): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const fromNumber = new Date(value);
    return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
  }
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (isoDate) {
    return new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]), 12, 0, 0, 0);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Monday-first weekday index (0 = Monday … 6 = Sunday). */
function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** `dd/mm/yyyy` — identical in every language. */
export function formatDate(value: DateInput): string {
  const date = parseInput(value);
  if (!date) return "";
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** `dd/mm` — for dense lists and calendar chips. */
export function formatDateCompact(value: DateInput): string {
  const date = parseInput(value);
  if (!date) return "";
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

/** Localized long weekday name, with explicit Swiss German labels. */
export function formatWeekday(
  value: DateInput,
  language: LanguageCode,
  style: "long" | "short" = "long",
): string {
  const date = parseInput(value);
  if (!date) return "";
  if (language === "gsw") {
    const labels = style === "long" ? GSW_WEEKDAYS_LONG : GSW_WEEKDAYS_SHORT;
    return labels[weekdayIndex(date)]!;
  }
  return new Intl.DateTimeFormat(intlLocaleFor(language), { weekday: style }).format(date);
}

/** `<weekday>, dd/mm/yyyy` — e.g. `Mäntig, 14/09/2026`. */
export function formatWeekdayDate(
  value: DateInput,
  language: LanguageCode,
  style: "long" | "short" = "long",
): string {
  const date = parseInput(value);
  if (!date) return "";
  return `${formatWeekday(date, language, style)}, ${formatDate(date)}`;
}

/** 24-hour `HH:mm`. Accepts a Date or an already-24h `HH:mm` string. */
export function formatTime(value: DateInput): string {
  if (typeof value === "string") {
    const clock = /^(\d{1,2}):(\d{2})/.exec(value);
    if (clock) return `${pad(Number(clock[1]))}:${clock[2]}`;
  }
  const date = parseInput(value);
  if (!date) return "";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `dd/mm/yyyy HH:mm`. */
export function formatDateTime(value: DateInput): string {
  const date = parseInput(value);
  if (!date) return "";
  return `${formatDate(date)} ${formatTime(date)}`;
}

/** `<weekday>, dd/mm/yyyy HH:mm`. */
export function formatWeekdayDateTime(value: DateInput, language: LanguageCode): string {
  const date = parseInput(value);
  if (!date) return "";
  return `${formatWeekdayDate(date, language)} ${formatTime(date)}`;
}

/** `mm/yyyy` — month granularity without a textual month name. */
export function formatMonth(value: DateInput): string {
  const date = parseInput(value);
  if (!date) return "";
  return `${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatNumber(
  value: number,
  language: LanguageCode,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(intlLocaleFor(language), options).format(value);
}
