# UX documentation

| Field | Value |
|---|---|
| Owner | Product UX and frontend |
| Status | `CURRENT — FRONTEND` unless a row says otherwise |
| Canonical path | `docs/ux/README.md` |
| Verified against | frontend `f0910e6971f12efe0ad547b904f6e2a518b13856` |
| Last reviewed | 2026-09-18 |

Start with [Route and screen inventory](ROUTE_AND_SCREEN_INVENTORY.md). It
records public/startup routes, authenticated navigation, product routes,
control families and the states that must remain truthful.

Supporting frontend-authority evidence:

- [Route-to-screen detail](ROUTE_SCREEN_MAP.md)
- [User journeys](USER_JOURNEYS.md)
- [Route graph](ROUTE_SCREEN_MAP.mmd)
- [User-flow graph](USER_FLOW_MAP.mmd)

Canonical startup order is: authentication → suspension check → per-session
language decision → per-session model decision (`ready` or explicit non-AI) →
compliance when required → home. `/onboarding/system-admission` is diagnostic,
not a mandatory login gate. Authentication and non-AI navigation never depend
on local model readiness.

Every future UX change must update the route inventory, the UI control matrix,
and the executable route/tests in the same change. A selected model preference
is never equivalent to local runtime readiness.
