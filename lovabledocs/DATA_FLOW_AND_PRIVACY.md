# Data flow and privacy

```
Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466
```

Where each class of student data lives, which components may read it, and what is
forbidden from leaving the machine. Boundaries here are the ones the backend must
respect — see `docs/contracts/EVENT_AND_TELEMETRY_CONTRACT.md` and
`docs/supabase/STORAGE_LIFECYCLES.md` for the enforcing detail.

## 1. Data classes and their homes

| Data class | Location | Read by | Status |
| --- | --- | --- | --- |
| Auth identity (email, `auth.uid()`, provider) | Supabase `auth.users` | Supabase Auth, RLS predicates | CURRENT — SUPABASE |
| Username | `public.profiles.username` (normalised, unique) + `username-login` / `username-availability` Edge Functions | frontend auth form (existence only) | CURRENT — SUPABASE |
| Profile details (full/preferred name, photo, nationality, phone, contact details, DOB) | `public.profiles` (own row only) | `/profile`, `/settings`, header greeting | CURRENT — SUPABASE |
| Avatar image | private bucket `profile-avatars/<uid>/…`, ≤ 2 MiB | signed URL for the owner | CURRENT — SUPABASE |
| Preferences (`app_language`, `selected_qwen_model`, audio, reminders, cleanup, reply-language policy) | `public.user_preferences.preferences` (JSONB, keyed by `user_id`) | i18n provider, Settings, Assistant | CURRENT — SUPABASE |
| App language cache | `localStorage["alim.app_language"]` — flash-avoidance only, never authoritative | i18n provider at boot | CURRENT — FRONTEND |
| Grades, assessments, planner events, materials metadata, school links | `localStorage["asa.data.v2"]` (browser only) | `AppDataProvider` consumers | CURRENT — FRONTEND (issue §6) |
| Tutoring chat threads/messages | `public.threads`, `public.messages` | owner only, via RLS | CURRENT — SUPABASE |
| Assistant threads/messages/attachments | `public.assistant_threads` / `_messages` / `_attachments` | owner only | CURRENT — SUPABASE |
| Assistant attachments (≤ 1 MiB) | private bucket `chat-attachments/<uid>/…` | owner via signed URL; backend parser | CURRENT — SUPABASE + BACKEND TODO FOR CODEX |
| Study materials | private bucket `user-materials/<uid>/…` | owner; indexing pipeline | CURRENT — SUPABASE |
| Document text and embeddings | `public.documents`, `public.document_chunks` | retrieval pipeline (own rows) | BACKEND TODO FOR CODEX (loose schema, issue §3) |
| Assistant output media descriptors | private bucket `assistant-descriptors/<uid>/…` | retrieval after binary deletion | BACKEND TODO FOR CODEX |
| Media retention queue | `public.media_retention_queue` | cleanup worker | CURRENT — SUPABASE (no producer yet) |
| Feedback | `public.feedback` via `feedback-submit`; optional bucket `feedback-messages` | admins (`app_metadata.role = 'admin'`) | CURRENT — SUPABASE |
| Activity/error telemetry | `public.usage_events` via `activity-log` | admins | CURRENT — SUPABASE |
| Google Calendar events (read-only) | Google API responses held in memory; provider token in `sessionStorage` only | `/planner` merge view | CURRENT — EXTERNAL INTEGRATION |
| Prompts, model answers, model weights, retrieval context | local machine only (Python backend + local model) | local backend | EXPECTED BACKEND CONTRACT |
| Speech audio | ephemeral browser `speechSynthesis`, never stored | the listening user | CURRENT — FRONTEND |

## 2. Flow diagram

