# Prompt 09 residual gaps and release effects

| Severity | Gap | Owner | Reproduction / required proof | Release effect |
|---|---|---|---|---|
| Critical | production safety moderator is not implemented | backend + product safety | start full stack, send any chat/assessment request; expect typed `safety_unavailable` | AI chat/assessment cannot ship enabled |
| Critical | privileged moderated peer send and attachment scan are unresolved | backend + Supabase security | attempt send; UI must not claim sent/direct browser insert remains denied | messaging send cannot ship |
| High | nine enabled catalogue IDs have no verified local artifact mapping | model owner | select each ID and prepare; expect typed unresolved | those models must be disabled or mapped before release |
| High | 23 historical migration SQL bodies are unavailable | Supabase owner | clean local `supabase db reset` cannot be proven from repository history | no clean local-Supabase rebuild claim |
| High | no physical macOS/M4 Metal, Ubuntu 24.04, or working Ubuntu CUDA/full-weight smoke | release engineering | run platform checklist, real artifact load and critical AI journey on each host | platform support remains unverified |
| High | hosted two-user RLS/Auth/OAuth/Storage/Edge destructive tests were not authorized | Supabase QA | disposable project/users; run auth, IDOR, bucket, Edge and deletion matrix | hosted integration certification pending |
| High | Assistant generation/parse and Study Plan/Subject Tools/Knowledge refresh have no settled contract | product + backend | invoke controls; they must remain unavailable/non-AI | features remain explicitly unsupported |
| Medium | no concurrent hosted quota allocation or retention/cleanup race load test | Supabase QA | parallel disposable uploads plus overlapping cleanup/retention jobs | capacity/cleanup hardening pending |
| Medium | no sustained distinct-request inference load, physical OOM or process-kill soak | model/runtime QA | bounded multi-user load and forced runtime exit on physical hosts | concurrency limits need certification |
| Medium | no real browser automation/accessibility/visual/PDF/speech suite | frontend QA | run supported browsers, keyboard/screen reader and responsive matrix | UI release smoke pending |
| Low | foreground lifecycle test missed its 12-second readiness window once under concurrent validation load | operations owner | isolated rerun passed, then full 109-test rerun passed; monitor CI recurrence | recorded timing flake, not a release block unless repeated |
| Low | Vite reports that `vite-tsconfig-paths` is now redundant | frontend owner | run frontend tests/build and observe warning | no functional release block |

Deterministic fixtures and simulated host profiles remain valuable regression
tests, but none of the manual items above is counted as a pass.
