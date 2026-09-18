/**
 * Lightweight, client-safe detection of which approved language a piece of
 * text is written in. Used for the assistant response-language hint and for
 * choosing a speech-synthesis locale.
 *
 * Cyrillic is deterministic. Latin-script languages use bounded stop-word and
 * diacritic scoring; when the signal is weak the caller's fallback (the
 * selected app language) is returned instead of a guess.
 *
 * Swiss German (`gsw`) is scored against Hochdeutsch (`de`) using dialect
 * markers; German text without those markers stays `de`.
 */
import { DEFAULT_LANGUAGE, type LanguageCode } from "./languages";

const CYRILLIC = /[\u0400-\u04FF]/;

/** Small, high-frequency function words per language. */
const STOP_WORDS: Record<Exclude<LanguageCode, "ru">, readonly string[]> = {
  en: [
    "the",
    "and",
    "is",
    "are",
    "you",
    "your",
    "what",
    "how",
    "this",
    "that",
    "with",
    "for",
    "can",
    "please",
    "of",
    "to",
    "in",
    "it",
    "do",
    "does",
    "not",
    "have",
    "help",
    "me",
    "explain",
    "about",
    "exam",
    "question",
  ],
  de: [
    "der",
    "die",
    "das",
    "und",
    "ist",
    "sind",
    "nicht",
    "ich",
    "du",
    "sie",
    "wie",
    "was",
    "mit",
    "für",
    "kann",
    "bitte",
    "ein",
    "eine",
    "auf",
    "von",
    "zu",
    "dass",
    "werden",
    "haben",
    "erkläre",
    "prüfung",
    "frage",
    "mir",
  ],
  gsw: [
    "isch",
    "nöd",
    "nüt",
    "au",
    "gsi",
    "gseh",
    "öppis",
    "öppe",
    "chli",
    "chan",
    "chasch",
    "hät",
    "händ",
    "mier",
    "üs",
    "dänk",
    "grüezi",
    "hoi",
    "zäme",
    "wüki",
    "wüsse",
    "erklär",
    "prüefig",
    "wieso",
    "verstande",
    "ez",
    "gschwind",
    "guet",
  ],
  es: [
    "el",
    "la",
    "los",
    "las",
    "y",
    "es",
    "son",
    "no",
    "yo",
    "tú",
    "cómo",
    "qué",
    "con",
    "para",
    "puedo",
    "por",
    "favor",
    "un",
    "una",
    "de",
    "que",
    "en",
    "del",
    "tengo",
    "explica",
    "examen",
    "pregunta",
    "me",
  ],
  fr: [
    "le",
    "la",
    "les",
    "et",
    "est",
    "sont",
    "ne",
    "je",
    "tu",
    "vous",
    "comment",
    "quoi",
    "avec",
    "pour",
    "peux",
    "s'il",
    "plaît",
    "un",
    "une",
    "de",
    "que",
    "des",
    "du",
    "au",
    "explique",
    "examen",
    "question",
    "moi",
  ],
  it: [
    "il",
    "lo",
    "la",
    "gli",
    "le",
    "e",
    "è",
    "sono",
    "non",
    "io",
    "tu",
    "come",
    "cosa",
    "con",
    "per",
    "posso",
    "favore",
    "un",
    "una",
    "di",
    "che",
    "in",
    "del",
    "ho",
    "spiega",
    "esame",
    "domanda",
    "mi",
  ],
};

/** Characters that are strong hints for a specific Latin-script language. */
const DIACRITIC_HINTS: { code: LanguageCode; pattern: RegExp; weight: number }[] = [
  { code: "de", pattern: /ß/, weight: 3 },
  { code: "de", pattern: /[äöü]/i, weight: 1 },
  { code: "gsw", pattern: /[äöü]/i, weight: 1 },
  { code: "es", pattern: /[ñ¿¡]/i, weight: 3 },
  { code: "es", pattern: /[áíóúé]/i, weight: 1 },
  { code: "fr", pattern: /[çœàèùêîôë]/i, weight: 2 },
  { code: "it", pattern: /[àòùìé]/i, weight: 1 },
  { code: "it", pattern: /(zione|zioni|glia|gli\b)/i, weight: 2 },
];

export interface DetectionResult {
  language: LanguageCode;
  /** True when the text carried enough signal to override the app language. */
  confident: boolean;
}

export function detectLanguage(
  text: string,
  fallback: LanguageCode = DEFAULT_LANGUAGE,
): DetectionResult {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return { language: fallback, confident: false };

  if (CYRILLIC.test(trimmed)) return { language: "ru", confident: true };

  const words = trimmed.toLowerCase().match(/[\p{L}']+/gu) ?? [];
  if (words.length === 0) return { language: fallback, confident: false };

  const scores: Record<LanguageCode, number> = {
    en: 0,
    de: 0,
    gsw: 0,
    ru: 0,
    es: 0,
    fr: 0,
    it: 0,
  };

  for (const word of words) {
    for (const [code, list] of Object.entries(STOP_WORDS)) {
      if (list.includes(word)) scores[code as LanguageCode] += 1;
    }
  }
  for (const hint of DIACRITIC_HINTS) {
    if (hint.pattern.test(trimmed)) scores[hint.code] += hint.weight;
  }

  const ranked = (Object.entries(scores) as [LanguageCode, number][])
    .filter(([code]) => code !== "ru")
    .sort((a, b) => b[1] - a[1]);

  const [best, second] = ranked;
  if (!best || best[1] === 0) return { language: fallback, confident: false };

  // Require a clear winner and a minimum amount of evidence.
  const enoughEvidence = best[1] >= 2 || (words.length <= 4 && best[1] >= 1);
  const clearWinner = !second || best[1] - second[1] >= 1;
  if (!enoughEvidence || !clearWinner) return { language: fallback, confident: false };

  return { language: best[0], confident: true };
}

/**
 * Effective assistant response language: the UI language, unless the message
 * is confidently written in another approved language.
 *
 * This mirrors the Supabase preference `assistant_reply_language_policy =
 * "message_then_app"`. FUTURE BACKEND / CODEX: the local AI backend does not
 * yet consume this metadata — the frontend only prepares and stores it.
 */
export function effectiveResponseLanguage(text: string, uiLanguage: LanguageCode): LanguageCode {
  const detected = detectLanguage(text, uiLanguage);
  return detected.confident ? detected.language : uiLanguage;
}
