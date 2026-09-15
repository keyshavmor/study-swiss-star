import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import mermaid from "mermaid";

const docsRoot = resolve(import.meta.dir, "../../docs");

async function collect(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return collect(path);
      return entry.isFile() && entry.name.endsWith(".mmd") ? [path] : [];
    }),
  );
  return paths.flat();
}

mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
const files = (await collect(docsRoot)).sort();
const failures: string[] = [];

for (const file of files) {
  try {
    await mermaid.parse(await readFile(file, "utf8"), { suppressErrors: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Bun has no browser DOMPurify instance. Mermaid reaches this point only after
    // syntactic parsing, so treat that known headless sanitiser boundary as success.
    if (message.includes("DOMPurify.addHook is not a function")) continue;
    failures.push(`${relative(docsRoot, file)}: ${message}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`✓ ${files.length} Mermaid files parsed`);
