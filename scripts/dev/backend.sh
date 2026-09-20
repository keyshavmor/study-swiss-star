#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"
layer=backend
if [[ -f "${ALIM_REPO_ROOT}/backend/.env" ]]; then set -a; source "${ALIM_REPO_ROOT}/backend/.env"; set +a; fi
host="${ALIM_BACKEND_HOST:-127.0.0.1}"
port="${ALIM_BACKEND_PORT:-8001}"
url="http://${host}:${port}/health"
require_loopback_host "${host}"

start_layer() {
  require_command curl
  owned_pid "${layer}" || require_port_available "${host}" "${port}"
  if [[ -n "${ALIM_BACKEND_COMMAND:-}" ]]; then
    start_managed "${layer}" "${ALIM_REPO_ROOT}" "${url}" "${ALIM_BACKEND_STARTUP_TIMEOUT_SECONDS:-90}" bash -lc "${ALIM_BACKEND_COMMAND}"
    return
  fi
  local python="${ALIM_REPO_ROOT}/backend/.venv/bin/python"
  [[ -x "${python}" ]] || die "Backend virtual environment is absent; run uv sync --project backend --frozen --all-extras."
  start_managed "${layer}" "${ALIM_REPO_ROOT}" "${url}" "${ALIM_BACKEND_STARTUP_TIMEOUT_SECONDS:-90}" "${python}" -m uvicorn app.main:app --app-dir backend --host "${host}" --port "${port}"
}

case "${1:-}" in
  start) start_layer ;;
  stop) stop_managed "${layer}" ;;
  status) status_managed "${layer}" "${url}" ;;
  health) url_ready "${url}" && printf 'backend ready: %s\n' "${url}" ;;
  *) printf 'Usage: %s {start|stop|status|health}\n' "$0" >&2; exit 64 ;;
esac
