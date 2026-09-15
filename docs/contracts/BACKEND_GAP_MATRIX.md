# Backend Gap Matrix

Status: CURRENT — REASSESSED 2026-09-15

| Capability | State | Evidence / next decision |
|---|---|---|
| Subject chat + secure JWT | IMPLEMENTED | frontend adapter and `backend/app/main.py` |
| Context/RAG/memory/web | IMPLEMENTED | `backend/app/context/` |
| Local Qwen runtime | IMPLEMENTED | `backend/app/services/`, model/runtime modules |
| Live AI model catalog/runtime policy | LIVE, NOT BACKEND-CONSUMED | Supabase exposes authenticated-read-only `ai_model_catalog` and guarded `get_ai_runtime_policy()`; the local FastAPI runtime still uses its existing environment/configuration path. Define startup/request authentication and failure fallback before wiring this production policy into the local service. |
| Seven-language response contract | IMPLEMENTED | server detection + explicit FastAPI language |
| Private material indexing | IMPLEMENTED, NOT UI-WIRED | FastAPI endpoints exist; current Materials UI has metadata only |
| General Assistant persistence | IMPLEMENTED | `assistant_*` and `assistant-data.ts` |
| General Assistant generation | DEFERRED | no current product endpoint/history/attachment semantics |
| Assistant attachment parsing | DEFERRED | UI stores objects/metadata; no parse worker contract |
| Generated-media cleanup | IMPLEMENTED CONSUMER | deployed minute cron/function; no active media producer |
| Generated-media descriptor producer | DEFERRED | backend produces no media |
| Quiz/mock exam/grading/study plan generation | DEFERRED | live tables and UI placeholders exist; endpoints undefined |
| Transcript OCR | DEFERRED | current dialog is client-side entry only |
