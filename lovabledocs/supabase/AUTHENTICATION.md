Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# Authentication

CURRENT — SUPABASE (declared from frontend types and migration sources; not machine-verified this
pass) for provider/config assumptions; CURRENT — FRONTEND for the code paths cited below, all of
which live in `frontend/src/components/AuthForm.tsx` unless noted.

## Sign-in surface

`frontend/src/components/AuthForm.tsx` is the single authentication surface, rendered at `/`
(`frontend/src/routes/index.tsx`) and its `/auth` alias (`frontend/src/routes/auth.tsx`). It offers
one "Email or username" identifier field plus password, and mode toggles for sign-up and password
reset.

## Email/password

- **Live result, 2026-09-15:** production email/password requests without a CAPTCHA token return
  HTTP 400 / stable code `captcha_failed`. This was reproduced directly with the same
  `@supabase/supabase-js` calls as the app. The rejected signup created no user.
- **Frontend repair:** email sign-in, signup and reset now fail closed until the configured
  Turnstile or hCaptcha widget returns a token, then pass it as `options.captchaToken`. The token is
  React state only: it is cleared after every attempt and is never persisted, logged or sent to
  telemetry. Username login remains on its server-side v2 endpoint and does not use the browser
  CAPTCHA.
- **Public configuration required:** `VITE_AUTH_CAPTCHA_PROVIDER` (`turnstile` or `hcaptcha`) and
  `VITE_AUTH_CAPTCHA_SITE_KEY`. The matching private CAPTCHA secret stays only in the production
  Auth dashboard; it must never be placed in a `VITE_*` variable.
- **Sign-up:** `auth.signUp` sends the normalized username plus `account_type_prefill`,
  `date_of_birth_prefill`, and `guardian_email_prefill`; these are metadata hints only. The four
  legal checkboxes remain explicit and are never pre-accepted. The redirect is the public app
  origin. A returned session enters `resolveStartupDestination()` immediately; no session shows the
  localized email-confirmation state.
- **Password reset/update:** reset requests are email-only and CAPTCHA-protected. The public
  `/auth/update-password` route requires a valid recovery/auth session, then returns through
  `resolveStartupDestination()`.

## Username login (`username-login` Edge Function)

When the identifier does **not** contain `@`, the app normalises it
(`normaliseUsername`, lower-cased/trimmed) and validates format locally
(`USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/`, `AuthForm.tsx:35-51`) before calling:

```
supabase.functions.invoke("username-login", { body: { username, password, captcha_token } })
```

- **Caller:** `frontend/src/components/AuthForm.tsx:94`.
- **v3 contract (verified 2026-09-15):** every expected outcome is HTTP 200 with a payload —
  `{ ok: true, access_token, refresh_token, expires_in, token_type }`,
  `{ ok: false, error_code: "invalid_credentials" }`,
  `{ ok: false, error_code: "captcha_required" }`,
  `{ ok: false, error_code: "captcha_failed" }` or
  `{ ok: false, error_code: "authentication_unavailable" }`. An ordinary wrong password is NOT an
  HTTP 401 runtime error any more.
- **Username login is CAPTCHA-protected too:** v3 performs its internal password grant with
  `options.captchaToken`, so the browser MUST supply a fresh one-time challenge token as
  `captcha_token` in the request body. The frontend therefore renders the CAPTCHA widget for ALL
  password paths — email sign in, username sign in, signup and password reset — holds the token in
  component state only, sends it once, and clears it after every attempt. It is never persisted,
  logged or included in telemetry.
- **CAPTCHA outcome mapping:** `captcha_required` → `auth.captchaRequired`, `captcha_failed` →
  `auth.captchaFailed`. Neither is ever shown as wrong credentials. Missing public widget
  configuration fails closed with `auth.captchaUnavailable` before any request is sent.
- **On success:** the frontend immediately calls
  `supabase.auth.setSession({ access_token, refresh_token })`, then enters
  `resolveStartupDestination()` (compliance → language → admission → model → Home).
- **On failure:** `invalid_credentials` shows a generic invalid username/password message — no
  account enumeration, no email disclosed. `authentication_unavailable` (and any transport
  failure) shows a generic service error instead of blaming the credentials.
- **Signup 500 handling:** there is NO special case at all for `unexpected_failure` / HTTP 500 from
  `auth.signUp`. The `username-availability` preflight before `signUp` already handles the normal
  duplicate case (`auth.usernameTaken`), and stable duplicate/user-exists codes are mapped by the
  shared safe mapper; every other failure — including 500 / `unexpected_failure` — uses the generic
  localized auth error. Raw `error.message` is never inspected or displayed.
- **Auth error mapping:** `frontend/src/lib/auth-errors.ts` keys off stable codes only.
  `identity_already_exists` → account-in-use copy; `validation_failed` / `unexpected_failure` →
  generic. HTTP 401 falls back to invalid credentials and 429 to rate-limited; 400/403/422 without
  a recognised stable code fall back to the generic message, because they also occur in signup,
  reset and recovery contexts.
### External Auth configuration (MANUAL / PARTLY VERIFIED)

The following live in the Supabase Auth configuration console and CANNOT be verified or changed from
the Lovable-managed project. They remain manual operator tasks:

- Site URL and the redirect allow-list (must include the app origin and `/auth/update-password`,
  plus `/planner?google=connected` for Google Calendar linking).
- Email confirmation is currently required (`mailer_autoconfirm=false` from the public production
  Auth settings endpoint). This means a successful signup intentionally returns no session until
  the confirmation link is used.
