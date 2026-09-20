#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "${SCRIPT_DIR}/../.." && pwd)"
case "${1:-}" in
  start|health)
    command -v bun >/dev/null 2>&1 || { printf 'ERROR: Bun is required for docs/quality checks.\n' >&2; exit 69; }
    (cd "${REPO_ROOT}" && bun frontend/scripts/validate-docs.ts)
    (cd "${REPO_ROOT}" && bun frontend/scripts/validate-mermaid.ts)
    (cd "${REPO_ROOT}/frontend" && bun run check:i18n)
    printf 'documentation, Mermaid and i18n contract checks passed\n'
    ;;
  status) printf 'docs/E2E tooling is on-demand (no daemon)\n' ;;
  stop) printf 'docs/E2E tooling is on-demand (nothing to stop)\n' ;;
  *) printf 'Usage: %s {start|stop|status|health}\n' "$0" >&2; exit 64 ;;
esac
