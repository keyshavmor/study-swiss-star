#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "${SCRIPT_DIR}/../.." && pwd)"
VERSION_FILE="${REPO_ROOT}/supabase/CLI_VERSION"

usage() {
  printf 'Usage: %s {start|stop|status|health|reset|test}\n' "$0"
}

require_tooling() {
  command -v supabase >/dev/null 2>&1 || {
    printf 'ERROR: Supabase CLI is not installed. Expected version %s.\n' "$(tr -d '[:space:]' < "${VERSION_FILE}")" >&2
    exit 69
  }
  command -v docker >/dev/null 2>&1 || {
    printf 'ERROR: Docker is required for the isolated local Supabase layer.\n' >&2
    exit 69
  }
  docker info >/dev/null 2>&1 || {
    printf 'ERROR: Docker is installed but its daemon is not ready.\n' >&2
    exit 69
  }

  local expected actual
  expected="$(tr -d '[:space:]' < "${VERSION_FILE}")"
  actual="$(supabase --version | tr -d '[:space:]')"
  if [[ "${actual}" != "${expected}" && "${ALIM_ALLOW_SUPABASE_CLI_VERSION_MISMATCH:-0}" != "1" ]]; then
    printf 'ERROR: Supabase CLI %s is installed; this repository pins %s.\n' "${actual}" "${expected}" >&2
    printf 'Set ALIM_ALLOW_SUPABASE_CLI_VERSION_MISMATCH=1 only for an intentional compatibility test.\n' >&2
    exit 65
  fi
}

run_supabase() {
  (cd "${REPO_ROOT}" && supabase "$@")
}

command_name="${1:-}"
case "${command_name}" in
  start)
    require_tooling
    run_supabase start
    run_supabase status
    ;;
  stop)
    command -v supabase >/dev/null 2>&1 || exit 0
    run_supabase stop
    ;;
  status)
    require_tooling
    run_supabase status
    ;;
  health)
    require_tooling
    run_supabase status >/dev/null
    printf 'Supabase local services are reachable through the CLI status check.\n'
    ;;
  reset)
    require_tooling
    if [[ "${ALIM_ALLOW_LOCAL_DB_RESET:-}" != "yes" ]]; then
      printf 'ERROR: local reset requires ALIM_ALLOW_LOCAL_DB_RESET=yes. Never use reset against a linked project.\n' >&2
      exit 64
    fi
    run_supabase db reset --local
    ;;
  test)
    require_tooling
    run_supabase test db
    ;;
  *)
    usage >&2
    exit 64
    ;;
esac
