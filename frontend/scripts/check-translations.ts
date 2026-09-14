/**
 * Translation completeness check.
 *
 * English is the source of truth. Every other supported language must define
 * exactly the same key set in every message area — no missing keys and no
 * unexpected extra keys. Run with `bun run check:i18n`.
 */
import { LANGUAGE_CODES, type LanguageCode } from "../src/lib/i18n/languages";
import { dictionaries } from "../src/lib/i18n/messages";

const english = dictionaries.en;
const englishKeys = Object.keys(english).sort();

let failures = 0;

for (const code of LANGUAGE_CODES) {
  if (code === "en") continue;
  const dictionary = dictionaries[code as LanguageCode] ?? {};
  const keys = new Set(Object.keys(dictionary));
  const missing = englishKeys.filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !(key in english)).sort();
  const empty = englishKeys.filter((key) => keys.has(key) && !String(dictionary[key] ?? "").trim());

  if (missing.length || extra.length || empty.length) {
    failures += 1;
    console.error(`\n✗ ${code}`);
    if (missing.length) console.error(`  missing (${missing.length}): ${missing.join(", ")}`);
    if (extra.length) console.error(`  unexpected (${extra.length}): ${extra.join(", ")}`);
    if (empty.length) console.error(`  empty (${empty.length}): ${empty.join(", ")}`);
  } else {
    console.log(`✓ ${code} — ${englishKeys.length} keys, 0 missing`);
  }
}

// Swiss German must never use the German sharp s.
const gsw = dictionaries.gsw ?? {};
const sharpS = Object.entries(gsw)
  .filter(([, value]) => String(value).includes("ß"))
  .map(([key]) => key);
if (sharpS.length) {
  failures += 1;
  console.error(`\n✗ gsw uses "ß" in ${sharpS.length} key(s): ${sharpS.join(", ")}`);
} else {
  console.log('✓ gsw contains no "ß"');
}

console.log(`\nEnglish key count: ${englishKeys.length}`);
if (failures > 0) {
  console.error(`\n${failures} language check(s) failed.`);
  process.exit(1);
}
console.log("All languages complete.");
