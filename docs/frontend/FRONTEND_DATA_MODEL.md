Document status: CURRENT
Generated from: current Lovable-managed project state · live Supabase project ucacmeadsufiedxrgqit (these Lovable-only edits are NOT claimed to be on any GitHub branch)
Production Supabase verified: 2026-09-15 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# Frontend data model — types the backend must mirror

This document lists every TypeScript type on the frontend that either (a) is
part of the wire contract with a backend (local Python context backend or
Supabase), or (b) is browser-only prototype/UI state that a backend must
**not** expect to receive. Each section names the real source file and quotes
the type as it exists in the repository.

Legend used throughout:
- **WIRE CONTRACT** — crosses a network boundary (Supabase table/RPC, or the
  local `/api/chat` → context backend hop). A backend implementer must
  produce/consume exactly this shape.
- **BROWSER-ONLY** — lives only in frontend memory/localStorage; never sent to
  or expected from any backend today.

## 1. `frontend/src/lib/store/types.ts` — BROWSER-ONLY prototype data model

Source comment in the file is explicit: *"Prototype data model. Everything
here lives in editable frontend state — these records do not use the Python
context backend, and every record can be created, edited and removed by the
user."* This is CURRENT — FRONTEND, and none of it is a wire contract.

```ts
export interface Assessment {
  id: string;
  subjectSlug: string;
  title: string;
  type: AssessmentType;
  topic: string;
  /** ISO date, yyyy-mm-dd. */
  date: string;
  yearId: string;
  points: number | null;
  maxPoints: number | null;
  teacherGrade: number | null;
  weight: number;
  notes: string;
  source: GradeSource;
  includeInStats: boolean;
  importedFrom?: string;
}

export interface PlannerEvent {
  id: string;
  title: string;
  category: EventCategory;
  date: string;         // ISO anchor date
  start: string;
  end: string;
  subjectSlug?: string;
  location?: string;
  travelMinutes?: number;
  travelBefore?: number;
  travelAfter?: number;
  recurrence: Recurrence;
  weekdays?: number[];  // 0 = Monday … 6 = Sunday
  until?: string;
  exceptions?: string[];
  overrides?: Record<string, { date?: string; start?: string; end?: string; title?: string }>;
  color?: string;
  reminder?: string;
  notes?: string;
  done?: boolean;
  generated?: boolean;
  externalSource?: "google";
  readOnly?: boolean;
}

export interface Material {
  id: string;
  subjectSlug: string;
  name: string;
  type: MaterialType;
  section: MaterialSection;
  url?: string;
  notes?: string;
  status: "Indexed" | "Processing" | "Needs review";
  added: string;
  archived?: boolean;
}

export interface SchoolLink {
  id: string;
  name: string;
  url: string;
  category: LinkCategory;
  description?: string;
  icon?: string;
  subjectSlug?: string;
  accent: string;
  order: number;
  added: string;
  opens: number;
}

/** Values the student has not entered stay empty — never invented. */
export interface StudentProfile {
  photo: string;
  fullName: string;
  preferredName: string;
  dateOfBirth: string;
  schoolName: string;
  schoolType: string;
  className: string;
  classTeacher: string;
  focusSubject: string;
  schoolEmail: string;
  studentNumber: string;
  username: string;
  language: string;
}

export interface DataState {
  assessments: Assessment[];
  events: PlannerEvent[];
  materials: Material[];
  links: SchoolLink[];
  profile: StudentProfile;
  readNotifications: string[];
  dismissedNotifications: string[];
}
```

`GradeSource`, `AssessmentType`, `EventCategory`, `Recurrence`,
`MaterialSection`/`MaterialType`, `LinkCategory` are all closed string-literal
unions with matching `*_LABEL_KEY: Record<X, TranslationKey>` maps for i18n —
a backend must never localize these values itself; it only ever sees/returns
the literal English union member (e.g. `"School exam"`), and the frontend maps
it to a translation key.

**Note:** `StudentProfile`/`EMPTY_PROFILE`/`DataState` are the legacy
prototype student-profile shape (a different, older concept from the current
Supabase `profiles`/`AccountProfile` described in §3). Do not conflate them:
`StudentProfile.language` is a free-text field, unrelated to
`UserPreferences.app_language`.

## 2. `frontend/src/lib/context-backend.types.ts` — WIRE CONTRACT

This is the exact shape returned by the local Python context backend's
`POST /api/chat` (see `frontend/src/lib/context-backend.server.ts`,
`requestContextAnswer`) and is EXPECTED BACKEND CONTRACT / BACKEND
IMPLEMENTATION UNKNOWN beyond what the frontend defines here.

