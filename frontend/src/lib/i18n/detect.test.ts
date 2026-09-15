import { describe, expect, test } from "bun:test";
import { detectLanguage, effectiveResponseLanguage } from "./detect";

describe("assistant response language policy", () => {
  const cases = [
    ["en", "Please explain how this works for the exam"],
    ["de", "Bitte erkläre mir, wie das für die Prüfung funktioniert"],
    ["gsw", "Chasch mier das für d Prüefig erklärä"],
    ["ru", "Пожалуйста, объясни мне этот вопрос"],
    ["es", "Por favor, explica cómo funciona esta pregunta"],
    ["fr", "S'il te plaît, explique comment fonctionne cette question"],
    ["it", "Per favore, mi spiega come funziona questa domanda"],
  ] as const;

  for (const [expected, message] of cases) {
    test(`detects ${expected}`, () => {
      expect(detectLanguage(message, "en")).toEqual({ language: expected, confident: true });
    });
  }

  test("a confidently detected current-message language overrides the UI language", () => {
    expect(effectiveResponseLanguage("Bitte erkläre mir diese Frage", "fr")).toBe("de");
  });

  test("ambiguous and mixed-language input falls back to the selected UI language", () => {
    expect(effectiveResponseLanguage("ATP photosynthesis", "it")).toBe("it");
  });
});
