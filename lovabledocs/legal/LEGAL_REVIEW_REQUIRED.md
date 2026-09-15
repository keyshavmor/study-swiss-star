```
Document status: LEGAL REVIEW REQUIRED BEFORE PRODUCTION
```

# Legal review required before production

This document exists because frontend code and Supabase configuration **cannot** establish legal
compliance on their own. Nothing in this repository — including the compliance onboarding flow,
the safety-strike policy, or the data-rights controls — constitutes GDPR certification, COPPA
certification, or any other regulatory certification. No such claim is made anywhere else in this
documentation set, and this file is the explicit place that says so.

## What IS implemented (CURRENT FRONTEND / CURRENT SUPABASE)

- A compliance-onboarding gate (`account_compliance`, RPC `complete_account_compliance_onboarding`)
  that collects account type, date of birth, guardian email (students), and records acceptance of
  four dated legal documents (terms, privacy, acceptable-use, child-safety — version `2026-09-15`).
- Per-consent audit rows in `user_legal_consents`.
- A data-rights self-service surface: `get_my_data_summary()` and the `delete-my-data` Edge
  Function (range / all-content / delete-account modes), scoped to the caller only via a verified
  JWT.
- A safety-strike workflow that stops at "queued for human review" and never auto-discloses to a
  guardian or auto-deletes data based solely on an unreviewed AI classification.

None of the above is a substitute for legal sign-off. They are technical building blocks that a
legal/compliance decision can rely on — not proof that the decision has been made correctly.

## What is explicitly NOT decided by this codebase (LEGAL REVIEW REQUIRED BEFORE PRODUCTION)

1. **Lawful basis for processing** minors' personal data (consent vs. legitimate interest vs.
   contract) per jurisdiction — not determined here.
2. **Data Processing Agreements (DPAs)** with Supabase, any local-backend hosting provider, and any
   sub-processor — not drafted or executed here.
3. **Jurisdictional guardian-consent rules** — the age threshold (18) and "guardian email required
   for students" are product defaults, not a verified legal age-of-consent-to-processing
   determination for every applicable jurisdiction (which varies, e.g. 13–16 in different EU member
   states under GDPR Art. 8).
4. **Records of processing activities (ROPA)** under GDPR Art. 30 — not produced here.
5. **Data breach notification procedure** (72-hour authority notification, affected-user notice) —
   not defined or automated here.
6. **Cookie / ePrivacy analysis** for any tracking, analytics, or storage mechanism used by the
   frontend — not performed here.
7. **International data transfer mechanisms** (SCCs, adequacy) if Supabase or the local backend's
   hosting spans jurisdictions — not assessed here.
8. **Retention-period justification** for `moderation_events`, `guardian_notification_queue`, and
   ordinary content tables — bounded metadata storage is implemented, but the retention *period*
   and its legal justification are not fixed here.
9. **Data Protection Impact Assessment (DPIA)** for processing children's data at scale — not
   produced here.
10. **Regulatory certification of any kind** (GDPR "certification" is not a self-declared status
    under the Regulation in any case) — never claim this; use "reviewed by counsel/DPO" instead.

## Who must close these gaps

A qualified data protection officer or external counsel, engaged by the school/operator deploying
this product, before the product is used with real students in production. See references to this
file from `DATA_FLOW_AND_PRIVACY.md` and `supabase/SUPABASE_CURRENT_STATE.md`.
