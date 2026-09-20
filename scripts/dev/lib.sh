#!/usr/bin/env bash
# Shared, cwd-independent lifecycle helpers for ALIM local services.
set -euo pipefail

ALIM_SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ALIM_REPO_ROOT="$(CDPATH= cd -- "${ALIM_SCRIPT_DIR}/../.." && pwd)"
ALIM_LOCAL_STATE_ROOT="${ALIM_LOCAL_STATE_ROOT:-${ALIM_REPO_ROOT}/.local/alim}"
ALIM_RUN_ROOT="${ALIM_LOCAL_STATE_ROOT}/run"
ALIM_LOG_ROOT="${ALIM_LOCAL_STATE_ROOT}/logs"
mkdir -p "${ALIM_RUN_ROOT}" "${ALIM_LOG_ROOT}"

die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
note() { printf '%s\n' "$*"; }

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Required command is unavailable: $1"
}

require_loopback_host() {
  case "$1" in 127.0.0.1|localhost|::1|'[::1]') ;; *) die "Only a loopback bind is allowed (received: $1)" ;; esac
}

require_port_available() {
  local host="$1" port="$2"
  require_command python3
  python3 -c 'import socket,sys
s=socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try: s.bind((sys.argv[1], int(sys.argv[2])))
except OSError: raise SystemExit(1)
finally: s.close()' "${host}" "${port}" || die "Loopback port ${host}:${port} is already occupied by an unowned process."
}

pid_file() { printf '%s/%s.pid' "${ALIM_RUN_ROOT}" "$1"; }
token_file() { printf '%s/%s.token' "${ALIM_RUN_ROOT}" "$1"; }
log_file() { printf '%s/%s.log' "${ALIM_LOG_ROOT}" "$1"; }

owned_pid() {
  local layer="$1" pid token command_line
  [[ -s "$(pid_file "${layer}")" && -s "$(token_file "${layer}")" ]] || return 1
  pid="$(tr -d '[:space:]' < "$(pid_file "${layer}")")"
  token="$(tr -d '\n' < "$(token_file "${layer}")")"
  [[ "${pid}" =~ ^[0-9]+$ && -n "${token}" ]] || return 1
  command_line="$(ps -p "${pid}" -o command= 2>/dev/null || true)"
  [[ "${command_line}" == *"owned-process.sh"* && "${command_line}" == *"${token}"* ]]
}

clean_stale_state() {
  local layer="$1"
  if [[ -e "$(pid_file "${layer}")" || -e "$(token_file "${layer}")" ]] && ! owned_pid "${layer}"; then
    rm -f -- "$(pid_file "${layer}")" "$(token_file "${layer}")"
    note "Removed stale ${layer} ownership state."
  fi
}

url_ready() {
  curl --fail --silent --show-error --max-time "${ALIM_HEALTH_TIMEOUT_SECONDS:-3}" "$1" >/dev/null
}

wait_url() {
  local url="$1" timeout="${2:-30}" started
  started="$(date +%s)"
  until url_ready "${url}"; do
    (( $(date +%s) - started < timeout )) || return 1
    sleep 1
  done
}

wait_ready() {
  local layer="$1" url="$2" timeout="${3:-60}" started now
  started="$(date +%s)"
  while true; do
    url_ready "${url}" && return 0
    owned_pid "${layer}" || return 1
    now="$(date +%s)"
    (( now - started < timeout )) || return 1
    sleep 1
  done
}

start_managed() {
  local layer="$1" cwd="$2" ready_url="$3" timeout="$4" token pid
  shift 4
  clean_stale_state "${layer}"
  if owned_pid "${layer}"; then
    url_ready "${ready_url}" || die "${layer} is owned but is not ready; inspect $(log_file "${layer}")"
    note "${layer} is already ready (PID $(cat "$(pid_file "${layer}")"))."
    return 0
  fi
  token="alim-${layer}-$(date +%s)-${RANDOM}-${RANDOM}"
  printf '%s\n' "${token}" > "$(token_file "${layer}")"
  : > "$(log_file "${layer}")"
  "${ALIM_SCRIPT_DIR}/owned-process.sh" "${token}" "${cwd}" "$@" >>"$(log_file "${layer}")" 2>&1 &
  pid=$!
  printf '%s\n' "${pid}" > "$(pid_file "${layer}")"
  if ! wait_ready "${layer}" "${ready_url}" "${timeout}"; then
    note "${layer} failed readiness at ${ready_url}; log: $(log_file "${layer}")" >&2
    stop_managed "${layer}" || true
    return 1
  fi
  note "${layer} ready: ${ready_url} (PID ${pid}; log $(log_file "${layer}"))"
}

stop_managed() {
  local layer="$1" pid deadline
  clean_stale_state "${layer}"
  if ! owned_pid "${layer}"; then note "${layer} is stopped."; return 0; fi
  pid="$(cat "$(pid_file "${layer}")")"
  kill -TERM "${pid}"
  deadline=$(( $(date +%s) + ${ALIM_STOP_TIMEOUT_SECONDS:-20} ))
  while kill -0 "${pid}" 2>/dev/null; do
    (( $(date +%s) < deadline )) || break
    sleep 1
  done
  if kill -0 "${pid}" 2>/dev/null && owned_pid "${layer}"; then kill -KILL "${pid}"; fi
  rm -f -- "$(pid_file "${layer}")" "$(token_file "${layer}")"
  note "${layer} stopped."
}

status_managed() {
  local layer="$1" ready_url="$2"
  clean_stale_state "${layer}"
  if owned_pid "${layer}"; then
    if url_ready "${ready_url}"; then
      note "${layer}: ready pid=$(cat "$(pid_file "${layer}")") url=${ready_url} log=$(log_file "${layer}")"
      return 0
    fi
    note "${layer}: starting/unhealthy pid=$(cat "$(pid_file "${layer}")") log=$(log_file "${layer}")"
    return 1
  fi
  note "${layer}: stopped"
  return 3
}
