# API Expectations — Python FastAPI Backend

Base URL (local): `http://localhost:8001`
Content type: `application/json; charset=utf-8` unless stated. All timestamps are ISO-8601 UTC.
All IDs are strings. Field naming is `snake_case` on the wire; the frontend client maps to
camelCase only where existing components require it.

## Implementation status

Implemented now: `GET /health`, `GET /api/model/status`, `POST /api/chat` (non-streaming),
`POST /api/context/compile`, `POST /api/context/documents/text`,
`POST /api/context/events`, and `POST /api/context/artifacts`.

The subject, learning-goal, material-list, multipart import, quiz, mock-exam, study-plan, grading,
and feedback endpoints below remain target contracts. They are documented so later UI work does not
invent incompatible shapes; they should not be read as currently available routes.

## Conventions

### Standard error envelope
Every non-2xx response uses this shape (`APIError`):

```json
{
  "error": {
    "code": "subject_not_found",
    "message": "Unknown subject_id 'spf_bio'.",
    "detail": "Known IDs: mathematics, physics, ...",
    "retryable": false,
    "request_id": "req_01HZY..."
  }
}
```

| HTTP | `code` examples | Frontend behaviour |
| --- | --- | --- |
| 400 | `invalid_request` | Inline field error, no toast spam |
| 404 | `subject_not_found`, `thread_not_found` | Empty state |
| 409 | `index_busy` | Toast + retry |
| 422 | `validation_error` | Inline field errors |
| 429 | `rate_limited` | Toast, disable submit for `retry_after_s` |
| 500 | `internal_error` | Toast + "Try again" |
| 503 | `model_unavailable`, `vector_store_unavailable` | `BackendStatusBanner` offline mode |

### CORS
Must allow origin `http://localhost:8080`, methods `GET, POST, OPTIONS`, headers
`Content-Type, Authorization, X-Student-Id`, and expose `X-Request-Id`.

### Timeouts (frontend defaults)
`GET /health` 3 s · `GET /api/model/status` 5 s · reads 10 s · `POST /api/chat` 90 s ·
quiz / mock exam / study plan 120 s · `POST /api/import/document` 300 s.

---

## 1. `GET /health`

- **Purpose:** liveness + capability probe. Drives `BackendStatusBanner`.
- **Called by:** not yet wired in the frontend; intended for a future `BackendStatusBanner`,
  `/diagnostics`, and `/settings`.
- **Request:** none.

```json
{
  "status": "ok",
  "version": "0.2.0",
  "uptime_s": 1284,
  "context_store": { "type": "sqlite", "reachable": true },
  "model_server": { "reachable": true, "provider": "openai-compatible", "preloaded": true },
  "runtime": {
    "managed": true,
    "engine": "llama.cpp",
    "model_name": "Qwen/Qwen3.8-27B",
    "max_model_len": 32768,
    "platform": { "system": "Linux", "machine": "x86_64", "accelerator": "cuda" }
  },
  "checked_at": "2026-08-11T08:40:12Z"
}
```

- `max_model_len` is hardware-adaptive (the example is an RTX 3090; the specified M4 Pro reports
  `65536` and `metal`).
- **Required:** `status`, `checked_at`. The implemented `status` can be `degraded` while FastAPI and
  SQLite are healthy but the local model is unreachable.
- **Loading:** silent; no spinner. **Display:** green/amber chip in `/diagnostics`; banner only when unreachable or `status != "ok"`.

## 2. `GET /api/model/status`

- **Purpose:** which model is serving requests and where.
- **Called by:** `/settings`, `/diagnostics`, optional chat-header chip.

```json
{
  "provider": "openai-compatible",
  "model": "Qwen/Qwen3.8-27B",
  "endpoint": "http://127.0.0.1:8000",
  "mode": "local",
  "reachable": true,
  "latency_ms": 42,
  "embedding_model": "hashing-fallback-384d"
}
```

- **Required:** `provider`, `model`, `mode` (`local` \| `remote`), `reachable`.
- **Error:** 503 `model_unavailable` → UI shows "Model server offline".
- **Display:** `llama.cpp · Qwen/Qwen3.8-27B · local · preloaded · 42 ms`.

## 3. `GET /api/subjects`

- **Purpose:** index metadata for the 15 top-level subjects. **Does not** define the subject list —
  the frontend owns that (`frontend/src/lib/mock/subjects.ts`).
- **Called by:** `/school` (`school.index.tsx`).

