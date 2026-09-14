Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# Feature Dependency Matrix

| Feature | Route | Components | Supabase tables | Storage | Edge Functions | Local backend | External service |
|---|---|---|---|---|---|---|---|
| Auth (email/password, username, OAuth) | `frontend/src/routes/index.tsx`, `auth.tsx`, `auth.update-password.tsx` | `AuthForm.tsx` | `profiles`, `user_preferences` (created on first sign-in) | `profile-avatars` (later, in Settings) | `username-login`, `username-availability` | none | GitHub, LinkedIn, Spotify OAuth |
| Subject tutoring chat | `_authenticated/chat.index.tsx`, `chat.$threadId.tsx` | `StudyChat.tsx`, `ThreadList.tsx` | `threads`, `messages` | none directly | none | local context backend via `POST /api/chat` | none |
| General Assistant chat | `_authenticated/assistant.index.tsx`, `assistant.$threadId.tsx` | `components/assistant/*` | `assistant_threads`, `assistant_messages`, `assistant_attachments` | `chat-attachments` | none (no backend reply contract exists — see BACKEND_GAP_MATRIX.md) | none today | none |
| School / subjects overview | `_authenticated/school.index.tsx`, `school.$subject.tsx` | `components/app/*` | subject/material data (mock or `documents`-backed per FACTS.md) | `user-materials` | none | none | none |
| Planner + Google Calendar overlay | `_authenticated/planner.tsx` | planner components under `components/app` | `user_preferences` (planner events, per app-data store) | none | none | none | Google Calendar API v3 (read-only) |
| Stats / grades | `_authenticated/stats.tsx` | grade display components | grades data (per `lib/grade-math.ts`, `mock/grades.ts`) | none | none | none | none |
| Feedback | `_authenticated/feedback.tsx` | inline form in the route | `feedback` | `feedback-messages` | `feedback-submit` | none | none |
| Profile | `_authenticated/profile.tsx` | profile components | `profiles` | `profile-avatars` | none | none | none |
| Settings (preferences, storage) | `_authenticated/settings.tsx` | settings components | `user_preferences`, `documents`, `assistant_attachments` (for storage cleanup) | `profile-avatars`, `user-materials`, `chat-attachments` | `storage-emergency-cleanup` | none | none |
| Help | `_authenticated/help.tsx` | static content | none | none | none | none | none |
| Telemetry / activity logging | app-wide (`__root.tsx` installs global handlers) | n/a (library, `lib/telemetry.ts`) | `usage_events` | `activity-logs` | `activity-log` | none | none |
| Media retention (assistant-generated media) | surfaces in Settings storage view | `lib/media-retention.ts` consumers | `media_retention_queue` | `assistant-descriptors`, plus the original media bucket | none (cleanup worker is BACKEND TODO FOR CODEX) | expected but unimplemented (descriptor generation) | none |
