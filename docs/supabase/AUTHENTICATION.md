Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
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

- Sign-in: `supabase.auth.signInWithPassword({ email, password })` when the identifier contains
  `@` (`AuthForm.tsx:77-85`).
- Sign-up: `supabase.auth.signUp({ email, password, options: { emailRedirectTo: "<origin>/home",
  data: { username } } })` (`AuthForm.tsx:126-134`), after the username-availability pre-check
  below.
- Password reset/update: `auth.update-password.tsx` route (not detailed further here; standard
  Supabase recovery flow).

## Username login (`username-login` Edge Function)

When the identifier does **not** contain `@`, the app normalises it
(`normaliseUsername`, lower-cased/trimmed) and validates format locally
(`USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/`, `AuthForm.tsx:35-51`) before calling:

```
supabase.functions.invoke("username-login", { body: { username, password } })
```

- **Caller:** `frontend/src/components/AuthForm.tsx:94`.
- **On success:** the function returns `{ access_token, refresh_token }`; the frontend immediately
  calls `supabase.auth.setSession({ access_token, refresh_token })` (`AuthForm.tsx:103-107`) and
  navigates to `/home`.
- **On failure:** a generic invalid-credentials error is shown — no account enumeration, no email
  disclosed (`docs/SUPABASE_SERVICES.md`).
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
the Supabase project — `docs/SUPABASE_SERVICES.md` "External configuration still required".

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

1. Sends `auth_signout` telemetry (before the session ends, so it is still attributed to the user).
2. Calls `supabase.auth.signOut()`. On failure, tracks `auth_signout_failed` and rethrows.
3. In a `finally` block, calls `clearGoogleAccess()` to drop the `sessionStorage` Google token
   regardless of sign-out success.

## Admin access model

Cross-user reads of `public.feedback` and `public.usage_events` are granted only to accounts whose
**immutable** Supabase `app_metadata.role` equals `"admin"`. `user_metadata` (user-editable) is
never trusted, and a username of `admin` grants nothing by itself. Provisioning happens outside the
app via the Supabase Admin API (`docs/SUPABASE_SERVICES.md`); no admin credential may ever be
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
