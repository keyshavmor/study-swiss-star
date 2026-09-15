# Open backend questions

```
Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466
```

Unresolved contract decisions between the current frontend/Supabase implementation
and the local Python backend. Each item states the question, what the frontend does
today, and a **recommended default** Codex may adopt if no other decision is made.
Nothing here is implemented — treat every item as `BACKEND TODO FOR CODEX` unless
stated otherwise.

---

## 1. How does the local backend authenticate the caller?

- **Today:** `frontend/src/routes/api/chat.ts` verifies the Supabase JWT
  (`supabase.auth.getClaims`) and thread ownership, then
  `frontend/src/lib/context-backend.server.ts` sends only
  `X-Student-Id: <auth.uid()>` to `POST http://127.0.0.1:8001/api/chat`.
- **Question:** does the backend trust that header, or verify a JWT itself?
- **Recommended default:** bind FastAPI to loopback only and treat `X-Student-Id`
  as *context*, never as authorization; additionally accept and verify a
  forwarded `Authorization: Bearer` token when present, so the backend can be
  hardened later without a frontend change. `X-Student-Id` must never be
  accepted from a browser-reachable surface.

## 2. Streaming protocol shape

- **Today:** the backend is called with `stream: false` and the whole answer is
  re-emitted as a single AI-SDK `text-delta` plus one `context-metadata` data part.
- **Question:** SSE, chunked JSON lines, or keep buffered?
- **Recommended default:** add SSE with `text` deltas followed by a final
  `metadata` event, keeping `stream: false` working unchanged so the frontend can
  migrate independently.

## 3. Cancellation semantics

- **Today:** `AbortController` with `ALIM_CONTEXT_BACKEND_TIMEOUT_MS` (default
  90 000 ms). A user-initiated stop is not propagated past the server route.
- **Recommended default:** treat client disconnect as cancel, stop model
  generation, and persist nothing for the cancelled turn (the assistant row is
  only inserted by the frontend server route on stream finish).

## 4. Where does response-language metadata travel?

- **Today:** `frontend/src/lib/i18n/detect.ts` computes a per-message
  `responseLanguageHint`, but it stays in the browser; the request body carries
  only a subject-derived `language` (`"de" | "en" | "fr"`).
- **Supabase:** `user_preferences.preferences.assistant_reply_language_policy`
  defaults to `message_then_app`.
- **Recommended default:** accept additive optional body fields
  `ui_language`, `message_language`, `response_language` (BCP-47-ish short codes
  from the seven supported values) and honour
  `message_language` when it is confidently one of the seven, else `ui_language`.
  Echo the language actually used in the existing `language` response field. The
  subject-derived `language` field must remain accepted for backwards
  compatibility.

## 5. Audio generation and delivery

- **Today:** audio is browser-only (`frontend/src/lib/speech.ts`), never persisted;
  `assistant_audio_enabled` / `assistant_audio_autoplay` are stored preferences.
- **Question:** should the backend synthesise audio at all?
- **Recommended default:** keep browser TTS as the default path. If backend audio
  is added, it is assistant *output media* and therefore falls under the
  descriptor + 30-minute retention rule (§7).

## 6. Descriptor format and language

- **Today:** `frontend/src/lib/media-retention.ts` never generates descriptors and
  expects the backend to have uploaded one to the private
  `assistant-descriptors` bucket before enqueueing/cleanup.
- **Recommended default:** UTF-8 plain text or small JSON
  (`{ kind, summary, alt_text, transcript?, language, created_at }`), written in
  the response language of the turn, stored at `<uid>/<queue-id>.json`.

## 7. Retention worker ownership and scheduling

- **Question:** who deletes the original binaries — a backend job, `pg_cron`
  calling a server route, or an Edge Function?
- **Recommended default:** one owner only, running every few minutes, deleting
  rows whose `delete_after <= now()` **and** whose `descriptor_path` is non-null,
  then setting `deleted_at`. Rows without a descriptor must be skipped and
  reported via `error_code` — **no descriptor ⇒ never delete the binary.**

## 8. Assistant attachment parsing pipeline

- **Today:** `frontend/src/lib/assistant-data.ts` uploads to `chat-attachments`
  (≤ 1 MiB) and inserts `assistant_attachments` rows with
  `parse_status = "unparsed"`. Nothing parses them.
- **Recommended default:** backend watches for `unparsed` rows for the signed-in
  user, extracts text (PDF/DOCX/plain), moves `parse_status` through
  `parsing` → `parsed` | `failed` (recording a bounded `error_code`), and stores
  extracted text where retrieval can reach it. The frontend must be able to show
  a recoverable state when parsing fails.

## 9. Study-tools endpoints and persistence

