#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"
layer=model
host="${ALIM_MODEL_HOST:-127.0.0.1}"
port="${ALIM_MODEL_PORT:-8000}"
url="http://${host}:${port}/health"
require_loopback_host "${host}"
export ALIM_RUNTIME_STATE_ROOT="${ALIM_RUNTIME_STATE_ROOT:-${ALIM_LOCAL_STATE_ROOT}/model-runtime}"

controller() {
  if [[ -n "${ALIM_MODEL_COMMAND:-}" ]]; then printf '%s' "${ALIM_MODEL_COMMAND}"; return; fi
  printf '%q ' "${ALIM_REPO_ROOT}/backend/.venv/bin/python" "${ALIM_REPO_ROOT}/backend/scripts/model_runtime.py" start
}

case "${1:-}" in
  start)
    require_command curl
    owned_pid "${layer}" || require_port_available "${host}" "${port}"
    if [[ -z "${ALIM_MODEL_COMMAND:-}" && ! -x "${ALIM_REPO_ROOT}/backend/.venv/bin/python" ]]; then
      die "Backend virtual environment is absent; model controller cannot start."
    fi
    start_managed "${layer}" "${ALIM_REPO_ROOT}" "${url}" "${ALIM_MODEL_STARTUP_TIMEOUT_SECONDS:-1800}" bash -lc "$(controller)"
    ;;
  stop)
    if [[ -z "${ALIM_MODEL_COMMAND:-}" && -x "${ALIM_REPO_ROOT}/backend/.venv/bin/python" ]]; then
      "${ALIM_REPO_ROOT}/backend/.venv/bin/python" "${ALIM_REPO_ROOT}/backend/scripts/model_runtime.py" stop >/dev/null 2>&1 || true
    fi
    stop_managed "${layer}"
    ;;
  status) status_managed "${layer}" "${url}" ;;
  health) url_ready "${url}" && printf 'model ready: %s\n' "${url}" ;;
  *) printf 'Usage: %s {start|stop|status|health}\n' "$0" >&2; exit 64 ;;
esac
