# Frontend archive manifest — 2026-09-20

Archived files are reference material, are outside `frontend/src`, and must not
be imported or executed. Nothing was deleted.

| Former path | Reason and evidence | Active replacement |
|---|---|---|
| `frontend/src/lib/store/demo-data.ts` | No import, route, test, build-config or runtime reference was found by `rg`; the route inventory already identified `createDemoState` as orphaned. Git history was checked through `0f2f5ef`. | User-created state and the active fixtures in `frontend/src/lib/mock/`. |
| `frontend/package-lock.json` | Root scripts, frontend checks, setup tooling and current docs all select Bun; `package.json` now declares the Bun version and exact `bun.lock` is authoritative. The npm lock also contained a dependency absent from current `package.json`, proving drift. Git history was checked through `a4cec04`. | `frontend/package.json`, `.bun-version`, `.node-version`, and exact `frontend/bun.lock`. |

Restore by reviewing why the active design now needs the file, moving it back to
its former path with an ordinary Git move, repairing its `@/lib/store/types`
import if necessary, adding an explicit consumer, and rerunning frontend tests,
typecheck, lint and build. Do not import from the archive tree.