```mermaid
flowchart LR
  subgraph Browser["Browser (student device)"]
    UI["React UI"]
    LS["localStorage<br/>asa.data.v2 + alim.app_language"]
    SS["sessionStorage<br/>Google provider token"]
    TTS["speechSynthesis<br/>ephemeral audio"]
  end

  subgraph Supabase["Supabase project ucacmeadsufiedxrgqit"]
    Auth["Auth (auth.users)"]
    DB["Postgres, RLS own-row only"]
    Buckets["Private buckets<br/>&lt;uid&gt;/… path rule"]
    EF["Edge Functions<br/>username-login · username-availability<br/>activity-log · feedback-submit<br/>storage-emergency-cleanup"]
  end

  subgraph Local["Local machine (never public)"]
    Route["/api/chat server route<br/>verifies JWT + thread ownership"]
    Py["Python backend 127.0.0.1:8001"]
    Model["Local Qwen model + index"]
  end

  Google["Google Calendar API<br/>read-only scope"]

  UI --> LS
  UI --> SS
  UI --> TTS
  UI --> Auth
  UI --> DB
  UI --> Buckets
  UI --> EF
  UI --> Route
  Route --> DB
  Route --> Py
  Py --> Model
  Py -.->|"BACKEND TODO FOR CODEX"| DB
  Py -.->|"BACKEND TODO FOR CODEX"| Buckets
  SS --> Google

  Model -.->|"FORBIDDEN: no prompt, answer or document text leaves the machine"| Google
```

## 3. Privacy rules

1. **Per-user isolation is absolute.** Every table policy and every storage
   policy resolves to `auth.uid()`; the first storage path folder must equal the
   user id. The backend must operate as the user (JWT) rather than with a
   service-role key for ordinary reads.
2. **`X-Student-Id` is context, not authorization.** It must never be the only
   thing standing between a request and another student's data
   (`docs/DOCUMENTATION_DISCOVERED_ISSUES.md` §2).
3. **Telemetry carries no content.** No prompts, answers, document text, file
   names, email addresses, tokens, calendar titles, URLs or raw
   `Error.message` — only bounded event names, feature/subject labels,
   `error_name` and an explicit simple `status`/`code`.
4. **No study content leaves the device.** Prompts, retrieved chunks, model
   weights and answers stay on the local machine. Web retrieval is the only
   outbound path and is gated by `allow_web`; it may send a query, never
   document contents.
5. **Google Calendar is read-only.** Scope `calendar.readonly`; the provider
   token lives in `sessionStorage` and dies with the tab; occurrences are never
   written back and are non-editable in the UI.
6. **Media minimisation.** Assistant *output* media is deleted 30 minutes after
   creation, but only once a text descriptor exists; ordinary study uploads are
   out of scope and are never auto-deleted.
7. **Admin access is narrow.** Only `app_metadata.role = 'admin'` (immutable by
   the user) may read `feedback` and `usage_events`; there is no admin read path
   to chats, documents or storage objects.
8. **Feedback is user-authored content**, not telemetry, and is submitted through
   an Edge Function so the client never writes admin-readable tables directly.


## Added this pass — authenticated startup flow

Signed out → `/` → `/onboarding/language` (once, CURRENT SUPABASE flag
`language_onboarding_completed`) → `/onboarding/model` (every new browser session, CURRENT
FRONTEND sessionStorage gate `alim.ai_session.v1`) → `/home`. Guard: `_authenticated/route.tsx`.
Model preparation backend (`/api/model/prepare`, `/api/model/operation`) is EXPECTED LOCAL BACKEND
CONTRACT / BACKEND TODO FOR CODEX. Resource policy: 50/50/50 admission, 30/25/30 runtime floors —
CURRENT SUPABASE `get_ai_runtime_policy()`. Model catalog: CURRENT SUPABASE `ai_model_catalog`
(10 Qwen entries), hard-coded list is fallback only. The per-user `auto_storage_cleanup`
preference is REMOVED; storage cleanup is now the platform-wide 5-minute cron job described in
`docs/supabase/STORAGE_LIFECYCLES.md`. See `docs/sequences/POST_LOGIN_STARTUP.mmd`,
`LANGUAGE_ONBOARDING.mmd`, `MODEL_SELECTION_READINESS.mmd`, `MODEL_CACHED_SHARED_DOWNLOAD.mmd`,
`RESOURCE_BLOCKED_NON_AI.mmd`, `SETTINGS_MODEL_RETRY.mmd`, `MODEL_DOWNLOAD_DEDUPLICATION.mmd`,
`AI_SESSION_STATE_MACHINE.mmd`, `STORAGE_CAPACITY_CLEANUP.mmd`.
