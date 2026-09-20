#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"
mode="${ALIM_SUPABASE_MODE:-hosted}"
action="${1:-}"

load_env() {
  if [[ -f "${ALIM_REPO_ROOT}/backend/.env" ]]; then set -a; source "${ALIM_REPO_ROOT}/backend/.env"; set +a; fi
}
hosted_health() {
  load_env
  local health_url="${ALIM_SUPABASE_HEALTH_URL:-${SUPABASE_URL:-}/auth/v1/health}"
  local publishable_key="${SUPABASE_PUBLISHABLE_KEY:-}"
  [[ "${health_url}" =~ ^https:// || "${ALIM_ALLOW_LOOPBACK_HOSTED_SUPABASE_TEST:-0}" == 1 ]] || die "Hosted SUPABASE_URL must use HTTPS."
  [[ -n "${publishable_key}" ]] || die "SUPABASE_PUBLISHABLE_KEY is required for hosted health."
  local started="$(date +%s)" timeout="${ALIM_SUPABASE_STARTUP_TIMEOUT_SECONDS:-30}"
  until curl --fail --silent --show-error --max-time "${ALIM_HEALTH_TIMEOUT_SECONDS:-3}" \
    --header "apikey: ${publishable_key}" "${health_url}" >/dev/null; do
    (( $(date +%s) - started < timeout )) || return 1
    sleep 1
  done
}
case "${mode}" in
  local)
    case "${action}" in start|stop|status|health) "${ALIM_REPO_ROOT}/supabase/scripts/local.sh" "${action}" ;; *) exit 64 ;; esac
    ;;
  hosted)
    case "${action}" in
      start|health) hosted_health && printf 'hosted Supabase reachable\n' ;;
      status) hosted_health && printf 'supabase: hosted/reachable\n' ;;
      stop) printf 'supabase: hosted service is external; nothing stopped\n' ;;
      *) printf 'Usage: %s {start|stop|status|health}\n' "$0" >&2; exit 64 ;;
    esac
    ;;
  *) die "ALIM_SUPABASE_MODE must be hosted or local" ;;
esac
