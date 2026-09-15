# Roadmap — compliance / messaging / admission pass

## Done (this pass, core contracts)

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
- [x] English strings for compliance, messaging and system areas.

## In progress (delegated)

- [ ] Compliance/legal/suspended routes + signup fields.
- [ ] Messaging area (routes, composer, attachments, safety notices).
- [ ] Admission gate, System Health, data-rights panel, navigation and settings.
- [ ] Translations for de, gsw, ru, es, fr, it.
- [ ] Documentation + 20 Mermaid diagrams, `lovabledocs/` mirror.

## Final steps

- [ ] Tests for compliance validation, startup order, admission fail-closed, effective caps,
      attachment rules, deletion request shape, sign-out teardown.
- [ ] format, typecheck, lint, check:i18n, test, build.

## Blocked (not this pass)

- Local Python backend: system admission/health/heartbeat/release, safety moderation, peer send,
  attachment scanning, GPU/RAM/disk measurement, load balancing, lease TTL sweeper.
- Legal/organisational: counsel/DPO review of the legal baseline before production.
