# Roadmap — compliance / messaging / admission pass

## Done (this pass)

- [x] Production Supabase types: `account_compliance`, `user_legal_consents`, `moderation_events`,
      `guardian_notification_queue`, peer messaging tables, new RPCs and row types.
- [x] `lib/compliance.ts` — legal versions 2026-09-15, validation, RPC call, consent reads.
- [x] `lib/local-backend-endpoints.ts` — central endpoint registry.
- [x] `lib/system-admission.types.ts` — admission states, policy defaults, effective caps
      (75% ceiling reconciled with the 30/25/30 free floors → GPU 70 / RAM 75 / storage 70).
- [x] `lib/admission-session.ts` — per-session lease, fail-closed gate.
- [x] `lib/safety.types.ts` — verdicts, bounded categories, review-gated strike policy.
- [x] `lib/system-backend.server.ts`, `system.functions.ts` — admission/health/release/heartbeat.
- [x] `lib/safety-backend.server.ts`, `safety.functions.ts` — moderate + fail-closed peer send.
- [x] `lib/attachment-processing.ts` — MIME allow-list, 250000-byte budget, image compression.
- [x] `lib/peer-messaging.ts` — RLS-scoped reads, exact-username RPCs, realtime.
- [x] `lib/system-health.ts` — Supabase health, own-data summary, `delete-my-data`.
- [x] `lib/startup-flow.ts` — compliance → language → admission → model → home, suspension first.
- [x] `lib/sign-out.ts` + `messaging-session.ts` — best-effort runtime release and state teardown.
- [x] Compliance/legal/suspended routes + extended signup fields.
- [x] Messaging area (routes, conversation list, thread, composer, attachments, safety notices).
- [x] Admission gate route, System Health page, data-rights panel, navigation and settings.
- [x] All strings in en, de, gsw, ru, es, fr, it (1170 keys each, gsw ß-free).
- [x] Documentation + 20 Mermaid diagrams, `lovabledocs/` byte-identical mirror.
- [x] Tests: compliance validation, startup order, admission fail-closed, effective caps,
      attachment rules, deletion request shape, safety verdicts, health "Not exposed".
- [x] format, typecheck, lint, check:i18n, tests (66/66), build — all green.

## Blocked (not this pass)

- Local Python backend: system admission/health/heartbeat/release, model prepare/status,
  safety moderation, peer send, attachment scanning, GPU/RAM/disk measurement, load balancing,
  lease TTL sweeper.
- Legal/organisational: counsel/DPO review of the legal baseline before production.

## Current hCaptcha repair

- [ ] Configure hCaptcha and audit public sitekey availability without exposing secrets.
- [ ] Align widget lifecycle and preserve all password-flow token contracts; add regressions.
- [ ] Synchronize docs and run available validation.
- [ ] Real production auth smoke test (blocked until public sitekey and solved challenge are available).
