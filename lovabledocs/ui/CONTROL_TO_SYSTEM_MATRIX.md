# 07 — End-to-end feature responsibility matrix

| Field | Value |
|---|---|
| Owner | UI/frontend with Supabase and backend contract owners |
| Status | Row-specific; never infer backend implementation from this matrix |
| Canonical path | `docs/ui/CONTROL_TO_SYSTEM_MATRIX.md` |
| Verified | frontend `f0910e6`, backend baseline `bff4ec7`, 2026-09-18 |

Each row is a meaningful control family. “Backend” means local FastAPI unless
explicitly stated. Code paths are relative to `frontend/src`.

| User goal/control | Frontend start/state | Supabase/external | Backend responsibility | Result/error/test |
|---|---|---|---|---|
| Sign in by email | `AuthForm.tsx`; submit/disabled/error | Auth password | none | route through startup resolver; safe localized auth errors |
| Sign in by username | `AuthForm`; username/password | `username-login` Edge Function | none | generic invalid credentials; no email enumeration |
| Sign up | role/DOB/guardian/legal fields | Auth + username availability; defaults trigger | none | session or confirm-email state; consent not auto-accepted |
| OAuth | provider buttons | Supabase Auth GitHub/LinkedIn/Spotify | none | callback/startup; provider errors sanitized |
| Password recovery/update | update route fields | Auth recovery/update | none | invalid/expired state; invalidate startup session state |
| Choose/skip language | onboarding language cards/buttons | save default preference if selected | none | session decision; failure never silently skips |
| Probe system | model page capability panel | reads catalogue/policy | measure local host | truthful values/null; timeout→unavailable |
| Choose model | readiness selector | persist preference | allowlisted ID only | preference ≠ readiness; save failure visible |
| Prepare/retry model | panel button/progress | policy inputs only | preflight/download/verify/load/poll | real/null progress; bounded reason; ready only from backend |
| Continue without AI | model page button | none | none | session non-AI; product accessible, AI requests blocked |
| Admission diagnostics | optional route check | admission policy | lease/queue/resources | no login dependency; invalid/unavailable fails closed |
| Compliance submit | form/checkboxes | compliance row/consents/RPC | none ordinarily | validated durable completion; suspension precedence |
| Refresh suspended status | suspended page retry | compliance row | none | remain suspended or restart canonical gate |
| Header navigation | AppHeader/mobile links | notifications/messages reads | none | accessible routes and unread indicators |
| Change language/theme/year | menus/toggles/select | preferences where durable | none | UI rerender/cache; seven-language parity |
| Sign out | header/chat/onboarding buttons | Auth sign out | best-effort runtime release | clear gates/local sensitive state even if backend down |
| Add/import subject | school controls/dialog | currently browser/app-data; potential documents | ingestion only if upload contract | non-AI remains functional |
| Sort/filter subjects | school selects | none | none | deterministic local state |
| Switch subject component/mode | subject selectors/tabs | local state | scope future AI request | no request merely for switching |
| Add/edit/duplicate/move/delete grade | assessment dialogs/actions | currently browser-local | none for manual grades | validation and statistics update |
| Import transcript | transcript dialog/upload | current app-data/possible Storage future | parser only when contracted | never claim server persistence today |
| Upload/list/delete material | MaterialsPanel | `documents/chunks`, `user-materials`, quota | parse/chunk/embed/index/delete local state | per-user isolation; visible parse status/failure |
| Create/delete study thread | StudyChat/ThreadList | `threads`, cascading messages | none | ownership through RLS |
| Send study prompt | StudyChat → TanStack `/api/chat` | thread check, message persistence | moderate, RAG, local inference | fail closed; stream backend bytes only; sources/metadata |
| Stop chat | prompt input stop | no new durable assistant message | cancel model/retrieval | no orphan operation; no fake answer |
| Read aloud/stop | message Listen control | browser SpeechSynthesis | none | frontend-only supported/unsupported state |
| View citation/exam tip/model | source list/message metadata | none | response provenance | exact backend metadata; no invented source |
| Create Assistant thread | AssistantChat | assistant tables | none | RLS-owned persisted thread |
| Attach/remove Assistant file | AssistantChat picker | private chat bucket/attachment row/quota | scan/parse/index future | `unparsed` truthful until backend completes |
| Send Assistant prompt | AssistantChat | persist user input | generation gap | no fabricated reply; future typed endpoint |
| New peer conversation | NewConversationDialog | exact-username + get/create RPC | none | exact result; no broad user search |
| Open/read peer conversation | list/thread | membership RLS + mark-read RPC | none | offline unread delivered/read marked |
| Attach peer file | AttachmentPicker | private staging/promotion | validate/scan | compressed client input still untrusted; fail closed |
| Send peer message | MessageComposer | direct insert denied; backend writes after moderation | moderate + atomic send/notify | no backend→not sent; idempotent |
| Add/edit/delete planner event | planner dialogs/menu | current store/live table reconciliation needed | none | recurring scope honored |
| Calendar connect/sync/disconnect | GoogleCalendarCard/planner | Google identity + Calendar v3 | none today | pending marker prevents wrong provider token capture |
| Add/filter statistics | stats controls | browser data/live tables future | none for manual actions | correct grade math and empty states |
| Edit profile/avatar | profile dialog | profiles + private avatars/quota | none | owner-only upload/update/delete |
| Change preferences | SettingsSections | user_preferences | response policy later consumed | failed persistence visible |
| Model settings retry/switch | ModelReadinessPanel | catalogue/preference/policy | same lifecycle as onboarding | cannot clobber manual selection with late recommendation |
| View health | SystemHealthPanel | user-visible health RPC | local resources/queues/models | privacy-filtered; missing values shown unknown |
| View quota | UserQuotaCard | quota RPC | account for backend writes | no zero/default fabrication |
| Emergency cleanup | storage action | cleanup Edge Function/RPC | coordinate local state if relevant | partial results visible; idempotent |
| Delete date range | DataRightsPanel | `delete-my-data`/service RPC | erase matching local state | resumable receipt; no silent partial success |
| Delete all content | DataRightsPanel | all user-owned rows/objects, keep account | purge all local user state | account survives; session policy explicit |
| Delete account | confirmation | revoke/sign out/delete auth/data | release/purge local state | irreversible confirmation and completion receipt |
| Submit feedback | feedback form | Edge Function + DB + private text object | none | clear only if all result flags true |
| Notifications | NotificationCenter | notification state/events | none unless worker produces event | unread/read/empty/error behavior |
| Generate quiz/mock exam | assessment setup | quiz/exam job records | generate + schema validate + private keys | real phases; cancel/TTL cleanup |
| Begin/answer/navigate assessment | runner inputs/nav | attempt state | authoritative start/deadline/heartbeat | reconnect/concurrent tab/timing tests |
| Review/submit/abandon | review/actions | durable final snapshot only on submit | grade or cleanup ephemeral state | idempotent submit; abandon deletes private set |
| Poll/view results | waiting/results/profile | grading result/snapshot | grade with rubric/private key | no answer leak; retry/failure explicit |
| Generate study plan/tools | subject tool actions | study_plans or agreed persistence | structured validated generation | currently backend gap; non-AI UI unaffected |
| Media response retention | assistant/media path | queue + descriptor bucket + source bucket | create descriptor then cleanup worker | no descriptor means no delete |
| Telemetry | global/root and actions | activity Edge Function/events/log bucket | sanitize backend events | no token/raw prompt/private file content |
| Legal/help/PDF | legal/help routes | none | none | static/localized; legal review marker remains |

## Cross-cutting state transition template

For each row, future implementation documentation must expand: precondition →
validation → disabled/loading → request/auth → idempotency/cancellation → local
backend/Supabase transaction → response normalization → persistence → localized
success/error/retry → telemetry/privacy → unit/contract/E2E proof.
