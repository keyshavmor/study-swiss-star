/**
 * The seven approved application languages.
 * Anything outside this list is rejected and recovered to English.
 *
 * `de` is Standard German (Hochdeutsch) and `gsw` is Swiss German
 * (Schwiizerdütsch). They are separate languages with separate copy.
 */

export const LANGUAGE_CODES = ["en", "de", "gsw", "ru", "es", "fr", "it"] as const;

export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export interface LanguageDefinition {
  code: LanguageCode;
  /** Emoji flag shown in the header menu. */
  flag: string;
  /** BCP-47 locale used for date, time and number formatting. */
  locale: string;
  /**
   * Locale actually understood by `Intl` for this language. Swiss German has
   * inconsistent `Intl` coverage, so it borrows German formatting and supplies
   * its own weekday labels.
   */
  intlLocale: string;
  /** Native language name shown in the menu. */
  nativeName: string;
  /** English name, used in documentation-facing UI such as the guide cards. */
  englishName: string;
}

export const LANGUAGES: readonly LanguageDefinition[] = [
  {
    code: "en",
    flag: "🇬🇧",
    locale: "en-GB",
    intlLocale: "en-GB",
    nativeName: "English",
    englishName: "English",
  },
  {
    code: "de",
    flag: "🇩🇪",
    locale: "de-DE",
    intlLocale: "de-DE",
    nativeName: "Hochdeutsch",
    englishName: "Standard German",
  },
  {
    code: "gsw",
    flag: "🇨🇭",
    locale: "gsw-CH",
    intlLocale: "de-CH",
    nativeName: "Schwiizerdütsch",
    englishName: "Swiss German",
  },
  {
    code: "ru",
    flag: "🇷🇺",
    locale: "ru-RU",
    intlLocale: "ru-RU",
    nativeName: "Русский",
    englishName: "Russian",
  },
  {
    code: "es",
    flag: "🇪🇸",
    locale: "es-ES",
    intlLocale: "es-ES",
    nativeName: "Español",
    englishName: "Spanish",
  },
  {
    code: "fr",
    flag: "🇫🇷",
    locale: "fr-CH",
    intlLocale: "fr-CH",
    nativeName: "Français",
    englishName: "French",
  },
  {
    code: "it",
    flag: "🇮🇹",
    locale: "it-CH",
    intlLocale: "it-CH",
    nativeName: "Italiano",
    englishName: "Italian",
  },
] as const;

export const DEFAULT_LANGUAGE: LanguageCode = "en";

export const LANGUAGE_STORAGE_KEY = "alim.app_language";

/**
 * Explicit Swiss German weekday labels. `Intl` has no dependable `gsw` data,
 * so these are used directly instead of a formatted fallback.
 * Index 0 = Monday.
 */
export const GSW_WEEKDAYS_LONG = [
  "Mäntig",
  "Zischtig",
  "Mittwuch",
  "Dunschtig",
  "Fritig",
  "Samschtig",
  "Sunntig",
] as const;

export const GSW_WEEKDAYS_SHORT = ["Mä", "Zi", "Mi", "Du", "Fr", "Sa", "Su"] as const;

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && (LANGUAGE_CODES as readonly string[]).includes(value);
}

/** Accepts `de`, `de-CH`, `DE`, `gsw-CH` … and rejects anything unsupported. */
export function normaliseLanguage(value: unknown): LanguageCode {
  if (typeof value !== "string") return DEFAULT_LANGUAGE;
  const trimmed = value.trim().toLowerCase();
  if (isLanguageCode(trimmed)) return trimmed;
  const base = trimmed.split(/[-_]/)[0];
  return isLanguageCode(base) ? base : DEFAULT_LANGUAGE;
}

export function languageDefinition(code: LanguageCode): LanguageDefinition {
  return LANGUAGES.find((entry) => entry.code === code) ?? LANGUAGES[0]!;
}

/** BCP-47 tag for `document.documentElement.lang` and speech synthesis. */
export function localeFor(code: LanguageCode): string {
  return languageDefinition(code).locale;
}

/** Locale that `Intl` can actually resolve for this language. */
export function intlLocaleFor(code: LanguageCode): string {
  return languageDefinition(code).intlLocale;
}
