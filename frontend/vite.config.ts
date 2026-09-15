// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// CURRENT FRONTEND: the canonical production Supabase project is pinned here.
// The sandbox/preview environment injects a DIFFERENT project through the
// process environment, which overrides frontend/.env and makes the app query a
// schema that has no `account_compliance` (PostgREST PGRST205). Both values are
// public (project URL + publishable key); no secret is inlined.
const CANONICAL_SUPABASE_PROJECT_ID = "ucacmeadsufiedxrgqit";
const CANONICAL_SUPABASE_URL = "https://ucacmeadsufiedxrgqit.supabase.co";
const CANONICAL_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Gg-3CEDaQNptp1QvWsoSSA_eJCqlRM6";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    optimizeDeps: {
      // Prebundle the auth widget with React rather than discovering it during
      // Fast Refresh. Reject stale dependency URLs so Vite reloads the page
      // instead of mixing React instances from different optimizer generations.
      include: ["katex", "katex/contrib/mhchem"],
      ignoreOutdatedRequests: false,
    },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(CANONICAL_SUPABASE_URL),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        CANONICAL_SUPABASE_PUBLISHABLE_KEY,
      ),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(CANONICAL_SUPABASE_PUBLISHABLE_KEY),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(CANONICAL_SUPABASE_PROJECT_ID),
      "process.env.SUPABASE_URL": JSON.stringify(CANONICAL_SUPABASE_URL),
      "process.env.SUPABASE_PUBLISHABLE_KEY": JSON.stringify(CANONICAL_SUPABASE_PUBLISHABLE_KEY),
      "process.env.SUPABASE_PROJECT_ID": JSON.stringify(CANONICAL_SUPABASE_PROJECT_ID),
    },
  },
});
