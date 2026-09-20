#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "${SCRIPT_DIR}/../.." && pwd)"
STATE_ROOT="${ALIM_LOCAL_STATE_ROOT:-${REPO_ROOT}/.local/alim}"
started=()

is_running() { "${SCRIPT_DIR}/$1.sh" status >/dev/null 2>&1; }
start_one() {
  local layer="$1" was_running=0
  is_running "${layer}" && was_running=1
  # Register ownership intent before start so a signal in the readiness-to-return
  # window cannot strand a newly started layer. Stopping absent state is safe.
  (( was_running == 1 )) || started+=("${layer}")
  if ! "${SCRIPT_DIR}/${layer}.sh" start; then rollback; exit 1; fi
}
rollback() {
  local index
  for (( index=${#started[@]}-1; index>=0; index-- )); do
    "${SCRIPT_DIR}/${started[index]}.sh" stop || true
  done
}
start_stack() {
  "${SCRIPT_DIR}/supabase.sh" start
  if [[ "${ALIM_ENABLE_AI:-0}" == 1 ]]; then start_one model; fi
  start_one backend
  start_one frontend
  printf '\nALIM is ready at http://127.0.0.1:%s\n' "${ALIM_FRONTEND_PORT:-8080}"
  printf 'Backend: http://127.0.0.1:%s | Model: %s | Supabase mode: %s\n' "${ALIM_BACKEND_PORT:-8001}" "${ALIM_ENABLE_AI:-0}" "${ALIM_SUPABASE_MODE:-hosted}"
  printf 'Logs: %s | Stop: %s/stop_all.sh\n' "${STATE_ROOT}/logs" "${SCRIPT_DIR}"
}
stop_stack() {
  "${SCRIPT_DIR}/frontend.sh" stop || true
  "${SCRIPT_DIR}/backend.sh" stop || true
  "${SCRIPT_DIR}/model.sh" stop || true
  "${SCRIPT_DIR}/supabase.sh" stop || true
}
status_stack() {
  local result=0
  "${SCRIPT_DIR}/supabase.sh" status || result=1
  [[ "${ALIM_ENABLE_AI:-0}" != 1 ]] || "${SCRIPT_DIR}/model.sh" status || result=1
  "${SCRIPT_DIR}/backend.sh" status || result=1
  "${SCRIPT_DIR}/frontend.sh" status || result=1
  return "${result}"
}
health_stack() {
  "${SCRIPT_DIR}/supabase.sh" health
  [[ "${ALIM_ENABLE_AI:-0}" != 1 ]] || "${SCRIPT_DIR}/model.sh" health
  "${SCRIPT_DIR}/backend.sh" health
  "${SCRIPT_DIR}/frontend.sh" health
}
case "${1:-}" in
  start) trap rollback ERR INT TERM; start_stack; trap - ERR INT TERM ;;
  foreground)
    trap 'rollback; exit 130' INT TERM
    trap rollback ERR
    start_stack
    printf 'Foreground supervisor active; press Ctrl-C to stop only layers started by this run.\n'
    while health_stack >/dev/null 2>&1; do sleep 2; done
    printf 'A component became unhealthy; rolling back this run.\n' >&2
    rollback
    exit 1
    ;;
  stop) stop_stack ;;
  status) status_stack ;;
  health) health_stack ;;
  *) printf 'Usage: %s {start|foreground|stop|status|health}\n' "$0" >&2; exit 64 ;;
esac
