# Frontend Handoff — Alim's Study Assistant

This folder documents the current Lovable / TanStack Start frontend, the in-repository local
**Python FastAPI** Context Manager, and the remaining AI-feature integration plan.

## Read first

1. `FULL_APP_WIREFRAMES.md` — visual map of the UI, state owners, and end-to-end feature journeys.
2. `FRONTEND_ARCHITECTURE.md` — how the app is built today, and where backend calls belong.
3. `CONTEXT_MANAGER.md` — the implemented retrieval, memory, budgeting, and compilation path.
4. `PYTHON_BACKEND_INTEGRATION_PLAN.md` — what is implemented and what remains.

## Who reads what

| Audience | Files |
| --- | --- |
| Python backend developers | `API_EXPECTATIONS.md`, `FRONTEND_DATA_MODEL.md`, `SUBJECT_MODEL_AND_LANGUAGE_RULES.md`, `OPEN_QUESTIONS_FOR_BACKEND.md`, `USER_FLOWS.md` |
| Lovable / frontend developers | `FRONTEND_ARCHITECTURE.md`, `ROUTE_SCREEN_MAP.md`, `COMPONENT_TREE.md`, `UI_BACKEND_MAPPING.md`, `PYTHON_BACKEND_INTEGRATION_PLAN.md`, `BACKEND_INTEGRATION_TODO.md` |
| Both (contract) | `API_EXPECTATIONS.md`, `FRONTEND_DATA_MODEL.md`, `UI_BACKEND_MAPPING.md`, `SUBJECT_MODEL_AND_LANGUAGE_RULES.md` |
| Coding agents / visual orientation | `FULL_APP_WIREFRAMES.md`, plus standalone Mermaid sources in `wireframes/` |
| Ops / local setup | `LOCAL_DEV_WITH_PYTHON_BACKEND.md` |

## File index

| File | Defines |
| --- | --- |
| `README_FRONTEND_HANDOFF.md` | This guide |
| `FULL_APP_WIREFRAMES.md` | Master UI/frontend/backend map with 15 feature and architecture diagrams |
| `wireframes/*.mmd` | Standalone Mermaid source for each master-pack diagram |
| `CONTEXT_MANAGER.md` | Implemented local Context Manager architecture and operation |
| `FRONTEND_ARCHITECTURE.md` | Current architecture + system diagram + insertion points |
| `ROUTE_SCREEN_MAP.md` | Route-by-route screen, data source and future endpoint map |
| `SUBJECT_MODEL_AND_LANGUAGE_RULES.md` | 15 subjects, languages, SPF combined-subject rules, stable IDs |
| `UI_BACKEND_MAPPING.md` | **API contract by user action** — the key integration file |
| `API_EXPECTATIONS.md` | **HTTP contract** — endpoints with concrete JSON |
| `FRONTEND_DATA_MODEL.md` | TypeScript types the Python side mirrors with Pydantic |
| `STATE_AND_STORAGE.md` | State/storage ownership + staged migration path |
| `USER_FLOWS.md` | Mermaid sequence diagrams for every major flow |
| `COMPONENT_TREE.md` | Component hierarchy with integration classification |
| `PYTHON_BACKEND_INTEGRATION_PLAN.md` | Files to add/edit, config, mock mode, fallback policy |
| `LOCAL_DEV_WITH_PYTHON_BACKEND.md` | Local dev commands, ports, `.env.local`, security note |
| `BACKEND_INTEGRATION_TODO.md` | Ordered implementation checklist |
| `OPEN_QUESTIONS_FOR_BACKEND.md` | Unresolved contract decisions |

## Contract / state / TODO quick pointers

- **API contract:** `API_EXPECTATIONS.md` + `FRONTEND_DATA_MODEL.md` + `UI_BACKEND_MAPPING.md`
- **State & storage decisions:** `STATE_AND_STORAGE.md`
- **Integration TODOs:** `BACKEND_INTEGRATION_TODO.md` + `OPEN_QUESTIONS_FOR_BACKEND.md`

## Non-goals for this phase

- No UI rewrite, no design-system change, no route restructuring.
- Supabase auth/chat persistence stays in place; AI generation is local Qwen-only.
- No RAG/LLM orchestration in TypeScript; the TanStack chat route is only an authenticated proxy.
