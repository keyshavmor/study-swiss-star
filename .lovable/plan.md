# hCaptcha authentication repair

- Set hCaptcha as the public provider in both environment contexts; preserve canonical production wiring.
- Search public configuration without displaying values. If absent, report `SITEKEY_MISSING`; never use a secret as a sitekey.
- Align the widget with the official Supabase hCaptcha guide, clear one-time tokens and reset after every attempt, and preserve all four password-flow contracts.
- Add focused regression coverage, synchronize authentication documentation, and run available formatting, lint, translation, and full-test checks. Inspect automatic build/typecheck results rather than running prohibited manual builds.
- Only attempt production browser authentication when a real public sitekey and solvable challenge are available; report only observed outcomes.

## Technical details
Prefer `@hcaptcha/react-hcaptcha` for reliable widget lifecycle. No backend/Python, GitHub, database, or secret changes. The root environment currently has stale browser-facing production settings; correct only public configuration while preserving unrelated entries.
