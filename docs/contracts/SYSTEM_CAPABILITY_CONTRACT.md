# Local system capability + model recommendation — contract

Status: **CURRENT FRONTEND** (types, server function, adapter, UI, truthful
unavailable state) + **FUTURE BACKEND / CODEX** (the probe and the
recommendation engine).

## Accuracy rule

A browser cannot determine GPU VRAM, total physical RAM or local free disk.
The frontend therefore never derives these from `navigator.deviceMemory`,
`navigator.hardwareConcurrency` or the browser storage-quota API. Nullable
fields stay `null` until the local backend reports a measured value.

## Report shape

`frontend/src/lib/system-capability.types.ts`:

- `status`: `pending | ready | unavailable | stale | error`
- `backendConnected`: boolean — false whenever no local backend answered
- `os`: `macOS | Linux | unknown`
- `ram`: `{ total_bytes, available_bytes }` (nullable)
- `gpus[]`: `{ gpu_id, name, vram_total_bytes, vram_available_bytes, accelerator, unified_memory }`
- `runtimeStorage`: `{ total_bytes, available_bytes }` — space available to the
  model runtime, not to the browser
- `loadBalancing`: `{ mode: gpu_only | cpu_gpu_split | unified_memory | cpu_only | unknown, spare_capacity, active_model_processes, constraint_codes[] }`
- `recommendation`: `{ recommended_model_id, alternatives[], rationale_codes[], fit, warning_codes[] }`
  where `fit` is `{ model_id, estimated_bytes, headroom_fraction, reason_code }`
- `measuredAt`, `measurementSource` (`local_backend_probe | local_backend_cache | none`),
  `measurementQuality` (`measured | partial | unknown`)
- `messageCode`: stable code the UI localizes

A `ready` report older than `CAPABILITY_STALE_AFTER_MS` (10 minutes) is
presented as `stale`.

## Future operation semantics (no URL is claimed to exist)

Operation: **probe system capability**. Client abstraction:
`probeSystemCapability` server function → `probeSystemCapabilityOnBackend`
adapter → local backend operation currently referenced as
`/api/system/capability` (POST).

- Input: `{ preferred_model_id: string | null }`, plus the caller's verified
  Supabase bearer JWT forwarded server-to-server and an `X-Student-Id` context
  header (context only, never an authorization boundary).
- Output: the report shape above in snake_case.
- Any 404, timeout, network error or unparsable payload maps to
  `unavailableCapabilityReport()` — status `unavailable`, `backendConnected:
  false`, all hardware fields `null`, `messageCode: backend_unavailable`.

## UI surfaces

- `frontend/src/components/app/SystemCapabilityPanel.tsx`
  - System-compatibility preflight ABOVE the model picker on
    `/onboarding/model`; the returned `recommended_model_id` preselects the
    picker, and hardware values are only shown when measured.
  - The same panel in Settings, with a recheck action, status and timestamp.
- When the backend is absent the panel says so plainly and states that the app
  can be used without AI.

## Authentication independence

AI readiness is NEVER an authentication gate. `resolveStartupDestination()`
only considers suspension, compliance onboarding and language onboarding.
`aiSetupPending()` is advisory: it may offer the AI setup screens, but a
signed-in user always reaches `/home` and every non-AI area.

## Tests

`frontend/src/lib/system-capability.test.ts` covers the unavailable report (no
fabricated values), a normalised `ready` report with recommendation and load
balancing, staleness, and unknown payload shapes mapping to `unavailable`.
`frontend/src/lib/startup-flow.test.ts` proves product access does not depend on
the local backend.
