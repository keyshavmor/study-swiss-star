/**
 * Central i18n provider for the whole frontend.
 *
 * - Supabase `user_preferences.preferences.app_language` is authoritative for a
 *   signed-in user.
 * - A localStorage cache only prevents a flash of the wrong language and keeps
 *   the last chosen language on the signed-out welcome screen.
 * - English is the default and the fallback for any missing key.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  localeFor,
  normaliseLanguage,
  type LanguageCode,
} from "./languages";
import { dictionaries, type TranslationKey } from "./messages";

type Vars = Record<string, string | number>;

export interface I18nValue {
  language: LanguageCode;
  locale: string;
  setLanguage: (next: LanguageCode) => void;
  t: (key: TranslationKey, vars?: Vars) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

const warned = new Set<string>();

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
}

export function translate(language: LanguageCode, key: TranslationKey, vars?: Vars): string {
  const value = dictionaries[language]?.[key] ?? dictionaries[DEFAULT_LANGUAGE][key];
  if (value === undefined) {
    if (import.meta.env.DEV && !warned.has(key)) {
      warned.add(key);
      console.warn(`[i18n] missing translation key: ${key}`);
    }
    return key;
  }
  return interpolate(value, vars);
}

function readCachedLanguage(): LanguageCode {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    return normaliseLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function writeCachedLanguage(language: LanguageCode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    /* storage may be unavailable; the Supabase value stays authoritative */
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  // Apply the cached language after hydration to avoid a server/client mismatch.
  useEffect(() => {
    const cached = readCachedLanguage();
    if (cached !== DEFAULT_LANGUAGE) setLanguageState(cached);
  }, []);

  // Supabase is authoritative for signed-in users.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) return;
      const { data: row, error } = await supabase
        .from("user_preferences")
        .select("preferences")
        .eq("user_id", userId)
        .maybeSingle();
      const stored = row?.preferences;
      const stateValue =
        stored && typeof stored === "object" && !Array.isArray(stored)
          ? (stored as Record<string, unknown>)["app_language"]
          : undefined;
      if (cancelled || error) return;
      const next = normaliseLanguage(stateValue);
      setLanguageState(next);
      writeCachedLanguage(next);
    };

    void load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") void load();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: LanguageCode) => {
    const safe = normaliseLanguage(next);
    setLanguageState(safe);
    writeCachedLanguage(safe);
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) return;
      const { data: row, error } = await supabase
        .from("user_preferences")
        .select("preferences")
        .eq("user_id", userId)
        .maybeSingle();
      // Never overwrite existing preferences when the read failed.
      if (error) return;
      const current =
        row?.preferences && typeof row.preferences === "object" && !Array.isArray(row.preferences)
          ? (row.preferences as Record<string, unknown>)
          : {};
      // A new account may not have a preference row yet.
      await supabase.from("user_preferences").upsert(
        { user_id: userId, preferences: { ...current, app_language: safe } },
        { onConflict: "user_id" },
      );
    })().catch(() => {
      // Offline changes remain cached; never expose provider errors or user data.
    });
  }, []);

  const value = useMemo<I18nValue>(() => {
    const locale = localeFor(language);
    return {
      language,
      locale,
      setLanguage,
      t: (key, vars) => translate(language, key, vars),
      formatDate: (input, options) => {
        const date = input instanceof Date ? input : new Date(input);
        if (Number.isNaN(date.getTime())) return "";
        return new Intl.DateTimeFormat(
          locale,
          options ?? { day: "2-digit", month: "short", year: "numeric" },
        ).format(date);
      },
      formatNumber: (input, options) => new Intl.NumberFormat(locale, options).format(input),
    };
  }, [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (context) return context;
  // Fail safe: render English rather than crashing outside a provider.
  const locale = localeFor(DEFAULT_LANGUAGE);
  return {
    language: DEFAULT_LANGUAGE,
    locale,
    setLanguage: () => {},
    t: (key, vars) => translate(DEFAULT_LANGUAGE, key, vars),
    formatDate: (input, options) =>
      new Intl.DateTimeFormat(locale, options).format(
        input instanceof Date ? input : new Date(input),
      ),
    formatNumber: (input, options) => new Intl.NumberFormat(locale, options).format(input),
  };
}

/** Convenience hook when only the translate function is needed. */
export function useT() {
  return useI18n().t;
}
