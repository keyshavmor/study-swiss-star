# Model catalogue and responsibility index

| Field | Value |
|---|---|
| Owner | Frontend catalogue UX + backend model runtime + Supabase control plane |
| Status | Prompt 04 backend current; mapping-specific below |
| Canonical path | `docs/cross-system/MODEL_INDEX.md` |
| Verified | frontend/live read-only catalogue and Prompt 04 tests, 2026-09-18 |

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

`Qwen/Qwen3.8-27B` alone has a verified target mapping to
`ggml-org/Qwen3.8-27B-GGUF` revision
`0669b98607d47046c7c2b3f801011d54a08cfccf`, `Q4_K_M`, 18,973,870,432 bytes,
SHA-256 `31629f53165ab6a7dad8c9847dcfd1fdf55829dac1e6e748f4a68581b0033d34`,
Apache-2.0 and llama.cpp. The other nine return typed `unresolved`; they are not
smaller-model substitutions and cannot be recommended/prepared as runnable.

Supabase may enable/order a model ID and provide policy thresholds. It may not
inject download URLs, filenames, paths, executables or flags. The backend owns
an allowlisted registry, artifact acquisition/verification, capability probing,
recommendation, admission, shared download, load/probe, leases, heartbeat,
health, release and TTL cleanup. The UI owns selection and truthful states; a
preference never proves readiness.

See [backend model/runtime documentation](../../backend/docs/models/MODEL_CATALOG_AND_RUNTIME.md)
for the required lifecycle and validation matrix.