```json
{
  "subjects": [
    {
      "subject_id": "spf",
      "display_name": "SPF Biology & Chemistry",
      "language": "de",
      "components": [
        { "component_subject_id": "spf-biology", "display_name": "Biology (SPF)" },
        { "component_subject_id": "spf-chemistry", "display_name": "Chemistry (SPF)" }
      ],
      "indexed_materials": 14,
      "learning_goal_count": 22,
      "last_indexed_at": "2026-08-10T19:02:00Z"
    },
    {
      "subject_id": "mathematics",
      "display_name": "Mathematics",
      "language": "en",
      "components": [],
      "indexed_materials": 18,
      "learning_goal_count": 31,
      "last_indexed_at": "2026-08-09T12:00:00Z"
    }
  ]
}
```

- **Loading:** cards render from static data immediately; index counts fade in.
- **Error:** silent fallback to static metadata.

## 4. `GET /api/subjects/{subject_id}`

- **Purpose:** one subject's corpus/index detail. **Called by:** `/school/$subject`.
- **Optional query:** `component_subject_id`.

```json
{
  "subject_id": "physics",
  "display_name": "Physics",
  "language": "en",
  "components": [],
  "materials_count": 12,
  "chunks_indexed": 941,
  "topics": ["Kinematics", "Newtonian mechanics", "Energy"],
  "last_indexed_at": "2026-08-09T12:00:00Z"
}
```

- **Error:** 404 `subject_not_found` → hide index panel, keep the grade UI intact.

## 5. `GET /api/subjects/{subject_id}/learning-goals`

- **Query:** `component_subject_id` (optional), `topic` (optional).

```json
{
  "subject_id": "spf",
  "component_subject_id": "spf-chemistry",
  "learning_goals": [
    {
      "learning_goal_id": "lg_spf_chem_04",
      "title": "Reaktionsgeschwindigkeit erklären",
      "description": "Einflussfaktoren auf die Reaktionsgeschwindigkeit beschreiben und begründen.",
      "topic": "Kinetik",
      "source_material_id": "mat_syllabus_spf_chem",
      "language": "de"
    }
  ]
}
```

- **Loading:** list skeleton. **Empty:** "No learning goals loaded for this subject."

## 6. `GET /api/subjects/{subject_id}/materials`

- **Query:** `component_subject_id`, `section`, `include_archived`.

```json
{
  "subject_id": "history",
  "materials": [
    {
      "material_id": "mat_7f21",
      "name": "Cold War — lecture notes.pdf",
      "type": "PDF",
      "section": "Learning Material",
      "status": "Indexed",
      "pages": 24,
      "chunks": 118,
      "language": "en",
      "added_at": "2026-08-01T10:11:00Z",
      "url": null
    }
  ]
}
```

- **Display:** merged with local `AppDataProvider` materials in `MaterialsPanel`; backend items are
  read-only and marked "Indexed".

## 7. `POST /api/chat`

- **Purpose:** the core compiled-context answer. **Called by:** authenticated TanStack `/api/chat`
  via `context-backend.server.ts`.

Request:

```json
{
  "thread_id": "3f6e6d3a-6d51-4a1b-9a41-4a8e2a3f0011",
  "subject_id": "spf",
  "component_subject_id": "spf-chemistry",
  "language": "de",
  "academic_year": "2026-27",
  "grade_level": 11,
  "question": "Erkläre mir den Unterschied zwischen Aktivierungsenergie und Reaktionsenthalpie.",
  "learning_goal_id": "lg_spf_chem_04",
  "material_ids": [],
  "top_k": 6,
  "include_sources": true,
  "allow_web": true,
  "stream": false
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `thread_id` | yes | UUID from Supabase today. |
| `subject_id` | subject chat | Stable frontend slug; omitted for a general all-subject thread. |
| `component_subject_id` | no | Required only for SPF workspaces. |
| `language` | yes | `de` \| `en` \| `fr`. |
| `academic_year` | yes | e.g. `2026-27`. |
| `grade_level` | yes | `11`. |
| `question` | yes | Non-empty, ≤ 4000 chars. |
| `learning_goal_id` | no | Scopes retrieval. |
| `material_ids` | no | Restricts retrieval; empty = whole subject corpus. |
| `top_k` | no | Default 6. |
| `include_sources` | no | Default `true`. |
| `allow_web` | no | Default `true`; still requires intent-gated current/web language and global enablement. |
| `stream` | no | Default `false`; `true` returns SSE. |

Current implementation accepts only `stream:false`; native Python SSE remains future work.

Response (`stream: false`):

```json
{
  "thread_id": "3f6e6d3a-6d51-4a1b-9a41-4a8e2a3f0011",
  "message_id": "msg_01HZYB3K",
  "answer": "Die Aktivierungsenergie ist die Energiebarriere ...",
  "sources": [
    {
      "source_id": "src_1",
      "material_id": "mat_spf_chem_kinetik",
      "material_name": "Kinetik — Skript.pdf",
      "section": "Learning Material",
      "page": 12,
      "snippet": "Die Aktivierungsenergie E_A beschreibt ...",
      "score": 0.82,
      "url": null
    }
  ],
  "exam_tip": "In Prüfungen wird oft ein Energiediagramm verlangt — beschrifte E_A und ΔH getrennt.",
  "used_model": "Qwen/Qwen3.8-27B",
  "retrieval_summary": { "chunks_considered": 42, "chunks_used": 6, "collections": ["subject_spf-chemistry"] },
  "language": "de",
  "created_at": "2026-08-11T08:41:00Z"
}
```

Streaming (`stream: true`) — `text/event-stream`:

```text
event: token
data: {"delta":"Die Aktivierungsenergie "}