```ts
export interface ContextSourceSnippet {
  source_id: string;
  material_id: string | null;
  material_name: string | null;
  section: string | null;
  page: number | null;
  chapter?: string | null;
  snippet: string;
  score: number;
  url: string | null;
}

export interface ContextChatResponse {
  thread_id: string;
  message_id: string;
  answer: string;
  sources: ContextSourceSnippet[];
  exam_tip: string | null;
  used_model: string;
  retrieval_summary: {
    chunks_considered: number;
    chunks_used: number;
    collections: string[];
  };
  language: string | null;
  created_at: string;
}

/** Reshaped for the AI-SDK `data-context-metadata` stream part sent to the browser. */
export interface ContextResponseMetadata {
  sources: ContextSourceSnippet[];
  examTip: string | null;
  usedModel: string;
  retrievalSummary: ContextChatResponse["retrieval_summary"];
}
```

The request body sent to the backend (built in `context-backend.server.ts`,
documented in `FACTS.md` and `FRONTEND_ARCHITECTURE.md`) is:

```ts
{
  thread_id: string;
  user_message_id: string;
  question: string;
  subject_id: string;
  language: "de" | "en" | "fr"; // derived from subject, NOT the 7 app languages
  academic_year: string;
  grade_level: string;
  include_sources: true;
  allow_web: true;
  stream: false;
}
```

The backend's error envelope is `{ error: { code, message } }` with codes
`context_backend_error`, `invalid_response`, `context_backend_unavailable`
consumed frontend-side. **BACKEND IMPLEMENTATION UNKNOWN**: whether the
backend enforces `language`/`assistant_reply_language_policy` end-to-end is
not verified — see `docs/frontend/I18N_AND_LANGUAGE.md`.

## 3. `frontend/src/lib/account-data.ts` — WIRE CONTRACT (Supabase-backed)

```ts
export interface AccountProfile {
  id: string;
  username: string;
  fullName: string;
  preferredName: string;
  photoPath: string;
  nationality: string;
  contactPhone: string;
  contactDetails: Record<string, string>;
}

/** The 10 selectable local Qwen models, largest first. */
export const QWEN_MODELS = [
  "Qwen/Qwen3.8-27B",
  "Qwen/Qwen3.5-27B",
  "Qwen/Qwen3-14B",
  "Qwen/Qwen3.5-9B",
  "Qwen/Qwen3-8B",
  "Qwen/Qwen3.5-4B",
  "Qwen/Qwen3-4B",
  "Qwen/Qwen3.5-2B",
  "Qwen/Qwen3-1.7B",
  "Qwen/Qwen3-0.6B",
] as const;
export type QwenModel = (typeof QWEN_MODELS)[number];

/** Supabase-stored assistant reply-language policy. */
export type ReplyLanguagePolicy = "message_then_app" | "app_only";

export interface UserPreferences {
  selected_qwen_model: string;
  app_language: LanguageCode;              // one of the 7 codes, see I18N_AND_LANGUAGE.md
  assistant_reply_language_policy: ReplyLanguagePolicy;
  assistant_audio_enabled: boolean;
  assistant_audio_autoplay: boolean;
  exam_reminders: boolean;
  daily_study_summary: boolean;
  sound_effects: boolean;
  language_onboarding_completed: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  selected_qwen_model: QWEN_MODELS[0],
  app_language: DEFAULT_LANGUAGE, // "en"
  assistant_reply_language_policy: "message_then_app",
  assistant_audio_enabled: true,
  assistant_audio_autoplay: false,
  exam_reminders: true,
  daily_study_summary: true,
  sound_effects: false,
  language_onboarding_completed: false,
};

export const AVATAR_BUCKET = "profile-avatars";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MiB
```

`AccountProfile` is read from/written to `public.profiles` (see §8 row type);
`UserPreferences` is stored as the single jsonb blob
`public.user_preferences.preferences` — the backend must treat the whole
object as opaque JSON keyed by these exact field names, not as individual
columns. `fetchPreferences()` defensively defaults every missing/invalid key
to `DEFAULT_PREFERENCES[key]`, so a backend reading this jsonb column must
tolerate partial or legacy documents (e.g. rows written before a preference
key existed).

## 4. `frontend/src/lib/assistant-data.ts` — WIRE CONTRACT (Supabase-backed)

```ts
export interface AssistantThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantAttachment {
  id: string;
  messageId: string | null;
  fileName: string;
  mimeType: string;
  byteSize: number;
  kind: string;
  objectPath: string;
  parseStatus: string;
}

export interface AssistantMessage {
  id: string;
  threadId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  attachments: AssistantAttachment[];
}
```