- SMTP / mail sender configuration.
- Password policy: minimum length and leaked-password protection.
- Auth rate limits.
- CAPTCHA provider/secret setup and allowed hostnames. The provider and private secret are not
  exposed by the public settings endpoint. The frontend public provider/site-key variables are
  currently absent from the Lovable-managed environment, so email sign-in/signup/reset must show
  the localized configuration error instead of sending another guaranteed-to-fail request.
- OAuth provider enablement and client credentials (Google linking, GitHub, LinkedIn, Spotify), and
  whether manual identity linking is allowed.

- **Implementation:** deployed externally as a Supabase Edge Function; not present in this repo
  (BACKEND IMPLEMENTATION UNKNOWN for internals, CURRENT — EXTERNAL INTEGRATION for the contract).

## Username availability pre-check (`username-availability` Edge Function)

Called during sign-up, after local format validation and before `supabase.auth.signUp`:

```
supabase.functions.invoke("username-availability", { body: { username } })
```

- **Caller:** `frontend/src/components/AuthForm.tsx:121`.
- **Returns:** `{ available: boolean, valid: boolean }`.
- **Semantics that MUST hold:**
  - `available === false` → show "That username is already taken. Please pick another one."
    (`AuthForm.tsx:132-134`, `auth.usernameTaken`).
  - `valid === false` → show the character-rules error.
  - **If the function call itself errors (`availability.error` truthy) or returns no data, the
    frontend does NOT report the username as taken.** It proceeds to `supabase.auth.signUp`
    (`AuthForm.tsx:128-136`), and the database's unique constraint on `profiles.username` (or
    equivalent) is the final authority — a failed pre-check must never be interpreted as "taken".**
- **Implementation:** deployed externally; not present in this repo.

## OAuth providers

Three OAuth providers are offered as buttons: **GitHub**, **LinkedIn** (`linkedin_oidc`), and
**Spotify** (`AuthForm.tsx:22-31`), each via `supabase.auth.signInWithOAuth({ provider })`. All
three require external configuration (client ID/secret, enabled provider, redirect allowlist) in
the Supabase project — `docs/archive/SUPABASE_SERVICES.md` "External configuration still required".

## Google identity linking (Calendar read-only)

Google is **not** offered as a sign-in method. Instead, an already-signed-in user links a Google
identity from the planner in order to read their calendar:

```
supabase.auth.linkIdentity({
  provider: "google",
  options: {
    scopes: "https://www.googleapis.com/auth/calendar.readonly",
    redirectTo: "<origin>/planner?google=connected",
  },
})
```

- **Caller:** `frontend/src/lib/google-calendar.ts` (planner connect action).
- The Google `provider_token` is kept only in `sessionStorage`, never in the database,
  `localStorage`, or telemetry, and is cleared on sign-out (`frontend/src/lib/sign-out.ts:19`,
  `clearGoogleAccess`) or manual disconnect.
- Requires the `google` provider enabled with manual identity linking allowed, and the
  `calendar.readonly` scope granted, in the Supabase project (external configuration, not in this
  repo).
- Read-only: events are fetched from the Google Calendar v3 API directly by the frontend and merged
  into planner views; nothing is written back to Google and no calendar data is persisted in
  Supabase.

## Session ownership

Every RLS-protected table and Storage policy keys ownership off `auth.users.id`, compared as
`auth.uid()` inside Postgres policies (e.g. `threads.user_id = auth.uid()`,
`(storage.foldername(name))[1] = auth.uid()::text`). There is no separate "owner" concept outside
the Supabase session; a user's data is whatever rows/objects carry their `auth.uid()`.

## Sign-out

`frontend/src/lib/sign-out.ts` (`signOutCompletely`):

1. Attempts runtime-lease release while the access token is still valid.
2. Sends `auth_signout` telemetry, then calls `supabase.auth.signOut()`.
3. In `finally`, clears the Google token, AI/admission session state, messaging state and startup
   cache whether sign-out succeeds or fails.

## Admin access model

Cross-user reads of `public.feedback` and `public.usage_events` are granted only to accounts whose
**immutable** Supabase `app_metadata.role` equals `"admin"`. `user_metadata` (user-editable) is
never trusted, and a username of `admin` grants nothing by itself. Provisioning happens outside the
app via the Supabase Admin API (`docs/archive/SUPABASE_SERVICES.md`); no admin credential may ever be
committed to the repository.

## `onAuthStateChange` wiring (`frontend/src/routes/__root.tsx`)

```
supabase.auth.onAuthStateChange((event) => {
  if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
  router.invalidate();
  if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
});
```

(`frontend/src/routes/__root.tsx:141-149`) — subscribed once at the root, unsubscribed on unmount.
`SIGNED_IN`/`USER_UPDATED` invalidate the TanStack Router match tree and all React Query caches;
`SIGNED_OUT` invalidates only routing (so a protected route redirects), leaving stale query caches
to be naturally superseded after re-authentication.

## The `ssr:false` `_authenticated` gate

`frontend/src/routes/_authenticated/route.tsx`:

```
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
```

- `ssr: false` forces this route subtree to resolve only in the browser, where the Supabase client
  has access to the persisted session (avoids a server-side false-negative redirect on first
  paint).
- `beforeLoad` calls `supabase.auth.getUser()`; any error or missing user redirects to `/`.
- Every screen under `_authenticated/` (home, school, planner, stats, help, feedback, profile,
  settings, chat, assistant) inherits this gate via nested routing.
