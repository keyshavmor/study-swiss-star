# Verification record

Last verified: 2026-09-14

| Check | Result |
| --- | --- |
| Current host/platform audit | Passed: Linux x86_64; safe CPU profile selected while NVIDIA driver is unavailable |
| Local checkpoint audit | Passed: GGUF, 1 shard, 18,973,870,432 bytes |
| Python Ruff lint | Passed: 52 Python files |
| Python Ruff formatting | Passed: 52 Python files |
| Backend unit/API/feature/E2E suite | Passed: 39 tests |
| Automatic model acquisition | Passed: missing model invokes downloader and is revalidated; opt-out tested |
| Local-first internet fallback | Passed: local hit prevents remote call; local miss invokes remote adapter |
| Live automatic fallback smoke | Passed: empty local corpus returned the Wikipedia `Qwen` article |
| Context budget enforcement | Passed in unit, API, and process-level E2E tests |
| Frontend TypeScript check | Passed |
| Frontend ESLint | Passed with 20 non-blocking Fast Refresh warnings |
| Frontend production build | Passed |
| Frontend production dependency audit | Passed: 0 vulnerabilities |
| Linux CPU environment selection | Passed: `llama.cpp=*=cpu*`, Python 3.11, Node 22 |
| Simulated Mac M4 Pro profile | Passed: arm64, Metal/Accelerate, 65,536-token default |
| Historical real Qwen preload (2026-09-13) | Passed: loaded Q4_K_M at 32,768 tokens before API readiness |
| Historical real Qwen generation (2026-09-13) | Passed: exact `ALIM_MODEL_OK`, correct model identity |
| Historical live web/context test (2026-09-13) | Passed: relevant LHC sources, 1,168 ≤ 1,536 input tokens |
| Historical complete app orchestrator (2026-09-13) | Passed: model + API + frontend; frontend HTTP 200 and exact `ALIM_FULL_APP_OK` |

The current process-level E2E uses a disposable OpenAI-compatible server, temporary checkpoint,
and temporary local corpus. It verifies pre-start validation, managed preload/readiness, exact
`Qwen/Qwen3.8-27B` routing, local-first provenance, and enforcement of a deliberately small context
budget. Separate functional tests simulate both automatic model acquisition and internet fallback;
they do not download the 17.67 GiB model or contact the public internet.

On 2026-09-13, the real local Q4_K_M checkpoint was loaded through CUDA on an RTX 3090. `/health` reported
`preloaded=true`, `process_running=true`, `engine=llama.cpp`, and a 32,768-token runtime ceiling.
The deterministic generation returned exactly `ALIM_MODEL_OK` in about one second. A live
MediaWiki-backed compile selected Large Hadron Collider sources and kept 1,168 compiled tokens under
the deliberately reduced 1,536-token input allowance. The final `start_app.py` smoke loaded all
three local processes, returned HTTP 200 from the frontend, and generated `ALIM_FULL_APP_OK` through
the FastAPI chat path. Shutdown released the model's GPU allocation. No Lovable or Supabase service
was contacted.
