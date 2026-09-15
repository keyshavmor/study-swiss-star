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

- **CURRENT FRONTEND: no CAPTCHA dependency.** All four password flows (email sign-in, username
  sign-in v4, signup, password reset) call Supabase Auth / `username-login` with no challenge
  token. There is no CAPTCHA widget, no `captchaToken`, no `captcha_token`, no
  `captcha_required` / `captcha_failed` user flow, and no CAPTCHA environment configuration
  (`VITE_AUTH_CAPTCHA_PROVIDER` / `VITE_AUTH_CAPTCHA_SITE_KEY` are removed from both env
  contexts). `@hcaptcha/react-hcaptcha` is removed.
- **CURRENT SUPABASE — observed runtime (2026-09-15):** a fresh production `auth.signUp` made with
  NO challenge token **succeeded** — it created the user and sent the confirmation email, with no
  `captcha_failed`. Bot/Abuse Protection therefore did not block tokenless signup in the observed
  runtime and is not carried here as a blocking prerequisite. (Historically, while protection was
  on, Supabase rejected tokenless signup/sign-in/recovery with HTTP 400 `captcha_failed` — see the
  historical entries in `docs/DOCUMENTATION_DISCOVERED_ISSUES.md`.)
- **Email confirmation is required:** production `mailer_autoconfirm=false`, so a successful signup
  intentionally returns no session until the confirmation link is used. Full successful password and
  username login therefore remains pending a confirmed account in the smoke test; no live login
  PASS is claimed from signup alone.
- **Error handling:** a challenge-shaped provider error (`captcha_failed`) maps to the generic
  localized auth error — it is never shown as wrong credentials, and no raw provider payload is
  shown, logged or sent to telemetry.
- **Email sign-in:** `supabase.auth.signInWithPassword({ email, password })`.
- **Sign-up:** `auth.signUp({ email, password, options: { emailRedirectTo, data } })` sends the
  normalized username plus `account_type_prefill`, `date_of_birth_prefill`, and
  `guardian_email_prefill`; these are metadata hints only. The four legal checkboxes remain
  explicit and are never pre-accepted. A returned session enters `resolveStartupDestination()`
  immediately; no session shows the localized email-confirmation state.
- **Post-signup handoff (CURRENT FRONTEND):** when signup returns no session, the form switches to
  sign-in and prefills the **email address**, never the username, and shows a persistent localized
  `auth.confirmationPending` notice next to the identifier field (cleared when the identifier
  changes or a session is established) in addition to the check-email toast. Rationale: a username
  retry runs through `username-login` v4, which deliberately answers generic invalid credentials for
  an unconfirmed account; the email path instead yields the localized `email_not_confirmed` state,
  so a successful signup no longer looks broken. No Supabase security behavior changes.
- **Password reset/update:** `auth.resetPasswordForEmail(email, { redirectTo })` — email only, no
  challenge token, localized errors retained. The public `/auth/update-password` route requires a
  valid recovery/auth session, then returns through `resolveStartupDestination()`.


## Username login (`username-login` Edge Function)

When the identifier does **not** contain `@`, the app normalises it
(`normaliseUsername`, lower-cased/trimmed) and validates format locally
(`USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/`, `AuthForm.tsx:35-51`) before calling:

```
supabase.functions.invoke("username-login", { body: { username, password } })
```

- **Caller:** `frontend/src/components/AuthForm.tsx`.
- **v4 contract (no CAPTCHA):** every expected outcome is HTTP 200 with a payload —
  `{ ok: true, access_token, refresh_token, expires_in, token_type }`,
  `{ ok: false, error_code: "invalid_credentials" }` or
  `{ ok: false, error_code: "authentication_unavailable" }`. An ordinary wrong password is NOT an
  HTTP 401 runtime error. The request body carries ONLY `username` and `password`; the Edge
  Function performs its internal password grant without a challenge token. (Historically this
  required Bot/Abuse Protection to be disabled; the 2026-09-15 observed tokenless signup
  succeeded with no `captcha_failed` — see "Email/password" above.)
- **Unrecognised error codes** (including legacy `captcha_required` / `captcha_failed`) fall back
  to the generic invalid-credentials message; the frontend has no challenge flow.

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
- **Bot and Abuse Protection (CAPTCHA):** the frontend has no CAPTCHA dependency (no hCaptcha
  provider or sitekey configured). In the 2026-09-15 observed runtime, a tokenless production
  signup succeeded with no `captcha_failed`, so protection was not blocking signup; whether it is
  currently enabled or disabled in the dashboard is not independently verified from here.
  Historically, while it was enabled, tokenless password signup/sign-in/recovery returned HTTP 400
  `captcha_failed`.

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
