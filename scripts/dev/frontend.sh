#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"
layer=frontend
host="${ALIM_FRONTEND_HOST:-127.0.0.1}"
port="${ALIM_FRONTEND_PORT:-8080}"
url="http://${host}:${port}"
require_loopback_host "${host}"

start_layer() {
  require_command curl
  owned_pid "${layer}" || require_port_available "${host}" "${port}"
  if [[ -n "${ALIM_FRONTEND_COMMAND:-}" ]]; then
    start_managed "${layer}" "${ALIM_REPO_ROOT}/frontend" "${url}" "${ALIM_FRONTEND_STARTUP_TIMEOUT_SECONDS:-90}" bash -lc "${ALIM_FRONTEND_COMMAND}"
    return
  fi
  require_command node
  local vite="${ALIM_REPO_ROOT}/frontend/node_modules/vite/bin/vite.js"
  [[ -f "${vite}" ]] || die "Frontend dependencies are absent; run bun install --frozen-lockfile in frontend/."
  start_managed "${layer}" "${ALIM_REPO_ROOT}/frontend" "${url}" "${ALIM_FRONTEND_STARTUP_TIMEOUT_SECONDS:-90}" node "${vite}" dev --host "${host}" --port "${port}" --strictPort
}

case "${1:-}" in
  start) start_layer ;;
  stop) stop_managed "${layer}" ;;
  status) status_managed "${layer}" "${url}" ;;
  health) url_ready "${url}" && printf 'frontend ready: %s\n' "${url}" ;;
  *) printf 'Usage: %s {start|stop|status|health}\n' "$0" >&2; exit 64 ;;
esac
