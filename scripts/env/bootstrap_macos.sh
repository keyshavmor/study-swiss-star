#!/usr/bin/env bash
# Apple-silicon validation/bootstrap. Never installs Homebrew or invokes sudo.
set -euo pipefail
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "${SCRIPT_DIR}/../.." && pwd)"
action="${1:---check}"
(( EUID != 0 )) || { printf 'ERROR: do not run this repository bootstrap as root.\n' >&2; exit 77; }
[[ "$(uname -s)" == Darwin ]] || { printf 'ERROR: bootstrap_macos.sh requires macOS.\n' >&2; exit 65; }
[[ "$(uname -m)" == arm64 ]] || { printf 'ERROR: only Apple-silicon macOS (including M4) is supported.\n' >&2; exit 65; }
major="$(sw_vers -productVersion | cut -d. -f1)"
[[ "${major}" == 15 || "${major}" == 26 ]] || { printf 'ERROR: supported macOS majors are 15 and 26; detected %s.\n' "${major}" >&2; exit 65; }
missing=0
need() { command -v "$1" >/dev/null 2>&1 || { printf 'MISSING: %s — %s\n' "$1" "$2" >&2; missing=1; }; }
need xcode-select 'run xcode-select --install interactively'
need git 'install Apple Command Line Tools'
need curl 'install Apple Command Line Tools'
need python3 'install Python 3.11 with a per-user manager or Homebrew'
need uv 'install the pinned uv release described in the operator guide'
need node 'install Node 22 with a per-user version manager'
need bun 'install Bun 1.4.2 in the user account'
if [[ "${ALIM_SUPABASE_MODE:-hosted}" == local ]]; then
  need docker 'install and start Docker Desktop'
  need supabase "install CLI $(tr -d '[:space:]' < "${REPO_ROOT}/supabase/CLI_VERSION") with Homebrew"
fi
if (( missing )); then printf 'No changes were made. Resolve prerequisites, then rerun.\n' >&2; exit 69; fi
[[ "$(node -p 'process.versions.node.split(`.`)[0]')" == 22 ]] || { printf 'ERROR: Node 22 is required.\n' >&2; exit 65; }
[[ "$(bun --version)" == "$(cat "${REPO_ROOT}/frontend/.bun-version")" ]] || { printf 'ERROR: Bun %s is required.\n' "$(cat "${REPO_ROOT}/frontend/.bun-version")" >&2; exit 65; }
[[ "$(uv --version)" == "uv 0.12.13" ]] || { printf 'ERROR: uv 0.12.13 is required by backend/environment.yml.\n' >&2; exit 65; }
printf 'macOS %s/arm64 prerequisites passed; Metal is selected by the model manifest; no root action was taken.\n' "${major}"
case "${action}" in
  --check) ;;
  --setup)
    (cd "${REPO_ROOT}" && uv sync --project backend --frozen --all-extras)
    (cd "${REPO_ROOT}/frontend" && bun install --frozen-lockfile)
    printf 'Repository-local backend and frontend environments are ready.\n'
    ;;
  *) printf 'Usage: %s [--check|--setup]\n' "$0" >&2; exit 64 ;;
esac