event: token
data: {"delta":"ist die Energiebarriere ..."}

event: done
data: {"message_id":"msg_01HZYB3K","sources":[...],"exam_tip":"...","used_model":"Qwen/Qwen3.8-27B","retrieval_summary":{...},"created_at":"2026-08-11T08:41:00Z"}
```

- **Errors:** 404 `thread_not_found`, 503 `model_unavailable`, 429 `rate_limited`.
- **Loading:** existing `Shimmer` "Thinking…"; composer disabled.
- **Display:** Markdown answer, then `SourceSnippetList`, then the exam tip in a subtle callout.

## 8. `POST /api/quiz/generate`

Request:

```json
{
  "subject_id": "biology",
  "component_subject_id": null,
  "language": "de",
  "academic_year": "2026-27",
  "grade_level": 11,
  "learning_goal_ids": ["lg_bio_02"],
  "material_ids": [],
  "question_count": 8,
  "difficulty": "standard",
  "question_types": ["multiple_choice", "short_answer"]
}
```

Response:

```json
{
  "quiz_id": "quiz_01HZ",
  "subject_id": "biology",
  "language": "de",
  "difficulty": "standard",
  "questions": [
    {
      "question_id": "q1",
      "type": "multiple_choice",
      "prompt": "Welche Organelle produziert ATP?",
      "options": ["Ribosom", "Mitochondrium", "Golgi-Apparat", "Lysosom"],
      "correct_option_index": 1,
      "expected_answer": null,
      "points": 1,
      "explanation": "Mitochondrien betreiben die oxidative Phosphorylierung.",
      "learning_goal_id": "lg_bio_02",
      "sources": ["src_3"]
    }
  ],
  "sources": [],
  "used_model": "Qwen/Qwen3.8-27B",
  "generated_at": "2026-08-11T08:44:00Z"
}
```

- **Required in request:** `subject_id`, `language`, `question_count`. **Optional:** the rest.
- **Loading:** panel shimmer, up to 120 s. **Empty:** "Add material to this subject first."

## 9. `POST /api/mock-exam/generate`

Request:

```json
{
  "subject_id": "spf",
  "component_subject_id": "spf-biology",
  "language": "de",
  "academic_year": "2026-27",
  "grade_level": 11,
  "duration_minutes": 90,
  "total_points": 40,
  "topics": ["Genetik"],
  "material_ids": []
}
```

Response:

```json
{
  "exam_id": "exam_01HZ",
  "subject_id": "spf",
  "component_subject_id": "spf-biology",
  "title": "SPF Biologie — Probeprüfung Genetik",
  "language": "de",
  "duration_minutes": 90,
  "total_points": 40,
  "questions": [
    {
      "question_id": "e1",
      "prompt": "Erkläre die Bedeutung der Meiose für die genetische Variabilität.",
      "points": 8,
      "rubric_id": "rub_e1",
      "rubric": ["Crossing-over genannt (2P)", "Zufällige Chromosomenverteilung (3P)", "Bezug zur Evolution (3P)"],
      "topic": "Genetik",
      "learning_goal_id": "lg_spf_bio_07"
    }
  ],
  "sources": [],
  "used_model": "Qwen/Qwen3.8-27B",
  "generated_at": "2026-08-11T08:46:00Z"
}
```

- **Display:** exam preview with per-question points; each question offers "Grade my answer".

## 10. `POST /api/study-plan/generate`

Request:

```json
{
  "subject_ids": ["mathematics", "spf"],
  "language": "en",
  "academic_year": "2026-27",
  "grade_level": 11,
  "start_date": "2026-08-12",
  "end_date": "2026-08-26",
  "exam_dates": [{ "subject_id": "mathematics", "date": "2026-08-24", "topic": "Integrals" }],
  "available_slots": [{ "date": "2026-08-12", "start": "17:00", "end": "19:00" }],
  "daily_minutes_max": 120
}
```

Response:

```json
{
  "plan_id": "plan_01HZ",
  "items": [
    {
      "item_id": "pi_1",
      "date": "2026-08-12",
      "start": "17:00",
      "end": "18:00",
      "subject_id": "mathematics",
      "component_subject_id": null,
      "topic": "Integration by parts",
      "learning_goal_id": "lg_math_11",
      "minutes": 60,
      "rationale": "Exam in 12 days; weakest recent assessment topic."
    }
  ],
  "generated_at": "2026-08-11T08:47:00Z",
  "used_model": "Qwen/Qwen3.8-27B"
}
```

- **Display:** review list first; only after "Add to planner" are items written to
  `AppDataProvider` as `PlannerEvent` with `generated: true`, fully editable afterwards.

## 11. `POST /api/grade`

Request:

```json
{
  "subject_id": "history",
  "component_subject_id": null,
  "language": "en",
  "academic_year": "2026-27",
  "grade_level": 11,
  "question": "Explain two causes of the Cold War.",
  "student_answer": "Ideological conflict between capitalism and communism, and mistrust after WWII conferences.",
  "max_points": 8,
  "rubric_id": "rub_e1",
  "exam_id": "exam_01HZ",
  "question_id": "e1"
}
```

Response:

```json
{
  "points_awarded": 6,
  "max_points": 8,
  "swiss_grade": 4.75,
  "grade_formula": "points_awarded / max_points * 5 + 1 = 6 / 8 * 5 + 1 = 4.75",
  "strengths": ["Correctly identifies the ideological dimension.", "Links to post-war conferences."],
  "missing_points": ["No mention of the nuclear arms race.", "No concrete dates or events."],
  "improvement_advice": "Anchor each cause to one concrete event with a date.",
  "rubric_used": ["Ideological conflict (3P)", "Post-war mistrust (3P)", "Concrete evidence (2P)"],
  "sources": [
    { "source_id": "src_9", "material_id": "mat_7f21", "material_name": "Cold War — lecture notes.pdf", "page": 4, "snippet": "...", "score": 0.77 }
  ],
  "graded_at": "2026-08-11T08:49:00Z",
  "used_model": "Qwen/Qwen3.8-27B"
}
```

- **Grade rule:** the backend returns the **exact** grade from `points_awarded / max_points * 5 + 1`
  (unrounded, clamped to `[1.0, 6.0]`). The frontend displays the exact value where it shows exact
  values today, and applies the existing round-to-nearest-0.5 rule for averages and rounded
  displays (`frontend/src/lib/grade-math.ts`). Grades below 4.0 render in `#C96A00`.
