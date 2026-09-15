import { access, readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../..");
const docsRoot = join(repositoryRoot, "docs");
const mirrorRoot = join(repositoryRoot, "lovabledocs");

async function collect(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? collect(path) : [path];
      }),
    )
  ).flat();
}

const docsFiles = (await collect(docsRoot)).sort();
const mirrorFiles = (await collect(mirrorRoot)).sort();
const failures: string[] = [];
const docsRelative = docsFiles.map((file) => relative(docsRoot, file));
const mirrorRelative = mirrorFiles.map((file) => relative(mirrorRoot, file));

if (JSON.stringify(docsRelative) !== JSON.stringify(mirrorRelative)) {
  failures.push("docs/ and lovabledocs/ have different file sets");
} else {
  for (let index = 0; index < docsFiles.length; index += 1) {
    const docsContent = await readFile(docsFiles[index]!);
    const mirrorContent = await readFile(mirrorFiles[index]!);
    if (!docsContent.equals(mirrorContent)) {
      failures.push(`${docsRelative[index]} differs between docs/ and lovabledocs/`);
    }
  }
}

const markdownFiles = [
  ...docsFiles.filter((file) => file.endsWith(".md")),
  join(repositoryRoot, "README.md"),
  join(repositoryRoot, "supabase/README.md"),
];
const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;

for (const file of markdownFiles) {
  const content = await readFile(file, "utf8");
  for (const match of content.matchAll(linkPattern)) {
    let target = match[1]!.trim().replace(/^<|>$/g, "");
    if (!target || target.startsWith("#") || /^[a-z][a-z+.-]*:/i.test(target)) continue;
    target = decodeURIComponent(target.split("#", 1)[0]!);
    try {
      await access(resolve(dirname(file), target));
    } catch {
      failures.push(`${relative(repositoryRoot, file)} -> ${target}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`✓ ${docsFiles.length} docs mirrored byte-for-byte; relative Markdown links resolve`);
