# Feature-to-owner index

| Field | Value |
|---|---|
| Owner | Architecture |
| Status | Mixed; detailed states are in the control matrix |
| Canonical path | `docs/cross-system/FEATURE_OWNER_INDEX.md` |
| Verified | 2026-09-18 against frontend `f0910e6` and backend `bff4ec7` |

| Feature domain | UX/UI/frontend owner | Supabase/external owner | Local backend owner | Current disposition |
|---|---|---|---|---|
| Auth, recovery, OAuth | auth/startup routes | Supabase Auth + OAuth providers | none | `CURRENT — FRONTEND` + `CURRENT — SUPABASE` |
| Language/model/compliance startup | onboarding routes/session gates | preferences, compliance, catalogue/policy | capability/prepare/readiness/admission | frontend/Supabase current; backend model platform gap |
| School, grades, planner, stats | product routes and `asa.data.v2` | Calendar external; future persistence decision | AI study tools only | non-AI current; persistence/AI gaps explicit |
| Study chat | StudyChat + TanStack route | threads/messages, RLS | moderation, RAG, local inference | bearer/RAG bridge current; safety endpoint remains a fail-closed gap |
| General Assistant | Assistant UI and attachment state | assistant tables/private bucket | generation/parse/scan | persistence current; generation gap |
| Peer messaging | messages routes/components | conversation/message objects and RLS | moderation, scan, atomic send | UI/Supabase current; backend send gap |
| Assessments/study plans | assessment UI and adapter | quiz/exam/attempt/result objects | job lifecycle, private keys, grading | frontend contract current; backend gap |
| Profile/settings/quota/privacy | settings/profile/data-rights controls | profiles/preferences/RPCs/Storage/functions | local-state cleanup and runtime release | mixed; partial-result truth required |
| Health/telemetry | panels and normalized events | user-visible health/activity log | privacy-filtered host/runtime health | frontend/Supabase partial; backend contract gap |
| Legal/help/accessibility | legal/help routes and static assets | none | none | `CURRENT — FRONTEND`; legal review remains separate |

For individual buttons, fields, options, background events, loading/disabled
states, errors and tests, use the canonical
[control-to-system matrix](../ui/CONTROL_TO_SYSTEM_MATRIX.md) and the detailed
[UI event map](../frontend/UI_EVENT_TO_SYSTEM_MAP.md).
