#!/usr/bin/env bash
# Internal wrapper: keeps an ownership token in the process command line.
set -euo pipefail
token="${1:?ownership token required}"
cwd="${2:?working directory required}"
shift 2
[[ $# -gt 0 ]] || { printf 'ERROR: child command required\n' >&2; exit 64; }
child_pid=''
stop_child() {
  if [[ -n "${child_pid}" ]] && kill -0 "${child_pid}" 2>/dev/null; then
    kill -TERM "${child_pid}" 2>/dev/null || true
    wait "${child_pid}" 2>/dev/null || true
  fi
}
trap stop_child INT TERM EXIT
cd "${cwd}"
printf 'owner=%s cwd=%s command=' "${token}" "${cwd}"
printf '%q ' "$@"
printf '\n'
"$@" &
child_pid=$!
wait "${child_pid}"
result=$?
child_pid=''
trap - EXIT
exit "${result}"
