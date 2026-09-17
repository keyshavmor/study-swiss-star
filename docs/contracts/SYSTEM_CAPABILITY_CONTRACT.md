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

AI readiness is NEVER an authentication gate: Supabase Auth completes with no
call to the local backend, and a backend that is absent, 404, slow or unparsable
resolves to `backend_unavailable` rather than a failed login.

The model decision screen IS a mandatory per-session stage
(`/onboarding/language` → `/onboarding/model` → compliance if required →
`/home`), but it can always be satisfied without any backend by an explicit
"Continue without AI", which stores session-scoped non-AI state and unlocks the
whole non-AI product. The screen always also offers retry/recheck and sign out,
so an unreachable backend can never trap a signed-in user.

## Tests

`frontend/src/lib/system-capability.test.ts` covers the unavailable report (no
fabricated values), a normalised `ready` report with recommendation and load
balancing, staleness, and unknown payload shapes mapping to `unavailable`.
`frontend/src/lib/startup-flow.test.ts` proves product access does not depend on
the local backend.


## Post-login gate — CURRENT (2026-09-17)

Supersedes any statement earlier in this file that language onboarding is a
once-per-account step or that model setup is optional/advisory.

Canonical order after Supabase Auth succeeds (account suspension pre-empts
everything):
**language decision for this browser session** (select a language or explicit
skip) → **model decision for this browser session** (backend-confirmed `ready`,
or an explicit "Continue without AI") → compliance onboarding *if still
required* (durable, once) → `/home` and the rest of the product.
Ordinary compliance onboarding NEVER appears before the language and model
decisions; a suspended account (`suspended_pending_review`) still outranks all
of them.

- Authentication and non-AI product areas never depend on the local AI backend.
- `user_preferences.preferences.app_language` stays the durable default used to
  preselect the language screen; `language_onboarding_completed` is kept only as
  legacy compatibility metadata and is not a gate.
- `selected_qwen_model` persists a *preference*; readiness comes only from an
  explicit backend `ready` state (`alim.ai_session.v1` in `sessionStorage`).
- The decisions survive a refresh in the same session and are cleared on
  sign-out; direct navigation to a protected route re-runs the same gate.
- AI actions are centrally guarded (`AiFeatureGate` / `useAiBlocked`): blocked
  actions issue no request and show one localized red notice with retry,
  Settings and non-AI paths.

Full contract: `docs/backend-handoff/POST_LOGIN_LANGUAGE_MODEL_GATE_HANDOFF.md`;
sequence: `docs/sequences/POST_LOGIN_STARTUP.mmd`.