- **Today:** quiz, mock exam, grading and study-plan surfaces exist in the UI with
  no backend endpoints; grades/assessments/planner events live only in
  `localStorage` (`asa.data.v2`) — see
  `docs/DOCUMENTATION_DISCOVERED_ISSUES.md` §6.
- **Recommended default:** define `POST /api/quiz`, `/api/exam`, `/api/grade`,
  `/api/study-plan` mirroring the `/api/chat` envelope (same auth, same
  `{ error: { code, message } }` shape), and agree with the product owner whether
  grades/planner data moves to Postgres before these ship. Do not assume the
  backend can read grades today.

## 10. Memory scope and erasure

- **Today:** student memory is a backend concept only; the frontend exposes no
  memory controls.
- **Recommended default:** memory is scoped to `auth.uid()` and never crosses
  users; provide an erase-by-user operation so account deletion can be honoured.

## 11. Web-retrieval policy and provenance

- **Today:** the request body sends `allow_web: true` unconditionally and the UI
  renders `sources[].url` via
  `frontend/src/components/app/SourceSnippetList.tsx`.
- **Recommended default:** honour `allow_web`, always return a resolvable `url`
  for web-sourced snippets, and never return a snippet the UI cannot attribute.

## 12. Local model selection plumbing

- **Today:** `selected_qwen_model` is stored in
  `user_preferences.preferences` (10 choices, `Qwen/Qwen3.8-27B` default) and is
  **not** sent to the backend; the response reports `used_model`.
- **Recommended default:** the backend reads the preference itself (server-side,
  as the user) or accepts an optional `model` body field; `used_model` must always
  report the model actually used, even when it differs from the request.

## 13. Which Supabase project and schema does the backend write to?

- **Today:** production is `ucacmeadsufiedxrgqit`; the sandbox project used for
  preview has a different schema (see
  `docs/DOCUMENTATION_DISCOVERED_ISSUES.md` §1), and `documents` /
  `document_chunks` column names vary per deployment (§3).
- **Recommended default:** the backend targets production only, freezes one
  `documents` / `document_chunks` schema, and never uses a service-role key for
  ordinary per-user reads — prefer the user's JWT so RLS stays active.

## 14. Telemetry and error integration

- **Today:** telemetry is browser-only via the `activity-log` Edge Function, with
  strict sanitisation (`frontend/src/lib/telemetry.ts`).
- **Recommended default:** if the backend emits telemetry, it must obey the same
  contract (`docs/contracts/EVENT_AND_TELEMETRY_CONTRACT.md`): no prompts,
  responses, document contents, tokens or calendar content — bounded error
  classification only.


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

## Compliance, system admission, safety & peer messaging (this pass)

**Startup order (CURRENT FRONTEND / CURRENT SUPABASE):** signed out → sign in/up →
`/onboarding/compliance` (gated on CURRENT SUPABASE flag
`account_compliance.compliance_onboarding_completed`, RPC
`complete_account_compliance_onboarding`) → `/onboarding/language` → SYSTEM ADMISSION gate
(`/onboarding/system-admission`, every new browser session, sessionStorage lease
`alim.admission_session.v1`, FAILS CLOSED — EXPECTED LOCAL BACKEND CONTRACT) → model readiness gate
(`alim.ai_session.v1`) → `/home`. `account_compliance.account_status = 'suspended_pending_review'`
outranks every other route and redirects to `/account/suspended`. New legal routes:
`/legal/terms`, `/legal/privacy`, `/legal/acceptable-use`, `/legal/child-safety`. See
`sequences/SIGNUP_ROLE_GUARDIAN_CONSENT.mmd`,
`sequences/STARTUP_COMPLIANCE_LANGUAGE_ADMISSION_MODEL_HOME.mmd`.

**System admission (EXPECTED LOCAL BACKEND CONTRACT, policy is CURRENT SUPABASE via
`get_system_admission_policy()`):** max 10 admitted users; login requires ≥50% free GPU/RAM/local
disk; automatic model rebalancing preserves in-flight requests and queues new allocations; health
informs model recommendation. Effective utilisation ceiling reconciles the earlier free-floor
policy (GPU≥30% free, RAM≥25% free, storage≥30% free) with the new 75%-used ceiling as an
ADDITIONAL cap: effective max used = GPU 70%, RAM 75%, storage 70%. See
`sequences/ADMISSION_MAX10_LOGIN50_RULE.mmd`, `sequences/EFFECTIVE_CAPS_75_VS_30_25_30_FLOORS.mmd`,
`sequences/MODEL_LOAD_BALANCING_LIGHTER_ASSIGNMENT.mmd`,
`sequences/INFLIGHT_PRESERVE_NEWCOMER_QUEUE_SAFE_REBALANCE.mmd`,
`sequences/SYSTEM_HEALTH_AGGREGATION.mmd`. New route: `/system-health`.

