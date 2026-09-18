# Post-login language + model gate — authoritative handoff

Status: **CURRENTLY IMPLEMENTED FRONTEND** (this Lovable task) +
**REQUIRED FUTURE BACKEND (CODEX)**.
Verified against production Supabase `ucacmeadsufiedxrgqit` on 2026-09-17.
No Python/local-backend code was written or changed in this task.

## 1. Canonical startup sequence (implemented in the frontend)

```
Supabase Auth success
  → suspended-account interception (safety/account control; pre-empts everything)
  → SESSION language decision  (explicit selection OR explicit skip)
  → MODEL screen: backend system probe + recommendation + prepare/load
       ├─ backend confirms READY for the selected model → AI-ready session
       └─ explicit "Continue without AI"                → non-AI session
  → compliance/safety onboarding IF still required (once, durable Supabase flag)
  → /home and the rest of the product
```

This is the order implemented by `resolveStartupDestination()` in
`frontend/src/lib/startup-flow.ts`. Ordinary compliance onboarding comes AFTER
the language and model decisions, never before them. Only a suspended account
is intercepted earlier.

Facts that the backend must not contradict:

- Authentication never depends on the local AI backend. A missing/failing
  backend can never block sign-in or product access.
- The model screen is a mandatory **decision** gate per browser session, not an
  availability gate. There is **no separate mandatory system-admission screen**;
  capability, admission and recommendation data are rendered on the model screen.
- The frontend switches to AI-ready **only** on an explicit backend `ready`
  state for the selected model. A persisted `selected_qwen_model` preference is
  never proof of readiness.
- The language decision is per browser session, **never once per account**. A
  persisted `app_language` is rendered as a saved default hint only: Continue
  stays disabled until the user clicks a language in this session, or the user
  explicitly skips. `language_onboarding_completed` is legacy metadata and never
  gates the screen.
- Neither persisted preference marks a session decision as complete.
- Model preparation is never auto-started from a persisted preference: the
  capability report and the ADVISORY recommendation are shown first, and the user
  presses prepare.

## 2. Session vs durable state

| State | Owner | Storage |
| --- | --- | --- |
| `app_language` (SAVED DEFAULT HINT only) | Supabase | `user_preferences.preferences.app_language` |
| `selected_qwen_model` (preferred model) | Supabase | `user_preferences.preferences.selected_qwen_model` |
| `language_onboarding_completed` | Supabase | LEGACY profile metadata only — **not** a gate |
| Language decision for this session | Frontend | `sessionStorage` `alim.language_session.v1` |
| AI decision (`ai-ready` \| `non-ai`) | Frontend | `sessionStorage` `alim.ai_session.v1` |
| Admission lease (optional) | Frontend | `sessionStorage` `alim.admission_session.v1` |
| Model/GPU readiness | Local backend | never persisted in Supabase |

Sign-out clears every session key. A refresh in the same authenticated browser
session keeps the decisions; a fresh sign-in requires both again.

## 3. Endpoints the future backend must implement

All calls go browser → TanStack server function → local backend, forwarding the
verified Supabase bearer JWT. `X-Student-Id` is context only, never an
authorization boundary. No service-role key is ever involved.

### 3.1 System capability probe — `POST /api/system/capability`

Request body (exactly what `probeSystemCapabilityOnBackend` sends):

```json
{
  "preferred_model_id": "Qwen/Qwen3.8-27B",
  "model_catalog": ["Qwen/Qwen3.8-27B", "…"]
}
```

Headers: `Authorization: Bearer <verified Supabase JWT>`,
`X-Student-Id: <uuid>` (context only), `Content-Type: application/json`.
`model_catalog` is the enabled `public.ai_model_catalog` list read server-side as
the signed-in user; the recommendation MUST stay inside it. An empty array means
the catalogue read failed and must not be treated as "no models".

Response — snake_case field names exactly as normalised by
`frontend/src/lib/system-capability.server.ts` (all hardware fields nullable; the
browser never measures them):

```json
{
  "status": "pending|ready|unavailable|stale|error",
  "message_code": "backend_unavailable",
  "os": "macOS|Linux|unknown",
  "active_user_count": 3,
  "ram": { "total_bytes": 0, "available_bytes": 0 },
  "gpus": [
    {
      "gpu_id": "gpu-0",
      "name": "NVIDIA RTX 4090",
      "vram_total_bytes": 0,
      "vram_available_bytes": 0,
      "accelerator": "cuda|rocm|metal|cpu",
      "unified_memory": false
    }
  ],
  "runtime_storage": { "total_bytes": 0, "available_bytes": 0 },
  "load_balancing": {
    "mode": "gpu_only|cpu_gpu_split|unified_memory|cpu_only|unknown",
    "spare_capacity": 1,
    "active_model_processes": 1,
    "constraint_codes": []
  },
  "recommendation": {
    "recommended_model_id": "Qwen/Qwen3.8-27B",
    "alternatives": [
      {
        "model_id": "…",
        "estimated_bytes": 0,
        "headroom_fraction": 0.12,
        "reason_code": "fits_gpu"
      }
    ],
    "rationale_codes": [],
    "fit": {
      "model_id": "Qwen/Qwen3.8-27B",
      "estimated_bytes": 0,
      "headroom_fraction": 0.12,
      "reason_code": "fits_gpu"
    },
    "warning_codes": []
  },
  "measured_at": "2026-09-17T20:00:00Z",
  "measurement_source": "local_backend_probe|local_backend_cache|none",
  "measurement_quality": "measured|partial|unknown"
}
```

