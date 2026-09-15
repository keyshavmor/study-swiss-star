# Backend Gap Matrix

Status: CURRENT — REASSESSED 2026-09-15

| Capability | State | Evidence / next decision |
|---|---|---|
| Subject chat + secure JWT | IMPLEMENTED | frontend adapter and `backend/app/main.py` |
| Context/RAG/memory/web | IMPLEMENTED | `backend/app/context/` |
| Local Qwen runtime | IMPLEMENTED | `backend/app/services/`, model/runtime modules |
| Seven-language response contract | IMPLEMENTED | server detection + explicit FastAPI language |
| Private material indexing | IMPLEMENTED, NOT UI-WIRED | FastAPI endpoints exist; current Materials UI has metadata only |
| General Assistant persistence | IMPLEMENTED | `assistant_*` and `assistant-data.ts` |
| General Assistant generation | DEFERRED | no current product endpoint/history/attachment semantics |
| Assistant attachment parsing | DEFERRED | UI stores objects/metadata; no parse worker contract |
| Generated-media cleanup | IMPLEMENTED CONSUMER | deployed minute cron/function; no active media producer |
| Generated-media descriptor producer | DEFERRED | backend produces no media |
| Quiz/mock exam/grading/study plan generation | DEFERRED | live tables and UI placeholders exist; endpoints undefined |
| Transcript OCR | DEFERRED | current dialog is client-side entry only |
