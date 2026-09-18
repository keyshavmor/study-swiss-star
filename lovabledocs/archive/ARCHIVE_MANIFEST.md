# Documentation archive manifest

| Field | Value |
|---|---|
| Owner | Documentation owner |
| Status | `ARCHIVED` reference material |
| Canonical path | `docs/archive/ARCHIVE_MANIFEST.md` |
| Archive reviewed | 2026-09-18 |
| Eventual deletion owner | project owner after Prompt 08 restoration proof |

All listed files remain in Git at their original archive paths. They are
excluded from current authority and restored through ordinary Git history. No
application/runtime file is archived by this manifest.

| Archived file | Reason | Current replacement |
|---|---|---|
| `API_EXPECTATIONS.md` | speculative/old API set | `../cross-system/API_INDEX.md` |
| `ASSISTANT_SETTINGS_AND_STORAGE.md` | superseded feature snapshot | `../ui/CONTROL_TO_SYSTEM_MATRIX.md` |
| `BACKEND_INTEGRATION_TODO.md` | old task list | `../../backend/docs/handoff/BACKEND_GAP_ANALYSIS.md` |
| `COMPONENT_TREE.md` | old frontend tree | `../frontend/COMPONENT_TREE.md` |
| `CONTEXT_MANAGER.md` | old context plan | `../../backend/docs/rag/README.md` |
| `CROSS_PLATFORM_SETUP.md` | monolithic/stale setup | `../cross-system/EXECUTION_ENVIRONMENTS.md` |
| `FRONTEND_ARCHITECTURE.md` | superseded snapshot | `../frontend/FRONTEND_ARCHITECTURE.md` |
| `FRONTEND_DATA_MODEL.md` | superseded snapshot | `../frontend/FRONTEND_DATA_MODEL.md` |
| `LOCAL_DEV_WITH_PYTHON_BACKEND.md` | stale launch guide | future Prompt 08 tested guides |
| `OPEN_QUESTIONS_FOR_BACKEND.md` | chronological question set | `../DOCUMENTATION_DISCOVERED_ISSUES.md` |
| `PYTHON_BACKEND_INTEGRATION_PLAN.md` | superseded plan | `../../backend/docs/handoff/README.md` |
| `QWEN_MODEL_RUNTIME_AND_WEB.md` | single-model snapshot | `../../backend/docs/models/MODEL_CATALOG_AND_RUNTIME.md` |
| `README_FRONTEND_HANDOFF.md` | old handoff index | `../README.md` |
| `ROUTE_SCREEN_MAP.md` | superseded route snapshot | `../ux/ROUTE_AND_SCREEN_INVENTORY.md` |
| `STATE_AND_STORAGE.md` | stale state/persistence assumptions | `../frontend/README.md` and `../supabase/README.md` |
| `SUBJECT_MODEL_AND_LANGUAGE_RULES.md` | superseded startup/model rules | `../ux/README.md` and `../cross-system/MODEL_INDEX.md` |
| `SUPABASE_SERVICES.md` | stale service inventory | `../supabase/CONSUMED_OBJECT_INDEX.md` |
| `UI_BACKEND_MAPPING.md` | old ownership map | `../ui/CONTROL_TO_SYSTEM_MATRIX.md` |
| `USER_FLOWS.md` | old UX snapshot | `../ux/README.md` |

Physical relocation/deletion is deferred to Prompt 08 and requires link/import/
build/test evidence plus an explicit restoration procedure. Applied Supabase
migrations are never archive candidates.
