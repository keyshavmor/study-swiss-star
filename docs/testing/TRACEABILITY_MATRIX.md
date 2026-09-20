# Critical-journey traceability matrix

The executable source is
[`tests/contracts/feature-traceability.json`](../../tests/contracts/feature-traceability.json).
`tests/e2e/test_critical_journey_contracts.py` fails if a shipped route, named
evidence file or required journey disappears. “Manual” never means “passed.”

| Journey | Frontend | Local backend | Supabase | Offline E2E | Current disposition |
|---|---|---|---|---|---|
| Auth/password/OAuth/recovery | auth/error/username/CAPTCHA contracts | N/A | Auth + username functions | route/evidence gate | automated contracts; real provider/mail manual |
| Legal/startup shell | navigation/recovery contract | N/A | N/A | route/evidence gate | static content; legal review manual |
| Language | session/gate/route contracts | N/A | durable preference types | route/evidence gate | automated |
| Model select/prepare/skip | catalogue/readiness/admission adapters | registry, artifact, lease, platform | catalogue/policy reads | tiny model lifecycle | physical model/hardware manual |
| Compliance/suspension | validation/startup tests | N/A | schema/RLS evidence | route/evidence gate | hosted transition manual |
| Shell/home | post-login/sign-out/non-AI gates | health/release | preferences | route/evidence gate | responsive/accessibility manual |
| School/materials | mode, attachment, quota contracts | bounded ingest/RAG | owner/storage assertions | tiny local retrieval | private Storage two-user manual |
| Study Chat | adapter/abort/error/safety contracts | auth/RAG/idempotency/isolation | owner-filtered transcript adapter | tiny process chat | production moderator unresolved |
| Assistant | attachment/failure contracts | parser primitives only | owned persistence evidence | route/evidence gate | generation/parse unsupported |
| Assessment | state machine/backend adapter | full lifecycle/grading/isolation | owner-scoped snapshots | route/evidence gate | real model + hosted persistence manual |
| Peer messaging | RPC/read/attachment/safety contracts | N/A | RLS/function boundaries | route/evidence gate | moderated privileged send unsupported |
| Planner/Calendar | token attribution | N/A | typed event data | route/evidence gate | Google account manual |
| Statistics | grade/assessment state | N/A | N/A | route/evidence gate | visual browser smoke manual |
| Profile | quota/data-state contracts | N/A | owner/storage evidence | route/evidence gate | avatar two-user manual |
| Settings/privacy | preference/quota/model contracts | purge/release/model APIs | deletion/cleanup functions | route/evidence gate | account deletion manual/irreversible |
| Feedback | full/partial/failure classification | N/A | Edge + private Storage boundary | route/evidence gate | hosted partial-failure manual |
| Help | route protection | N/A | N/A | route/evidence gate | PDF/browser smoke manual |
| System health | payload/capability normalization | aggregate health/capability | health payload contract | route/evidence gate | live adviser/physical readings manual |

All 27 FastAPI endpoints are frozen in
[`local-backend-v1.json`](../../tests/contracts/local-backend-v1.json). The E2E
inventory test compares that fixture with the actual FastAPI router, checks the
OpenAPI operation for each method/path, and calls every private endpoint without
a token to prove a correlated, versioned, no-store 401 response.

Intentional browser-only or non-AI paths remain available when the backend or
model is down. Assistant generation, privileged peer send, safety moderation,
Study Plan, Subject Tools and Knowledge Profile refresh stay explicitly
unsupported or fail-closed; traceability does not mislabel them as implemented.
