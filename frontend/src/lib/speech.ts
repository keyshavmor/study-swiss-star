/**
 * Browser-only text-to-speech for assistant responses.
 *
 * Uses the Web Speech API (`window.speechSynthesis`). Nothing is uploaded and
 * nothing is stored: generated speech is ephemeral by design. The local AI
 * backend is NOT involved and does not produce audio today.
 */
import { detectLanguage } from "./i18n/detect";
import { localeFor, type LanguageCode } from "./i18n/languages";

export function speechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
}

export function availableVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported()) return [];
  try {
    return window.speechSynthesis.getVoices();
  } catch {
    return [];
  }
}

/** Picks the speech locale from the response text, falling back to the UI language. */
export function speechLocaleFor(text: string, uiLanguage: LanguageCode): string {
  const detected = detectLanguage(text, uiLanguage);
  return localeFor(detected.confident ? detected.language : uiLanguage);
}

function voiceForLocale(locale: string): SpeechSynthesisVoice | undefined {
  const voices = availableVoices();
  if (voices.length === 0) return undefined;
  const base = locale.split("-")[0]!.toLowerCase();
  return (
    voices.find((voice) => voice.lang.toLowerCase() === locale.toLowerCase()) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(base))
  );
}

export type SpeakOutcome = "spoken" | "unsupported" | "no-voice" | "error";

export interface SpeakOptions {
  text: string;
  uiLanguage: LanguageCode;
  onEnd?: () => void;
}

/**
 * Speaks the given text. Returns synchronously whether playback actually
 * started, so callers never claim audio played when it did not.
 */
export function speak({ text, uiLanguage, onEnd }: SpeakOptions): SpeakOutcome {
  if (!speechSupported()) return "unsupported";
  const trimmed = text.trim();
  if (!trimmed) return "error";

  const locale = speechLocaleFor(trimmed, uiLanguage);
  const voices = availableVoices();
  const voice = voiceForLocale(locale);
  // Voices can be empty until the engine loads them; that is not a failure.
  if (voices.length > 0 && !voice) return "no-voice";

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.lang = locale;
    if (voice) utterance.voice = voice;
    if (onEnd) {
      utterance.onend = () => onEnd();
      utterance.onerror = () => onEnd();
    }
    window.speechSynthesis.speak(utterance);
    return "spoken";
  } catch {
    return "error";
  }
}

export function stopSpeaking(): void {
  if (!speechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* nothing to cancel */
  }
}
