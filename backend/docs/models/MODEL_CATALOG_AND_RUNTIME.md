# 09 — Model catalogue and local-runtime handover

| Field | Value |
|---|---|
| Owner | Backend model/runtime owner |
| Status | One current mapping; nine `UNKNOWN — REQUIRES VERIFICATION`; lifecycle is expected |
| Canonical path | `backend/docs/models/MODEL_CATALOG_AND_RUNTIME.md` |
| Verified | frontend/live catalogue and target baseline, 2026-09-18 |

## Catalogue authority

Live `public.ai_model_catalog` is the enabled selectable list. The frontend
hard-coded list is a defensive offline fallback and currently matches all ten
live IDs/order. A selected/persisted ID is a preference only. The local backend
must confirm artifact availability, preparation and loaded readiness.

## Verified model mapping matrix

Do not interpret an ID as a download URL. “Research required” is deliberate.

| Model ID / live display | Artifact/runtime evidence | Quantization/size | Status/action |
|---|---|---|---|
| `Qwen/Qwen3.8-27B` / Qwen 3.8 27B | target maps official base to `ggml-org/Qwen3.8-27B-GGUF`, llama.cpp | `Q4_K_M`, ~17.67 GiB | `CURRENT — LOCAL BACKEND`; generalize |
| `Qwen/Qwen3.5-27B` | no verified target mapping | unknown | research official model card, license, GGUF/llama compatibility |
| `Qwen/Qwen3-14B` | no target mapping | unknown | research required |
| `Qwen/Qwen3.5-9B` | no target mapping | unknown | research required |
| `Qwen/Qwen3-8B` | no target mapping | unknown | research required |
| `Qwen/Qwen3.5-4B` | no target mapping | unknown | research required |
| `Qwen/Qwen3-4B` | no target mapping | unknown | research required |
| `Qwen/Qwen3.5-2B` | no target mapping | unknown | research required |
| `Qwen/Qwen3-1.7B` | no target mapping | unknown | research required |
| `Qwen/Qwen3-0.6B` | no target mapping | unknown | research required |

Prompt 04 must use primary model cards/runtime documentation to fill base
repository, immutable artifact revision, license, format, quantization choices,
size/hash, tokenizer/chat template, native context, runtime version and minimum/
recommended RAM/VRAM/disk. If an enabled ID cannot be mapped truthfully, it is a
release blocker or must be disabled through an explicit product/data decision;
never silently substitute a different model.

## Registry design

Create one server-owned registry entry per allowed `model_id`:

- canonical/display IDs and family;
- official source and reviewed local artifact source/revision;
- license and redistribution notice;
- format/quantization/filename/hash/expected bytes;
- tokenizer, chat template, context and output ceilings;
- supported runtime/backends and safe command flags;
- resource estimator and recommendation weights;
- cache directory/manifest version and compatibility migration.

Supabase can enable/order an entry, but cannot inject repository URLs,
filenames, paths, executables or flags.

## Artifact lifecycle

Resolve ID → measure disk/resources → authorize/queue → acquire a per-model
cross-process lock → join an existing operation or stage download → resume with
verified range/source → verify size/hash/GGUF metadata → write provenance
manifest → atomic rename → load/probe → issue session lease → heartbeat → serve
→ release/TTL reclaim → unload/cache according to policy.

Partial/corrupt artifacts never become ready. Cleanup never deletes an active
mapped file. Imports from local disk use safe resolved paths and atomic copy.
Normal CI uses fake/tiny GGUF fixtures; large downloads are opt-in.

## Preparation operation contract

Persist operation ID, model ID, owner/joiners, state, real/null progress,
timestamps, bytes if known, retryability, blocking reasons, resource snapshot,
download-sharing flag and sanitized error code. Survive API restart. Multiple
users requesting one artifact share download bytes but retain authorization and
session-specific readiness.

## Capability and recommendation

Measure Linux/macOS, architecture, total/available RAM, runtime-volume disk,
each GPU/VRAM, CUDA/Metal/CPU capability, unified memory and active processes.
Report source, quality and timestamp. Fit calculation includes weights,
KV/context, runtime overhead and safety headroom. Recommend only a loadable,
available entry and return alternatives/rationale/warnings; unknown data remains
null.

## Admission, concurrency and release

Read live policy RPCs. Current policy documents 50% free resource preflight,
30/25/30 GPU/RAM/storage runtime floors, maximum ten active users, and global
utilization ceilings; code must treat values as data, not constants. Use the
stricter cap. Queue newcomers while rebalancing, preserve in-flight inference,
avoid one process per user when safe sharing works, and reveal no other user
identity/content. Sign out calls release best-effort; TTL guarantees reclamation.

## Failure and tests

Cover unknown/disabled ID, missing source, license refusal, no network,
interrupted/resumed/concurrent download, hash/header mismatch, insufficient
disk/RAM/VRAM, runtime crash, stale operation, queue fairness, lease spoof/
expiry, duplicate release, restart recovery, switch during in-flight request,
policy change, backend unavailable and log redaction. Never report invented
progress, hardware or readiness.
