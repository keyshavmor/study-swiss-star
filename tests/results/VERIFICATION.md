# Verification record

Last verified: 2026-09-13

| Check | Result |
| --- | --- |
| Host/environment audit | Passed: Linux x86_64, CUDA, 24 GiB VRAM, all required tools available |
| Local checkpoint audit | Passed: GGUF, 1 shard, 18,973,870,432 bytes |
| Python Ruff lint | Passed: 52 Python files |
| Python Ruff formatting | Passed: 52 Python files |
| Backend unit/API/E2E suite | Passed: 30 tests |
| Frontend TypeScript check | Passed |
| Frontend ESLint | Passed with 20 non-blocking Fast Refresh warnings |
| Frontend production build | Passed |
| Frontend production dependency audit | Passed: 0 vulnerabilities |
| Linux CUDA environment installation | Passed: `llama.cpp=*=cuda*`, Python 3.11, Node 22 |
| Simulated Mac M4 Pro profile | Passed: arm64, Metal/Accelerate, 65,536-token default |
| Real Qwen preload | Passed: loaded Q4_K_M at 32,768 tokens before API readiness |
| Real Qwen generation | Passed: exact `ALIM_MODEL_OK`, correct model identity |
| Live web/context test | Passed: relevant LHC sources, 1,168 ≤ 1,536 input tokens |
| Complete app orchestrator | Passed: model + API + frontend; frontend HTTP 200 and exact `ALIM_FULL_APP_OK` |

The process-level E2E uses a disposable OpenAI-compatible server and temporary checkpoint fixture.
It verifies pre-start validation, managed preload/readiness, exact `Qwen/Qwen3.8-27B` routing,
intent-gated web provenance, and enforcement of a deliberately small context budget.

The real local Q4_K_M checkpoint was loaded through CUDA on an RTX 3090. `/health` reported
`preloaded=true`, `process_running=true`, `engine=llama.cpp`, and a 32,768-token runtime ceiling.
The deterministic generation returned exactly `ALIM_MODEL_OK` in about one second. A live
MediaWiki-backed compile selected Large Hadron Collider sources and kept 1,168 compiled tokens under
the deliberately reduced 1,536-token input allowance. The final `start_app.py` smoke loaded all
three local processes, returned HTTP 200 from the frontend, and generated `ALIM_FULL_APP_OK` through
the FastAPI chat path. Shutdown released the model's GPU allocation. No Lovable or Supabase service
was contacted.
