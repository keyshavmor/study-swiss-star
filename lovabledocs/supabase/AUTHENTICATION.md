# Authentication

Status: CURRENT — VERIFIED 2026-09-15

The public auth surface is `/`; `/auth` is equivalent. Authenticated users route to `/home`. Signup requires normalized username, email, and password. Login accepts email or username through `username-login`; availability uses `username-availability`. Password reset/update and GitHub, LinkedIn OIDC, and Spotify buttons are present.

The TanStack chat route requires `Authorization: Bearer <Supabase access token>`, rejects missing/malformed/invalid tokens, verifies claims with `supabase.auth.getClaims(token)`, and queries the requested thread with the verified `sub`.

The server-only adapter forwards the same token and `X-Student-Id: <verified sub>`. FastAPI independently verifies the token against the configured Supabase project. `X-Student-Id` is never identity proof and a mismatch returns 403.

Logout calls `supabase.auth.signOut()`, clears the Google provider token from `sessionStorage`, and returns to `/`. No service-role or secret key is browser-visible.