- **Display:** points, grade, strengths, missing points, advice, then sources.

## 12. `POST /api/feedback`

Request:

```json
{
  "category": "answer_quality",
  "rating": "down",
  "message": "The answer used university-level vocabulary.",
  "route": "/chat/3f6e6d3a",
  "thread_id": "3f6e6d3a-6d51-4a1b-9a41-4a8e2a3f0011",
  "message_id": "msg_01HZYB3K",
  "subject_id": "spf",
  "language": "de",
  "app_version": "2026.08.11"
}
```

Response:

```json
{ "feedback_id": "fb_01HZ", "created_at": "2026-08-11T08:50:00Z" }
```

- **Required:** `category`. One of `message`/`rating` must be present.
- **Error handling:** on failure the frontend queues the entry in `localStorage` and retries.

## 13. `POST /api/import/document`

- **Content type:** `multipart/form-data`.
- **Fields:** `file` (PDF/DOCX/MD/TXT), `subject_id`, `component_subject_id`, `section`, `language`.

```json
{
  "material_id": "mat_9c02",
  "name": "Kinetik — Skript.pdf",
  "type": "PDF",
  "section": "Learning Material",
  "language": "de",
  "pages": 24,
  "chunks_indexed": 118,
  "status": "Indexed",
  "warnings": ["3 pages contained images without extractable text."],
  "added_at": "2026-08-11T08:52:00Z"
}
```

- **Errors:** 413 `file_too_large`, 415 `unsupported_media_type`, 422 `parse_failed`.
- **Loading:** Uploading → Parsing → Indexing progress states, up to 300 s.
- **Display:** on success the material appears in `MaterialsPanel` with status `Indexed`; on
  `parse_failed` it is listed as `Needs review`, never silently dropped.

## Not yet defined: general assistant inference

The general assistant currently has **no** Python endpoint. It must not reuse
the tutoring `/api/chat` path, which requires tutoring threads and subject
context. When the backend is ready, the expected shape is:

```
POST /api/assistant/chat
{
  "thread_id": "uuid",
  "message_id": "uuid",
  "content": "user text",
  "attachments": [
    { "id": "uuid", "bucket": "chat-attachments", "object_path": "<uid>/<thread>/file.pdf",
      "mime_type": "application/pdf", "byte_size": 12345, "kind": "document" }
  ],
  "model": "Qwen/Qwen3.8-27B"
}
```

The backend writes its reply directly into `assistant_messages`
(`role = "assistant"`), and updates `assistant_attachments.parse_status` once a
file has been parsed. Until then the frontend stores messages/attachments and
tells the student generation is pending.
