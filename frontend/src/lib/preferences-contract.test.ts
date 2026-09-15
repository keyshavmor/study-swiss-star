import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "@/lib/account-data";
import { dictionaries } from "@/lib/i18n/messages";
import { LANGUAGE_CODES } from "@/lib/i18n/languages";

describe("production preference contract", () => {
  it("keeps the production defaults and drops the removed per-user cleanup key", () => {
    expect(DEFAULT_PREFERENCES.app_language).toBe("en");
    expect(DEFAULT_PREFERENCES.language_onboarding_completed).toBe(false);
    expect(DEFAULT_PREFERENCES.selected_qwen_model).toBe("Qwen/Qwen3.8-27B");
    expect("auto_storage_cleanup" in DEFAULT_PREFERENCES).toBe(false);
  });
});

describe("storage capacity copy", () => {
  const keys = [
    "settings.storage.capacity.title",
    "settings.storage.capacity.body",
    "settings.storage.capacity.warning",
    "settings.storage.capacity.warningBody",
  ];

  it("exists in every supported language", () => {
    for (const code of LANGUAGE_CODES) {
      for (const key of keys) {
        expect(String(dictionaries[code][key] ?? "").trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("names the 90% warning and the 80% target", () => {
    const en = dictionaries.en;
    const joined = keys.map((key) => String(en[key] ?? "")).join(" ");
    expect(joined).toMatch(/90/);
    expect(joined).toMatch(/80/);
  });

  it("no longer offers a per-user auto cleanup toggle", () => {
    expect("settings.preferences.autoCleanup.label" in dictionaries.en).toBe(false);
  });
});
