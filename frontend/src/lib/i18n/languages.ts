/**
 * The five approved application languages.
 * Anything outside this list is rejected and recovered to English.
 */

export const LANGUAGE_CODES = ["en", "de", "ru", "es", "fr"] as const;

export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export interface LanguageDefinition {
  code: LanguageCode;
  /** Emoji flag shown in the header menu. */
  flag: string;
  /** BCP-47 locale used for date, time and number formatting. */
  locale: string;
  /** Native language name shown in the menu. */
  nativeName: string;
  /** English name, used in documentation-facing UI such as the guide cards. */
  englishName: string;
}

export const LANGUAGES: readonly LanguageDefinition[] = [
  { code: "en", flag: "🇬🇧", locale: "en-GB", nativeName: "English", englishName: "English" },
  { code: "de", flag: "🇩🇪", locale: "de-CH", nativeName: "Deutsch", englishName: "German" },
  { code: "ru", flag: "🇷🇺", locale: "ru-RU", nativeName: "Русский", englishName: "Russian" },
  { code: "es", flag: "🇪🇸", locale: "es-ES", nativeName: "Español", englishName: "Spanish" },
  { code: "fr", flag: "🇫🇷", locale: "fr-CH", nativeName: "Français", englishName: "French" },
] as const;

export const DEFAULT_LANGUAGE: LanguageCode = "en";

export const LANGUAGE_STORAGE_KEY = "alim.app_language";

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && (LANGUAGE_CODES as readonly string[]).includes(value);
}

/** Accepts `de`, `de-CH`, `DE` … and rejects anything unsupported. */
export function normaliseLanguage(value: unknown): LanguageCode {
  if (typeof value !== "string") return DEFAULT_LANGUAGE;
  const base = value.trim().toLowerCase().split(/[-_]/)[0];
  return isLanguageCode(base) ? base : DEFAULT_LANGUAGE;
}

export function languageDefinition(code: LanguageCode): LanguageDefinition {
  return LANGUAGES.find((entry) => entry.code === code) ?? LANGUAGES[0]!;
}

export function localeFor(code: LanguageCode): string {
  return languageDefinition(code).locale;
}
