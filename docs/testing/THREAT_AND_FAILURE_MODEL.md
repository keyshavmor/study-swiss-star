# Threat and failure model

| Threat/failure | Boundary and expected behavior | Automated evidence | Residual |
|---|---|---|---|
| missing, malformed, forged, expired or wrong-project JWT | central verifier rejects; `claims.sub` alone owns data | contract/auth and all-endpoint 401 tests | real hosted token rotation smoke |
| IDOR/cross-user RAG or assessment | explicit owner assertion/filter plus RLS; foreign IDs look absent | context, assessment, model-operation and Supabase adapter tests | hosted two-user RLS smoke |
| traversal, MIME spoof, binary text, oversize | owner path, signature and byte ceilings reject before index | API/chat-RAG/attachment tests | decompression-bomb scanner policy unresolved |
| prompt injection in retrieved content | material is delimited as untrusted data; it never becomes instruction authority | chat/RAG contract test | model-level red-team corpus needs approved moderator |
| unsafe output/input | inference requires explicit safety verdict and otherwise fails closed | chat and assessment safety tests | production moderator is a release blocker |
| RPC/function privilege escalation | anon grants reduced; definer paths pinned; sensitive functions re-authenticate | Supabase security tests | live two-role execution smoke |
| CORS/CSRF | credentialed origins are explicit loopback; bearer APIs do not use cookie identity | API CORS/config tests | browser preflight smoke |
| secret or private-content leakage | bounded errors, no provider bodies, telemetry allowlist, publishable-key guard | contract, telemetry, Supabase tests | operator log review before release |
| quota/rate race | authoritative database quota functions; frontend preflight is advisory | quota/migration tests | concurrent hosted allocation load test missing |
| partial deletion | local stage is owner-scoped/idempotent; Supabase stage returns explicit receipt/partial state | privacy and Edge static tests | destructive disposable-account drill missing |
| backend/Supabase/model offline | non-AI paths remain; dependent operation returns typed unavailable, never fake answer | adapters, readiness, assessment/chat tests | full browser service-loss smoke |
| corrupt/interrupted model download or disk full | exact size/hash/GGUF, partial file, lock, disk preflight, atomic publish | artifact tests | real 17.67 GiB resume not run |
| GPU OOM/runtime crash | resource admission blocks low capacity; dead runtime is not ready; interrupted operation recovers failed | runtime/platform/API tests | physical OOM/restart drill missing |
| concurrent prepare/inference | shared download joins one operation; idempotency serializes same chat/assessment key | runtime/chat/assessment tests | sustained distinct-request load test missing |
| stream disconnect/timeout/cancel | browser abort reaches loopback fetch/model; FastAPI streaming request is explicitly rejected | frontend adapter and async cancellation tests | process kill during real generation manual |
| stale heartbeat/lease | owner heartbeat only; expiry sweep and release are idempotent | coordinator tests | long-running physical soak missing |
| partial persistence/cleanup race | completed answers/results require durable read-back; failure stays explicit | chat/assessment/Supabase tests | retention cron overlap load test missing |
| occupied port/stale PID/partial launch/signal | refuse foreign owner, discard stale owned state, roll back only new layers | operations lifecycle tests | normal-host execution required when sandbox denies sockets |

The highest-impact unresolved controls are the concrete production safety
moderator and privileged peer-message/attachment path. They must not be bypassed
with direct writes or an allow-all implementation.
