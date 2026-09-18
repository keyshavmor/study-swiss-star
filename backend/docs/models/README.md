# Model/runtime documentation

| Field | Value |
|---|---|
| Owner | Backend model/runtime |
| Status | Mixed current/gap |
| Canonical path | `backend/docs/models/README.md` |
| Verified | target baseline `bff4ec7`, 2026-09-18 |

Read [Model catalogue and runtime handover](MODEL_CATALOG_AND_RUNTIME.md).
Only `Qwen/Qwen3.8-27B` currently has a verified artifact/runtime mapping. The
other enabled catalogue IDs must not be silently substituted or advertised as
ready.

Runtime code owns allowlisted mappings, artifact provenance/integrity,
resumable deduplicated acquisition, safe local import, platform capability,
recommendation, admission, load/probe, leases, heartbeat, health, switching and
release. Large downloads remain opt-in and weights/caches stay outside Git.
