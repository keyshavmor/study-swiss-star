#!/usr/bin/env bash
# Validate or create repository-local application environments; never invokes sudo.
set -euo pipefail
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "${SCRIPT_DIR}/../.." && pwd)"
action="${1:---check}"
(( EUID != 0 )) || { printf 'ERROR: do not run this repository bootstrap as root.\n' >&2; exit 77; }
[[ "$(uname -s)" == Linux ]] || { printf 'ERROR: use bootstrap_macos.sh on macOS.\n' >&2; exit 65; }
arch="$(uname -m)"
[[ "${arch}" == x86_64 || "${arch}" == aarch64 ]] || { printf 'ERROR: unsupported Ubuntu architecture: %s\n' "${arch}" >&2; exit 65; }
version='unknown'
if [[ -r /etc/os-release ]]; then . /etc/os-release; version="${VERSION_ID:-unknown}"; fi
[[ "${ID:-}" == ubuntu ]] || { printf 'ERROR: this bootstrap supports Ubuntu only.\n' >&2; exit 65; }
case "${version}" in 24.04|26.04) ;; *) printf 'ERROR: supported Ubuntu LTS releases are 24.04 and 26.04; detected %s.\n' "${version}" >&2; exit 65 ;; esac

missing=0
need() { command -v "$1" >/dev/null 2>&1 || { printf 'MISSING: %s — %s\n' "$1" "$2" >&2; missing=1; }; }
need git 'install with apt after administrator review'
need curl 'install with apt after administrator review'
need python3 'install Python 3.11 with a version manager or reviewed packages'
need uv 'install the pinned uv release described in the operator guide'
need node 'install Node 22 using a per-user version manager'
need bun 'install Bun 1.4.2 in the user account'
if [[ "${ALIM_SUPABASE_MODE:-hosted}" == local ]]; then
  need docker 'install Docker Engine/Desktop and grant the user reviewed access'
  need supabase "install CLI $(tr -d '[:space:]' < "${REPO_ROOT}/supabase/CLI_VERSION") from its signed package"
fi
if (( missing )); then
  printf 'No changes were made. Resolve prerequisites, then rerun this script.\n' >&2
  exit 69
fi
[[ "$(node -p 'process.versions.node.split(`.`)[0]')" == 22 ]] || { printf 'ERROR: Node 22 is required.\n' >&2; exit 65; }
[[ "$(bun --version)" == "$(cat "${REPO_ROOT}/frontend/.bun-version")" ]] || { printf 'ERROR: Bun %s is required.\n' "$(cat "${REPO_ROOT}/frontend/.bun-version")" >&2; exit 65; }
[[ "$(uv --version)" == "uv 0.12.13" ]] || { printf 'ERROR: uv 0.12.13 is required by backend/environment.yml.\n' >&2; exit 65; }
printf 'Ubuntu %s/%s prerequisites passed; no root action was taken.\n' "${version}" "${arch}"
case "${action}" in
  --check) ;;
  --setup)
    (cd "${REPO_ROOT}" && uv sync --project backend --frozen --all-extras)
    (cd "${REPO_ROOT}/frontend" && bun install --frozen-lockfile)
    printf 'Repository-local backend and frontend environments are ready.\n'
    ;;
  *) printf 'Usage: %s [--check|--setup]\n' "$0" >&2; exit 64 ;;
esac