These are camelCase view-models the frontend maps to/from the snake_case
`assistant_threads` / `assistant_messages` / `assistant_attachments` Supabase
rows (§8). This table family is deliberately **separate** from tutoring
`threads`/`messages`. Per `FACTS.md`: assistant *assistant-role* rows are
never fabricated by the frontend — only a real backend writes them; the
frontend only ever inserts `role: "user"` rows via `sendAssistantMessage`.

`validateAttachment(file: File): string | null` mirrors a database metadata
constraint client-side: images/audio/video ≤ `MEDIA_MAX_BYTES` (1 MiB, from
`lib/storage-management.ts`), PDF/DOCX/DOC otherwise, or rejected.

## 5. `frontend/src/lib/media-retention.ts` — WIRE CONTRACT (Supabase-backed)

```ts
export type MediaKind = "image" | "audio" | "video";
export type RetentionStatus = "pending" | "descriptor_ready" | "deleted" | "failed";

export interface RetentionEnqueueInput {
  userId: string;
  attachmentId?: string | null;
  mediaKind: MediaKind;
  storageBucket: string;
  objectPath: string;
  descriptorBucket?: string;
  descriptorPath?: string | null;
  sourceUrl?: string | null;
  sourcePath?: string | null;
}

export interface RetentionRow {
  id: string;
  media_kind: string;
  object_path: string;
  descriptor_path: string | null;
  source_url: string | null;
  source_path: string | null;
  status: string;
  created_at: string;
  delete_after: string;
  deleted_at: string | null;
  error_code: string | null;
}
```

This module only **enqueues** a `media_retention_queue` row when a caller
already has a descriptor object path — it never generates descriptors
client-side. Per the file's own header comment: descriptor generation,
descriptor upload, and the 30-minute cleanup worker are **FUTURE BACKEND /
CODEX** responsibilities, NOT implemented in the frontend. `RetentionStatus`
is the closed set of values a backend is expected to write into
`media_retention_queue.status`.

## 6. `frontend/src/lib/storage-management.ts` — mixed

```ts
export type StorageItemSource = "Assistant attachment" | "Study material";
export type StorageItemKind = "image" | "audio" | "video" | "document" | "other";

export interface StorageItem {
  id: string;             // "attachment:<uuid>" or "document:<uuid>"
  source: StorageItemSource;
  name: string;
  kind: StorageItemKind;
  mimeType: string;
  bucket: string;
  objectPath: string;
  byteSize: number;
  createdAt: string;
}

export const CHAT_ATTACHMENT_BUCKET = "chat-attachments";
export const MEDIA_MAX_BYTES = 1024 * 1024; // 1 MiB
```

`StorageItem` itself is BROWSER-ONLY (a merged view assembled client-side from
two different tables — `assistant_attachments` rows and defensively-read
`documents` rows — its prefixed `id` is a frontend convention, not a database
value). The underlying rows it reads/writes (`assistant_attachments`,
`documents`) are WIRE CONTRACT (§8). `StorageUsageStatus` (from
`integrations/supabase/types.ts`, returned by RPC `get_storage_usage_status`)
is WIRE CONTRACT:

```ts
export type StorageUsageStatus = {
  quota_bytes: number;
  used_bytes: number;
  remaining_bytes: number;
  used_percent: number;
  remaining_percent: number;
  warning_threshold_reached: boolean;
  emergency_cleanup_needed: boolean;
};
```

`kindFromMime()` and `formatBytes()` are pure BROWSER-ONLY helpers.

## 7. `frontend/src/lib/mock/subjects.ts` — BROWSER-ONLY, `Subject` shape

Explicit file header: *"Prototype mock data. No backend, no persistence — UI
only."* This is CURRENT — FRONTEND with no wire contract implication
whatsoever; a backend must never be asked to produce this shape.

```ts
export type SubjectLanguage = "German" | "English" | "French";
export type Trend = "Improving" | "Stable" | "Needs focus";
export type MaterialStatus = "Complete" | "Partial" | "Missing";

export interface Subject {
  slug: string;
  name: string;
  icon: string;
  language: SubjectLanguage;
  languageBadge?: string;
  average: number | null;
  latestGrade: number | null;
  nextExam: string | null;
  nextExamInDays: number | null;
  trend: Trend;
  materials: number;
  materialStatus: MaterialStatus;
  accent: string;
  /** Set on combined school subjects (e.g. SPF) that group other subject slugs. */
  components?: string[];
  subtitle?: string;
}
```

`SUBJECTS`, `SPF_COMBINED`, and the derived `SCHOOL_SUBJECTS` are static
fixture arrays hard-coded in this file (15 subjects plus one combined SPF
card) — not fetched from anywhere.

## 8. `frontend/src/integrations/supabase/types.ts` — WIRE CONTRACT (hand-maintained)

File header: *"Hand-maintained to match the live schema."* Every `Row` type
below is the authoritative shape a backend reading/writing these tables under
RLS must produce or accept, keyed by `Database["public"]["Tables"][name]`.

```ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

feedback.Row: {
  id: string; user_id: string; category: string; message: string;
  context: Json; created_at: string;
}

usage_events.Row: {                       // NOTE: no created_at — occurred_at instead
  id: string; user_id: string | null; event_name: string;
  feature: string | null; subject: string | null; properties: Json; occurred_at: string;
}

profiles.Row: {
  user_id: string; username: string; full_name: string; preferred_name: string;
  photo: string; nationality: string; contact_phone: string; contact_details: Json;
  date_of_birth: string | null; created_at: string; updated_at: string;
  [key: string]: Json | undefined;         // index signature: loose/defensive
}

user_preferences.Row: {                    // no `id` column — user_id is the key
  user_id: string; academic_year: string | null; preferences: Json;
  created_at: string; updated_at: string;
}

media_retention_queue.Row: {
  id: string; user_id: string; attachment_id: string | null; media_kind: string;
  storage_bucket: string; object_path: string; descriptor_bucket: string;
  descriptor_path: string | null; source_url: string | null; source_path: string | null;
  status: string; created_at: string; delete_after: string; deleted_at: string | null;
  error_code: string | null;
}

documents.Row: {                           // column names vary per deployment
  id: string; user_id: string; created_at: string | null;
  [key: string]: Json | undefined;
}
document_chunks.Row: {
  id: string; document_id: string; user_id: string | null;
  [key: string]: Json | undefined;
}

assistant_threads.Row: {
  id: string; user_id: string; title: string; created_at: string; updated_at: string;
}
assistant_messages.Row: {
  id: string; thread_id: string; user_id: string; role: string; content: string;
  parts: Json | null; metadata: Json | null; created_at: string;
}
assistant_attachments.Row: {
  id: string; user_id: string; thread_id: string | null; message_id: string | null;
  storage_bucket: string; object_path: string; file_name: string; mime_type: string | null;
  byte_size: number | null; kind: string | null; parse_status: string | null;
  metadata: Json | null; created_at: string; deleted_at: string | null;
}

messages.Row: {                            // tutoring chat
  content: string; created_at: string; id: string; parts: Json | null;
  role: string; thread_id: string; user_id: string;
}
threads.Row: {                             // tutoring chat
  created_at: string; id: string; subject: string | null; title: string;
  updated_at: string; user_id: string;
}
```

RPC `get_storage_usage_status(): StorageUsageStatus[]` (see §6) is the only
function type declared here.

`Tables<T>`, `TablesInsert<T>`, `TablesUpdate<T>` are generic helper types
derived from `Database` — used throughout `lib/*` instead of importing raw
row shapes, e.g. `TablesUpdate<"profiles">` in `account-data.ts`.

**Production vs preview schema drift (per FACTS.md):** `public.profiles` is
keyed by `user_id` in production (as declared above and used throughout
`account-data.ts`), but by `id` in the sandbox/preview Supabase project — a
different project with a different schema. Treat the `user_id`-keyed shape
above as the production contract; do not use preview-project evidence to
override it.

## Wire contract vs browser-only — summary table

| Source file | Primary exports | Status |
|---|---|---|
| `lib/store/types.ts` | `Assessment`, `PlannerEvent`, `Material`, `SchoolLink`, `StudentProfile`, `DataState` | BROWSER-ONLY |
| `lib/context-backend.types.ts` | `ContextChatResponse`, `ContextSourceSnippet`, `ContextResponseMetadata` | WIRE CONTRACT — EXPECTED BACKEND CONTRACT |
| `lib/account-data.ts` | `AccountProfile`, `UserPreferences`, `DEFAULT_PREFERENCES`, `QWEN_MODELS`, `ReplyLanguagePolicy` | WIRE CONTRACT — CURRENT — SUPABASE |
| `lib/assistant-data.ts` | `AssistantThread`, `AssistantMessage`, `AssistantAttachment` | WIRE CONTRACT — CURRENT — SUPABASE |
| `lib/media-retention.ts` | `RetentionEnqueueInput`, `RetentionRow`, `MediaKind`, `RetentionStatus` | WIRE CONTRACT — CURRENT — SUPABASE (worker BACKEND TODO FOR CODEX) |
| `lib/storage-management.ts` | `StorageItem` (browser-only view), `StorageUsageStatus` (RPC, wire) | MIXED |
| `lib/mock/subjects.ts` | `Subject`, `SUBJECTS`, `SCHOOL_SUBJECTS` | BROWSER-ONLY |
| `integrations/supabase/types.ts` | all table `Row`/`Insert`/`Update` types | WIRE CONTRACT — CURRENT — SUPABASE (hand-maintained) |

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