**Content safety (EXPECTED LOCAL BACKEND CONTRACT; queue/strike tables are CURRENT SUPABASE):**
verdicts `allow | block_warning | block_suspend_pending_review | safety_unavailable | scanning`.
First CONFIRMED violation blocks content and records a warning; second CONFIRMED violation sets
`suspended_pending_review` and, for students, queues a `guardian_notification_queue` item for
HUMAN review only — no automatic permanent deletion, no guardian disclosure from an unreviewed AI
classification. `apply_confirmed_safety_strike(...)` is service-role only, never callable from the
browser. Age-appropriate curriculum discussion of history/war/medicine/sexual health is explicitly
allowed; explicit/graphic/instructional/glorifying content unsuitable for minors is blocked. See
`sequences/FIRST_SAFETY_STRIKE.mmd`, `sequences/SECOND_STRIKE_SUSPENSION_GUARDIAN_REVIEW.mmd`.

**Peer messaging (CURRENT SUPABASE reads; sends are EXPECTED LOCAL BACKEND CONTRACT):** exact
username discovery only (`find_peer_by_exact_username`, no directory);
`get_or_create_direct_peer_conversation`, `mark_peer_conversation_read`; tables
`peer_conversations`, `peer_conversation_members`, `peer_messages`, `peer_message_attachments`,
`peer_message_notifications`, all RLS-scoped by membership. Direct client writes to messages and
attachments are intentionally disabled — only the local backend, after an `allow` verdict, may
persist them via `sendPeerMessage`. Attachments: private bucket `peer-message-attachments`, hard
250000-byte limit, PDF/DOC/DOCX/JPEG/PNG/WEBP allow-list, client-side compression ladder before
upload, no authenticated direct upload. New preferences: `peer_message_notifications` (default
true), `browser_message_notifications` (default false). New routes: `/messages`,
`/messages/$conversationId`. See `sequences/PEER_CHAT_CREATION_BY_USERNAME.mmd`,
`sequences/PEER_MESSAGE_MODERATION_SEND_NOTIFY.mmd`,
`sequences/ATTACHMENT_COMPRESS_SCAN_STORE.mmd`,
`sequences/OFFLINE_MESSAGE_NEXT_LOGIN_UNREAD.mmd`,
`sequences/MESSAGING_STORAGE_RLS_BOUNDARIES.mmd`.

**Endpoints (EXPECTED LOCAL BACKEND CONTRACT, centralised in
`frontend/src/lib/local-backend-endpoints.ts`):** `/api/model/*`,
`/api/system/admission/check`, `/api/system/health`, `/api/system/session/heartbeat`,
`/api/system/runtime/release`, `/api/system/model/recommendation`, `/api/safety/moderate`,
`/api/peer-messaging/send`, `/api/safety/attachment-scan`. The browser never talks to the local
backend directly: a TanStack server function forwards the caller's already-verified Supabase
bearer JWT server-to-server; `X-Student-Id` is context/cross-check only, never an authorization
boundary; no service-role key is used anywhere in this path.

**Sign-out (CURRENT FRONTEND; sweeper is BACKEND TODO FOR CODEX):** best-effort runtime release
call while the token is still valid, then Supabase `signOut()`, then clearing the AI session,
admission lease, Google token, transient messaging state and object URLs. A heartbeat/lease-TTL
sweeper that reclaims an abandoned session's model process/VRAM, session CPU/context RAM and
temporary local artifacts when the browser closes mid-flight is **not implemented** anywhere in
this repository. See `sequences/RELEASE_MY_MODEL.mmd`,
`sequences/SIGNOUT_RUNTIME_RELEASE_LEASE_TTL_FALLBACK.mmd`.

**Data rights (CURRENT SUPABASE):** `get_user_visible_supabase_health()` (unsupported quotas
reported as `not_exposed_by_sql`, never invented), `get_my_data_summary()`, and the JWT-protected
Edge Function `delete-my-data` (`range | all_content | delete_account`, Storage objects deleted
before DB rows, caller-only, no target-user-id parameter accepted). See
`sequences/DELETE_MY_DATA_RANGE.mmd`, `sequences/DELETE_MY_DATA_ALL_CONTENT_KEEP_ACCOUNT.mmd`,
`sequences/DELETE_ACCOUNT.mmd`, `sequences/GDPR_PRIVACY_DATA_MAP_RIGHTS_WORKFLOW.mmd`.

**LEGAL REVIEW REQUIRED BEFORE PRODUCTION:** see `legal/LEGAL_REVIEW_REQUIRED.md`. This pass makes
no claim of GDPR or any other regulatory certification; lawful basis, DPAs, records of processing,
breach procedures, jurisdictional guardian-consent rules and cookie/ePrivacy analysis are
organisational decisions outside what frontend code can establish.
