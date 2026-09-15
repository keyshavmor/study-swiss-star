# Data Flow and Privacy

Status: CURRENT — VERIFIED 2026-09-15

## Subject chat

The browser sends the active Supabase bearer token to TanStack `/api/chat`. TanStack verifies it, derives the user ID, confirms thread ownership, and stores the user message. The server-only adapter forwards the same token and matching user context to FastAPI. FastAPI verifies it again, loads only caller-owned context through RLS, runs local Qwen, and returns an answer/source envelope. TanStack persists the successful assistant reply. Tokens are never logged or returned.

## Data ownership

- `asa.data.v2`: current browser-owned grades/planner/material metadata/school links.
- Supabase: identity, profile/preferences, chat transcripts, Assistant persistence, feedback/telemetry, context backend records, private objects.
- Local backend: transient compiled prompt/context and model execution; temporary downloaded material files are deleted after indexing.
- Google: Calendar source; provider token is sessionStorage-only and events are read-only display data.

## Sensitive-data rules

No password, access/refresh/provider token, authorization/cookie value, arbitrary secret, private document content, chat content, or Calendar event content enters telemetry. Browser clients never receive service-role/secret keys. RLS and composite ownership FKs constrain user records; Storage paths begin with the verified user ID.

## Retention

Assistant-generated media can be deleted only after its durable private descriptor exists and the 30-minute threshold passes. Cleanup runs every minute, defers failures, and retains descriptors. The current backend produces no media.
