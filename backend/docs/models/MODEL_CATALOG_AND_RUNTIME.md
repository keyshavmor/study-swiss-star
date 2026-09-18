# 09 — Model catalogue and local-runtime handover

| Field | Value |
|---|---|
| Owner | Backend model/runtime owner |
| Status | Prompt 04 implemented; one verified mapping and nine typed unresolved mappings |
| Canonical path | `backend/docs/models/MODEL_CATALOG_AND_RUNTIME.md` |
| Verified | live read-only catalogue, primary registry metadata and target tests, 2026-09-18 |

## Catalogue authority and mappings

Live `public.ai_model_catalog` is the enabled selectable list; its ten IDs and
order were re-read without mutation. A persisted ID is only a preference. The
local backend must confirm artifact integrity and live runtime readiness.

| Enabled ID | Reviewed artifact/runtime | Exact artifact | Backend state |
|---|---|---|---|
| `Qwen/Qwen3.8-27B` | official base; `ggml-org/Qwen3.8-27B-GGUF` revision `0669b98607d47046c7c2b3f801011d54a08cfccf`; Apache-2.0; llama.cpp; native context 262,144 | `Qwen3.8-27B-Q4_K_M.gguf`; `Q4_K_M`; 18,973,870,432 bytes; SHA-256 `31629f53165ab6a7dad8c9847dcfd1fdf55829dac1e6e748f4a68581b0033d34` | `verified`; Linux x86-64 CPU/CUDA and macOS arm64 Metal profiles |
| `Qwen/Qwen3.5-27B` | no reviewed immutable local artifact | unknown | `unresolved` |
| `Qwen/Qwen3-14B` | no reviewed immutable local artifact | unknown | `unresolved` |
| `Qwen/Qwen3.5-9B` | no reviewed immutable local artifact | unknown | `unresolved` |
| `Qwen/Qwen3-8B` | no reviewed immutable local artifact | unknown | `unresolved` |
| `Qwen/Qwen3.5-4B` | no reviewed immutable local artifact | unknown | `unresolved` |
| `Qwen/Qwen3-4B` | no reviewed immutable local artifact | unknown | `unresolved` |
| `Qwen/Qwen3.5-2B` | no reviewed immutable local artifact | unknown | `unresolved` |
| `Qwen/Qwen3-1.7B` | no reviewed immutable local artifact | unknown | `unresolved` |
| `Qwen/Qwen3-0.6B` | no reviewed immutable local artifact | unknown | `unresolved` |

Primary references: [Qwen publisher model card](https://huggingface.co/Qwen/Qwen3.8-27B),
[pinned GGUF repository](https://huggingface.co/ggml-org/Qwen3.8-27B-GGUF/tree/0669b98607d47046c7c2b3f801011d54a08cfccf),
and [llama.cpp](https://github.com/ggml-org/llama.cpp). The recorded SHA-256
was taken from the pinned registry artifact metadata without downloading the
weights during this run.

The unresolved IDs stay visible because the authoritative catalogue enables
them, but preparation returns `artifact_mapping_unresolved`. They are never
reported runnable and are never substituted. A reviewed registry change or an
explicit product/data decision to disable an ID is required.

## Registry, acquisition and cache

`backend/app/model_registry.py` is the server-owned allowlist. Supabase may
enable/order a model but cannot inject repository URLs, filenames, paths,
checksums, executables or flags. Model data defaults to the OS data directory
outside Git; `ALIM_MODEL_CACHE_ROOT` may select another absolute data volume.

`backend/app/artifact_store.py` builds HTTPS sources only from immutable
registry metadata. It uses a per-artifact directory lock, `.partial` staging,
validated HTTP range resume, disk preflight plus a 64 MiB reserve, GGUF
header/size/SHA-256 verification, an atomic rename and a private provenance
marker. Local import rejects symlinks/path escape, copies to staging and applies
the same verification. Existing names are never trusted. Normal tests use tiny
fixtures; a large transfer needs an explicit Prepare action or
`model_runtime.py download --yes-download`.

## Capability, recommendation and preparation

`backend/app/system_probe.py` reports measured or nullable Linux/macOS
architecture, RAM, runtime-volume storage, NVIDIA VRAM/CUDA, Apple unified
memory/Metal and active-process capacity. Recommendation is restricted to the
caller-supplied enabled catalogue and only reviewed registry entries; it is
advisory and never means loaded.

`backend/app/runtime_control.py` persists caller-authorized operations and
leases outside Git with mode `0600`. A restart converts transient operations to
`operation_interrupted`. Concurrent callers join the same transient model
operation while retaining independent authorization. Progress is based on
bytes written or stays null. `ready` requires verified bytes and the local
runtime's `/models` health response. The authenticated caller owns heartbeat,
poll and release; foreign and missing operation IDs are indistinguishable.
Expired leases are swept periodically and the API stops only a runtime it owns
when the final lease is released/expired.

The authenticated frontend reads Supabase policy RPCs and sends the values.
Current defaults are 50/50/50 percent free for new allocation, 30/25/30 runtime
floors and ten users; backend logic treats these as data. Preference in
Supabase never implies admission or readiness.

## Runtime and platform boundary

The `alim-backend` Python API environment does not contain model weights or a
platform GPU stack. Pinned `alim-model-runtime` manifests live under
`backend/model-runtime/`. `llama-server` is a separate process on
`127.0.0.1:8000`; FastAPI is on
`127.0.0.1:8001`. Ubuntu selects CUDA when `nvidia-smi` works and CPU otherwise;
Apple-silicon macOS selects Metal/unified memory. Both expose identical API
semantics.

Safe defaults use at most 16 CPU threads, batch 512 for CUDA/Metal or 256 for
CPU, all GPU layers for CUDA/Metal or zero for CPU, and a memory-derived context
ceiling. Overrides are `ALIM_MODEL_THREADS`, `ALIM_MODEL_BATCH_SIZE`,
`ALIM_MODEL_GPU_LAYERS` and `ALIM_MAX_CONTEXT_TOKENS`. The Qwen artifact needs
about 17.67 GiB disk plus staging reserve and an estimated 22.1 GiB resident
headroom before KV/cache/runtime overhead. Actual fit depends on context and
load, so measured admission remains authoritative.

Use `backend/scripts/model_runtime.py check|command|status|health|start|stop`. `start`
runs a foreground controller and stops only its owned llama process; `stop`
verifies the recorded controller command before signaling. Use `import --source
/absolute/model.gguf` offline or `download --yes-download` for an explicit
network transfer. Model data, PID state and logs remain outside Git.

## Validation limits

Automated tests cover exact catalogue coverage, unresolved entries, Linux
CUDA/CPU and M4/Metal abstractions, safe import, range resume, corruption,
checksum, disk shortage, cancellation, admission, spoofed leases, expiry,
release, restart recovery, API authentication and operation isolation. The
current physical run proved Ubuntu 26.04.1 x86-64 CPU probing only. CUDA and
MacBook M4/Metal remain `UNVERIFIED — MANUAL`; fixture tests are not hardware
certification. No model weights were downloaded during Prompt 04.
