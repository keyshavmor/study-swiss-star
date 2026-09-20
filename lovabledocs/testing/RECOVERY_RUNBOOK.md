# Local failure and recovery runbook

Preserve evidence first: note the failed layer, UTC time, command, request ID and
`.local/alim/logs/` filename. Never paste tokens, prompts or private documents.

## Triage sequence

1. Run `./scripts/dev/status_all.sh` and `./scripts/dev/stack.sh health`.
2. If one layer is unhealthy, run `scripts/dev/<layer>.sh status` then `health`.
3. Stop only through the owned launcher. Do not kill an unverified PID.
4. Correct the typed cause, restart the smallest failed layer, then health-check
   its dependency chain before retrying the user operation.
5. Reuse the same idempotency key only for the exact same request. Change the key
   after changing payload or intent.

| Symptom | Safe recovery | Do not do |
|---|---|---|
| frontend unavailable/port occupied | identify the listener; stop only if owned, or choose the documented matching loopback port | bind to LAN or substitute a Lovable URL |
| backend live but not ready | inspect model health; non-AI use may continue | interpret `/health` as AI readiness |
| model operation interrupted | restart backend, poll the owned operation; it recovers as typed failed, then explicitly retry preparation | delete/rename artifacts to force “ready” |
| corrupt/partial model | retain logs, remove only the named invalid partial through the model tool, then explicit verified resume/import | accept filename or GGUF header alone |
| disk/memory/GPU pressure | release leases, close other workloads, free verified space, re-run capability/admission | weaken admission floors or fabricate measurements |
| Supabase unavailable | keep local AI data private, retain explicit unsaved/partial state, restore connectivity, retry idempotently | use service-role in browser or claim persistence |
| privacy deletion partial | retain the non-secret receipt/stage status, rerun the incomplete idempotent stage | report full success or manually edit production rows |
| stale PID/state | `status` validates command ownership and removes stale state | signal the numeric PID directly |
| startup partial failure | read named layer log; launcher rolls back only layers it started | stop external hosted Supabase or unrelated processes |

For local database/model/user-data backups, stop the owning processes first.
Local Supabase reset remains blocked until the missing historical migration SQL
is recovered; never point reset tooling at a linked/hosted project.

The recovery flow is maintained visually in
[`FAILURE_RECOVERY_SEQUENCE.mmd`](FAILURE_RECOVERY_SEQUENCE.mmd).