Field rules the backend must respect:

- `status: "unavailable"`, an unknown `status`, a non-JSON body, a non-2xx
  response, a timeout or a connection failure all resolve to the frontend's
  truthful unavailable report (`backend_connected: false`, every hardware field
  null, `message_code` preserved when present).
- `recommendation` is ADVISORY. It preselects the picker only while the user has
  not chosen manually, and never implies readiness.
- `active_user_count` is authoritative backend truth; omit it (null) rather than
  estimating.
- A `ready` report older than 10 minutes is presented as `stale` by the
  frontend (`CAPABILITY_STALE_AFTER_MS`).
- `rationale_codes`, `warning_codes`, `constraint_codes` and `reason_code` are
  stable machine codes; the frontend localizes them. Never free text.
- There is no `cpu`, `storage` or `state` field in this contract; use `ram`,
  `runtime_storage` and `status`.

### 3.2 Model catalogue

Today the catalogue comes from Supabase `ai_model_catalog` with a hard-coded
fallback. If the backend later serves it, it must return
`[{ model_id, display_name, enabled, sort_order }]`; the frontend keeps the
Supabase list as fallback.

### 3.3 Prepare / load — `POST /api/model/prepare`

Headers (exactly what `frontend/src/lib/model-backend.server.ts` sends):

```
Content-Type: application/json
Authorization: Bearer <caller Supabase access token>   // the ONLY authorization boundary
X-Student-Id: <auth.users.id>                          // context / cross-check only, NEVER auth
```

There is NO `student_id` field in the JSON body. The student is a header/context
value derived server-side from the verified token.

Request body (exact field names):

```json
{
  "model_id": "string",
  "admission_policy": {
    "gpu_free_percent": 50,
    "ram_free_percent": 50,
    "storage_free_percent": 50
  },
  "runtime_floors": {
    "gpu_free_percent": 30,
    "ram_free_percent": 25,
    "storage_free_percent": 30
  },
  "deduplicate_downloads": true,
  "report_active_users": true
}
```

Response: `ModelPreparationStatus` (below), optionally with `operation_id`.

### 3.4 Progress polling — `GET /api/model/operation/{operation_id}`

Same headers as `prepare`; no request body.

Response: the same `ModelPreparationStatus`.

```
state: checking_backend | checking_resources | checking_model | queued
     | downloading | downloaded | loading | ready
     | blocked | failed | backend_unavailable
progress_percent: number | null          // null ⇒ indeterminate, never faked
model_present_on_disk: boolean | null
model_download_in_progress: boolean | null
shared_download: boolean | null          // reusing an existing download
active_user_count: number | null
resources: { gpu_vram, ram, storage } each { free_bytes, total_bytes, free_percent } | null
admission: { gpu_free_percent, ram_free_percent, storage_free_percent }   // 50/50/50
runtime_floors: { gpu_free_percent, ram_free_percent, storage_free_percent } // 30/25/30
blocking_reasons: string[]               // stable enum keys, localized in the UI
can_continue_with_ai: boolean
model_id: string
operation_id: string | null
```

Terminal states: `ready`, `blocked`, `failed`, `backend_unavailable`.
`ready` **and** `can_continue_with_ai === true` is the only combination that
unlocks AI in the frontend.

`blocking_reasons` enum: `backend_unavailable`, `model_not_available`,
`download_failed`, `insufficient_storage`, `insufficient_gpu_vram`,
`insufficient_ram`, `model_load_failed`, `model_process_limit`, `unknown`.

### 3.5 Release — `POST /api/system/runtime/release`

Best-effort on sign-out with the optional lease id, sent while the Supabase
bearer is still valid. Release failure must never block sign-out.

### 3.6 Heartbeat — `POST /api/system/session/heartbeat`

Keeps the caller's lease alive. Because a browser or process can die without
notifying anything, the backend MUST also implement a lease/TTL sweeper that
reclaims runtime for sessions that stopped heart-beating. **Neither is
implemented today.**

## 4. Frontend behaviour in non-AI mode (already implemented)

- One central guard: `useAiBlocked()` / `AiBlockedNotice` / `AiFeatureGate`
  (`frontend/src/components/app/AiFeatureGate.tsx`), backed by
  `AiAvailabilityProvider`.
- Every AI entry point (subject/general chat composer, assessment generation and
  grading in `AssessmentModePanel`) is disabled **before** any request and shows
  one red/destructive notice with three honest paths: retry model setup
  (`/onboarding/model`), open Settings, or keep using non-AI features.
- Losing backend readiness during an AI action produces a bounded error state
  (`generation_failed` / `grading_failed` / a toast) — never an indefinite
  spinner and never a route or app-shell crash.
- Model setup stays reachable from Settings and from the AI surfaces, so a
  non-AI session can be upgraded without re-authenticating.

## 5. NOT implemented / NOT changed in this Lovable task

- Any Python/FastAPI or llama.cpp code (ports 8001 / 8000).
- The hardware probe, recommendation engine and load balancer.
- Model download/load orchestration, admission accounting, heartbeat/TTL sweeper.
- Assessment generation and grading.
- No Supabase DDL: the existing `user_preferences.preferences` JSON keys
  (`app_language`, `selected_qwen_model`, legacy
  `language_onboarding_completed`) were reused, so no migration was created.
