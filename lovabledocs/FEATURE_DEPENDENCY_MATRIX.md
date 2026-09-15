# Feature Dependency Matrix

Status: CURRENT — RECONCILED 2026-09-15

| Feature | Frontend | Supabase | FastAPI/local model | State |
|---|---|---|---|---|
| Auth/profile/settings | current-main routes/components | Auth, profiles, preferences, avatars, auth functions | none | implemented |
| Subject chat | StudyChat + TanStack API | threads/messages + JWT/RLS | context/RAG/memory/Qwen | implemented |
| Seven-language reply | i18n detector/provider | preference default | explicit language compiler instruction | implemented |
| Planner | current-main local state | tables exist but not active UI writer | none | implemented local UI |
| Google Calendar | browser read-only client | linked identity only | prohibited from receiving token/content | implemented |
| General Assistant | current Assistant UI | assistant tables + attachment bucket | generation/parsing undefined | persistence only |
| Materials | current metadata panel | user-materials/documents/chunks exist | secure ingestion endpoints | backend not UI-wired |
| Feedback/telemetry | forms/sanitizer | functions, rows, private mirrors | none | implemented; function hardening pending deploy |
| Generated media retention | settings/read contract | queue, descriptor bucket, minute cleanup | no producer | consumer infrastructure only |
| Study tools | placeholder modes | tables exist | endpoints undefined | deferred |
