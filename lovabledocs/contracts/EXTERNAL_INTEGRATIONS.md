Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# External Integrations

No secret values are included anywhere below.

## Google Calendar / Google OAuth

- **Frontend entry point**: Planner screen, `frontend/src/routes/_authenticated/planner.tsx`, using `frontend/src/lib/google-calendar.ts`.
- **Supabase Auth involvement**: `supabase.auth.linkIdentity({ provider: "google", options: { scopes: GOOGLE_CALENDAR_SCOPE, redirectTo, queryParams: { access_type: "online", prompt: "consent" } } })` links Google to the *existing* signed-in Supabase user — this is account linking, not a separate sign-in flow.
- **Scopes**: `https://www.googleapis.com/auth/calendar.readonly` only (`GOOGLE_CALENDAR_SCOPE`). No write scope is ever requested.
- **Credential ownership**: Google issues the OAuth token; Supabase brokers the OAuth handshake and returns a session carrying `session.provider_token`. No credentials are owned or minted by the local Python backend.
- **Token lifetime**: Google access tokens are treated as living roughly one hour; the frontend conservatively caches an expiry of `now + 55 minutes` (`captureProviderToken`).
- **Token persistence**: **Not persisted to any database.** Kept only in the browser's `sessionStorage`, key `alim.google-calendar.provider-token` (`TOKEN_KEY` in `google-calendar.ts`), for the current browser session only. Never written to `localStorage`, never sent to Supabase tables, never included in telemetry.
- **Frontend storage**: `sessionStorage["alim.google-calendar.provider-token"]` → `{ token: string, expiresAt: number (epoch seconds) }`.
- **Backend involvement**: none today — the browser calls `https://www.googleapis.com/calendar/v3/calendars/primary/events` directly with the cached token; the local Python backend never sees Google Calendar data.
- **Failure flow**: `401`/`403` from Google → token is cleared from `sessionStorage` and `GoogleCalendarAuthError("access-expired", ...)` is thrown, surfaced as `calendar.error.accessExpired`; other non-OK statuses → `GoogleCalendarError("request-failed", ...)` → `calendar.error.requestFailed`. Linking failures during `connectGoogleCalendar` map to `manual-linking-disabled` / `provider-not-enabled` / `connect-failed` based on the Supabase error message content (see `docs/contracts/ERROR_CONTRACTS.md`).
- **Disconnect behaviour**: `clearGoogleAccess()` removes the `sessionStorage` key (used both for explicit "Disconnect" action and automatically on token rejection / sign-out). Disconnecting is purely local-browser state — it does not revoke the Google grant itself and does not touch the Supabase identity link.

## GitHub (OAuth sign-in)

- **Frontend entry point**: `frontend/src/components/AuthForm.tsx` (`OAUTH_PROVIDERS`, provider `"github"`), via `supabase.auth.signInWithOAuth({ provider: "github" })`.
- **Supabase Auth involvement**: full sign-in provider (not account linking) — this is one of the ways a user can authenticate into the app.
- **Scopes**: default GitHub OAuth scopes as configured in the Supabase Auth provider settings (not specified in frontend code — no explicit `scopes` option passed).
- **Credential ownership**: GitHub issues the OAuth token; Supabase Auth manages the resulting session/identity.
- **Token lifetime / persistence**: standard Supabase session lifetime and storage (Supabase's own session persistence, not a bespoke `sessionStorage` key as with Google Calendar — GitHub sign-in does not require ongoing API access beyond authentication, so no separate provider-token caching exists in `google-calendar.ts`-style code).
- **Frontend storage**: none beyond the normal Supabase session (managed by the Supabase client, not documented here as it's the standard Auth session, not a special integration key).
- **Backend involvement**: none — sign-in only, no API calls to GitHub after authentication.
- **Failure flow**: OAuth failures surface via Supabase's `signInWithOAuth` error, expected to map to `auth.authenticationFailed` at the call site.
- **Disconnect behaviour**: standard sign-out (`frontend/src/lib/sign-out.ts`) ends the Supabase session; no GitHub-specific disconnect action exists (GitHub is a sign-in method, not a linked data source).

## LinkedIn (OAuth sign-in)

- **Frontend entry point**: `frontend/src/components/AuthForm.tsx`, provider `"linkedin_oidc"`, via `supabase.auth.signInWithOAuth({ provider: "linkedin_oidc" })`.
- **Supabase Auth involvement**: full sign-in provider (OIDC).
- **Scopes**: default LinkedIn OIDC scopes as configured in Supabase Auth provider settings; not overridden in frontend code.
- **Credential ownership**: LinkedIn issues the identity token; Supabase Auth manages the session.
- **Token lifetime / persistence**: standard Supabase session; no bespoke provider-token caching in the frontend.
- **Frontend storage**: none beyond the standard Supabase session.
- **Backend involvement**: none — sign-in only.
- **Failure flow**: maps to `auth.authenticationFailed` at the call site.
- **Disconnect behaviour**: standard sign-out only; no LinkedIn-specific data access to revoke from the frontend's perspective.

## Spotify (OAuth sign-in)

- **Frontend entry point**: `frontend/src/components/AuthForm.tsx`, provider `"spotify"`, via `supabase.auth.signInWithOAuth({ provider: "spotify" })`.
- **Supabase Auth involvement**: full sign-in provider.
- **Scopes**: default Spotify OAuth scopes as configured in Supabase Auth provider settings; not overridden in frontend code (no Spotify Web API calls are made by the app — this is sign-in only).
- **Credential ownership**: Spotify issues the OAuth token; Supabase Auth manages the session.
- **Token lifetime / persistence**: standard Supabase session; no bespoke provider-token caching (unlike Google Calendar, there is no ongoing Spotify API usage requiring a cached access token).
- **Frontend storage**: none beyond the standard Supabase session.
- **Backend involvement**: none.
- **Failure flow**: maps to `auth.authenticationFailed` at the call site.
- **Disconnect behaviour**: standard sign-out only.

## Summary table

| Integration | Purpose | Ongoing API access after sign-in | Provider token cached client-side | Backend involvement |
|---|---|---|---|---|
| Google | Read-only Calendar overlay in Planner | Yes (`calendar.readonly`) | Yes — `sessionStorage`, session-scoped | None |
| GitHub | Sign-in only | No | No | None |
| LinkedIn | Sign-in only | No | No | None |
| Spotify | Sign-in only | No | No | None |
