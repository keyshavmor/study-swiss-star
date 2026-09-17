# Post-login language + model gate — authoritative handoff

Status: **CURRENTLY IMPLEMENTED FRONTEND** (this Lovable task) +
**REQUIRED FUTURE BACKEND (CODEX)**.
Verified against production Supabase `ucacmeadsufiedxrgqit` on 2026-09-17.
No Python/local-backend code was written or changed in this task.

## 1. Canonical startup sequence (implemented in the frontend)

```
Supabase Auth success
  → compliance/safety onboarding (once, durable Supabase flag)
  → SESSION language decision  (select a language OR explicit skip)
  → MODEL screen: backend system probe + recommendation + prepare/load
       ├─ backend confirms READY for the selected model → AI-ready session
       └─ explicit "Continue without AI"                → non-AI session
  → /home and the rest of the product
```

Facts that the backend must not contradict:

- Authentication never depends on the local AI backend. A missing/failing
  backend can never block sign-in or product access.
- The model screen is a mandatory **decision** gate per browser session, not an
  availability gate. There is **no separate mandatory system-admission screen**;
  capability, admission and recommendation data are rendered on the model screen.
- The frontend switches to AI-ready **only** on an explicit backend `ready`
  state for the selected model. A persisted `selected_qwen_model` preference is
  never proof of readiness.

## 2. Session vs durable state

| State | Owner | Storage |
| --- | --- | --- |
| `app_language` (default/preselection) | Supabase | `user_preferences.preferences.app_language` |
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

Request: `{ model_catalog?: string[], preferred_model_id?: string | null }`

Response (all hardware fields nullable; the browser never measures them):

```json
{
  "status": "ready|pending|unavailable|stale|error",
  "backend_connected": true,
  "measured_at": "2026-09-17T20:00:00Z",
  "measurement_source": "nvidia-smi+psutil",
  "os": "linux|macos|unknown",
  "active_user_count": 3,
  "cpu": { "ram_total_bytes": 0, "ram_free_bytes": 0, "free_percent": 0 },
  "gpus": [{ "name": "", "vram_total_bytes": 0, "vram_free_bytes": 0, "backend": "cuda|metal|rocm|cpu" }],
  "storage": { "total_bytes": 0, "free_bytes": 0, "free_percent": 0 },
  "load_balancing": { "state": "gpu_only|cpu_gpu_split|unified_memory|unknown", "spare_capacity": 0.0, "constraints": [] },
  "recommendation": {
    "recommended_model_id": "Qwen/Qwen3.8-27B",
    "alternatives": ["…"],
    "rationale": "…",
    "estimated_headroom_percent": 12,
    "warnings": []
  }
}
```

Unreachable / 404 / timeout / unparsable ⇒ the frontend renders
`backend unavailable — cannot recommend`. It never fabricates values.

### 3.2 Model catalogue

Today the catalogue comes from Supabase `ai_model_catalog` with a hard-coded
fallback. If the backend later serves it, it must return
`[{ model_id, display_name, enabled, sort_order }]`; the frontend keeps the
Supabase list as fallback.

### 3.3 Prepare / load — `POST /api/model/prepare`

Request: `{ model_id, admission_policy, runtime_floors, student_id }`
Response: `ModelPreparationStatus` (below), optionally with `operation_id`.

### 3.4 Progress polling — `GET /api/model/operation/{operation_id}`

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

### 3.5 Release — `POST /api/system/release`

Best-effort on sign-out with the optional lease id. Because browsers can close
mid-flight, the backend still needs a heartbeat/lease TTL sweeper. **Not
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
