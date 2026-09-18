# Model catalogue and responsibility index

| Field | Value |
|---|---|
| Owner | Frontend catalogue UX + backend model runtime + Supabase control plane |
| Status | Mixed; mapping-specific below |
| Canonical path | `docs/cross-system/MODEL_INDEX.md` |
| Verified | frontend/live handover 2026-09-18; target backend `bff4ec7` |

The enabled frontend/live order is:

1. `Qwen/Qwen3.8-27B`
2. `Qwen/Qwen3.5-27B`
3. `Qwen/Qwen3-14B`
4. `Qwen/Qwen3.5-9B`
5. `Qwen/Qwen3-8B`
6. `Qwen/Qwen3.5-4B`
7. `Qwen/Qwen3-4B`
8. `Qwen/Qwen3.5-2B`
9. `Qwen/Qwen3-1.7B`
10. `Qwen/Qwen3-0.6B`

`Qwen/Qwen3.8-27B` alone has a verified target mapping to a llama.cpp GGUF
artifact (`Q4_K_M`, approximately 17.67 GiB). That mapping is
`CURRENT — LOCAL BACKEND`. The other nine are `UNKNOWN — REQUIRES VERIFICATION`,
not smaller-model substitutions. Each is a release blocker until Prompt 04
records an official source/revision, license, format, quantization, size/hash,
runtime compatibility and resource envelope, or an explicit product/data
decision disables it.

Supabase may enable/order a model ID and provide policy thresholds. It may not
inject download URLs, filenames, paths, executables or flags. The backend owns
an allowlisted registry, artifact acquisition/verification, capability probing,
recommendation, admission, shared download, load/probe, leases, heartbeat,
health, release and TTL cleanup. The UI owns selection and truthful states; a
preference never proves readiness.

See [backend model/runtime documentation](../../backend/docs/models/MODEL_CATALOG_AND_RUNTIME.md)
for the required lifecycle and validation matrix.
