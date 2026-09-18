# Maintained cross-system diagrams

| Field | Value |
|---|---|
| Owner | Architecture |
| Status | Architecture contract; node labels carry current/gap semantics |
| Canonical path | `docs/cross-system/diagrams/` |
| Source | `codex/diagrams/` handover package |
| Verified | frontend `f0910e6`, target `bff4ec7`, 2026-09-18 |

Legend: solid arrows are active or required calls/data flow; dotted arrows are
optional/restricted; database cylinders are durable/local stores; state
transitions describe required truth, not proof of implementation. A diagram
never upgrades an `EXPECTED LOCAL BACKEND CONTRACT` or `BACKEND GAP` to current.

| Diagram | Scope | Owner/status note |
|---|---|---|
| [SYSTEM_CONTEXT](SYSTEM_CONTEXT.mmd) | actors and system boundaries | mixed current architecture |
| [UX_TO_BACKEND_E2E](UX_TO_BACKEND_E2E.mmd) | user intent to result/error | cross-system contract |
| [AUTH_AND_STARTUP](AUTH_AND_STARTUP.mmd) | canonical startup state machine | frontend/Supabase current; model readiness partly expected |
| [FRONTEND_SUPABASE](FRONTEND_SUPABASE.mmd) | grants, RLS, buckets, RPC/functions | current Supabase boundary |
| [FRONTEND_LOCAL_BACKEND](FRONTEND_LOCAL_BACKEND.mmd) | token and inference flow | expected integration; partial backend current |
| [BACKEND_SUPABASE](BACKEND_SUPABASE.mmd) | user-token vs privileged worker | current pattern + required extensions |
| [AI_FEATURE_GATE](AI_FEATURE_GATE.mmd) | no-request/fail-closed behavior | current frontend contract |
| [MODEL_SELECTION_AND_RUNTIME](MODEL_SELECTION_AND_RUNTIME.mmd) | preference to lease | future backend platform |
| [MODEL_DOWNLOAD_PREPARE_RELEASE](MODEL_DOWNLOAD_PREPARE_RELEASE.mmd) | artifact/runtime lifecycle | future backend platform |
| [CHAT_RAG](CHAT_RAG.mmd) | moderated subject-chat sequence | partial current; safety/bearer gaps |
| [ASSESSMENT_FLOW](ASSESSMENT_FLOW.mmd) | job/attempt/grading states | expected backend contract |
| [STORAGE_AND_RETENTION](STORAGE_AND_RETENTION.mmd) | quota, descriptor, deletion | mixed current/future |
| [LOCAL_DEPLOYMENT](LOCAL_DEPLOYMENT.mmd) | local ports and orchestrator | ports current; orchestrator future |
