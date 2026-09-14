# User Flows

Sequence diagrams for the current chat path and the target paths for unfinished subject tools.
Unless a section says implemented, it is a target flow. Participants:
**Student**, **UI** (Lovable frontend), **SF** (TanStack route or planned API client),
**PY** (Python FastAPI), **SB** (Supabase), **LS** (localStorage / `AppDataProvider`),
**RAG** (SQLite chunks / hybrid retrieval), **FILES** (subject files), **LLM** (local OpenAI-compatible server).

## 1. Local app startup (target; health banner not yet implemented)

```mermaid
sequenceDiagram
    participant Student
    participant UI as Lovable UI
    participant LS as localStorage/AppDataProvider
    participant SF as Frontend server bridge
    participant PY as Python FastAPI
    Student->>UI: open http://localhost:8080
    UI->>UI: mount __root providers (Query, Theme, AppData, AcademicYear)
    UI->>LS: hydrate assessments, events, materials, links, profile
    LS-->>UI: prototype state (or demo seed if demo mode on)
    UI->>SF: GET /health
    SF->>PY: GET http://localhost:8001/health
    alt backend up
        PY-->>SF: {status:"ok", subjects_indexed:12}
        SF-->>UI: healthy → hide banner, enable AI actions
    else backend down
        SF-->>UI: network error → BackendStatusBanner (amber), AI actions disabled
    end
```

## 2. Sign-in / authenticated app load

```mermaid
sequenceDiagram
    participant Student
    participant UI as Lovable UI
    participant SB as Supabase
    Student->>UI: visit /home
    UI->>UI: _authenticated/route.tsx gate
    UI->>SB: getSession()
    alt no session
        SB-->>UI: null
        UI-->>Student: redirect / (welcome + AuthForm)
        Student->>UI: email or username + password, reset link, or GitHub / LinkedIn / Spotify
        alt username (no @)
            UI->>SB: invoke username-login → setSession
        else email
            UI->>SB: signInWithPassword / signInWithOAuth(redirectTo /home)
        end
        SB-->>UI: session + access token
        UI-->>Student: redirect back to /home
    else session valid
        SB-->>UI: session
        UI-->>Student: render AppShell + /home
    end
```

## 3. Dashboard load (`/school`)

```mermaid
sequenceDiagram
    participant Student
    participant UI as Lovable UI
    participant LS as localStorage/AppDataProvider
    participant SF as Frontend server bridge
    participant PY as Python FastAPI
    Student->>UI: open /school
    UI->>UI: read static SUBJECTS (15 cards)
    UI->>LS: assessments for academic year 2026-27
    LS-->>UI: Assessment[]
    UI->>UI: grade-math summariseSubjectView / summariseYear (SPF = 1 subject)
    UI-->>Student: cards, yearly average, failing alerts (#C96A00)
    UI->>SF: GET /api/subjects (optional)
    SF->>PY: GET /api/subjects
    PY-->>SF: index counts per subject_id
    SF-->>UI: enrich cards with "12 indexed materials"
```

## 4. Subject selection

```mermaid
sequenceDiagram
    participant Student
    participant UI as Lovable UI
    participant LS as localStorage/AppDataProvider
    participant SF as Frontend server bridge
    participant PY as Python FastAPI
    Student->>UI: click subject card → /school/physics
    UI->>LS: assessments + materials for "physics"
    LS-->>UI: local data (renders immediately)
    UI->>SF: GET /api/subjects/physics
    UI->>SF: GET /api/subjects/physics/learning-goals
    UI->>SF: GET /api/subjects/physics/materials
    SF->>PY: three GETs
    PY-->>SF: detail, goals, indexed materials
    SF-->>UI: merge (local + backend origin) into MaterialsPanel
    UI-->>Student: subject dashboard with AI tools enabled
```

## 5. SPF Biology & Chemistry component switching

```mermaid
sequenceDiagram
    participant Student
    participant UI as Lovable UI
    participant LS as localStorage/AppDataProvider
    participant SF as Frontend server bridge
    participant PY as Python FastAPI
    Student->>UI: open /school/spf
    UI->>LS: assessments for spf-biology + spf-chemistry
    UI->>UI: combined = (avg(bio) + avg(chem)) / 2 → header (2 decimals)
    UI-->>Student: combined header + both component averages + segmented switch
    Student->>UI: switch to "Chemistry"
    UI->>UI: component_subject_id = "spf-chemistry" (no route change)
    UI->>SF: GET /api/subjects/spf/learning-goals?component_subject_id=spf-chemistry
    SF->>PY: scoped request
    PY-->>SF: chemistry goals + materials only
    SF-->>UI: chemistry workspace; combined header average unchanged
```

## 6. Asking a chat question (implemented)

```mermaid
sequenceDiagram
    participant Student
    participant UI as Lovable UI
    participant SF as TanStack /api/chat
    participant SB as Supabase
    participant PY as Python FastAPI
    participant RAG as Context Manager/SQLite
    participant WEB as Budgeted web retrieval
    participant FILES as Subject files
    participant LLM as Qwen3.8-27B/llama.cpp
    Student->>UI: type question, submit
    UI->>UI: Shimmer "Thinking…", composer disabled
    UI->>SF: sendMessage(question)
    SF->>SB: persist user message (Stage 1 writer)
    SF->>PY: POST /api/chat {thread_id, current question, subject/language/year/grade, include_sources:true, allow_web:true, stream:false}
    PY->>RAG: intent-gated dense + BM25 retrieval, RRF, rerank, deduplicate, budget
    opt explicit latest/current/web intent
        PY->>WEB: search relevant current information
        WEB-->>PY: URL + title + fetched_at + bounded extract
    end
    RAG-->>PY: CompiledContext + provenance
    PY->>LLM: exactly two budget-checked messages (system/context + current user request)
    LLM-->>PY: completed answer
    PY-->>SF: {answer, sources[], exam_tip, used_model, retrieval_summary}
    SF->>SB: persist assistant message
    SF-->>UI: ChatResponse
    UI-->>Student: Markdown answer + SourceSnippetList + exam tip
```

## 7. Generating a quiz

```mermaid
sequenceDiagram
    participant Student
    participant UI as Lovable UI
    participant SF as Frontend server bridge
    participant PY as Python FastAPI
    participant RAG as Hybrid context retrieval
    participant LLM as Qwen3.8-27B/llama.cpp
    Student->>UI: /school/biology → "Generate quiz" (8 questions, standard)
    UI-->>Student: panel shimmer "Generating quiz…" (up to 120 s)
    SF->>PY: POST /api/quiz/generate {subject_id, language:"de", learning_goal_ids, question_count:8}
    PY->>RAG: retrieve goal-scoped chunks
    RAG-->>PY: context
    PY->>LLM: quiz generation prompt (JSON schema)
    LLM-->>PY: questions
    PY-->>SF: Quiz {quiz_id, questions[], sources[]}
    SF-->>UI: render quiz
    Student->>UI: answer questions → score shown
    Student->>UI: "Save as practice assessment" (optional)
    UI->>UI: create Assessment source="AI practice assessment" in AppDataProvider
```

## 8. Generating a mock exam

```mermaid
sequenceDiagram
    participant Student
    participant UI as Lovable UI
    participant SF as Frontend server bridge
    participant PY as Python FastAPI
    participant RAG as Hybrid context retrieval
    participant LLM as Qwen3.8-27B/llama.cpp
    Student->>UI: "Generate mock exam" (90 min, 40 points, topic Genetik)
    SF->>PY: POST /api/mock-exam/generate {subject_id:"spf", component_subject_id:"spf-biology", ...}
    PY->>RAG: retrieve syllabus + grading criteria + material chunks
    RAG-->>PY: context
    PY->>LLM: exam prompt with per-question rubric requirement
    LLM-->>PY: questions + rubrics
    PY-->>SF: MockExam {exam_id, questions[] with points+rubric_id}
    SF-->>UI: exam view, timer optional
    Student->>UI: write answers → "Grade my answer" per question
```

## 9. Grading a student answer

```mermaid
sequenceDiagram
    participant Student
    participant UI as Lovable UI
    participant SF as Frontend server bridge
    participant PY as Python FastAPI
    participant RAG as Hybrid context retrieval
    participant LLM as Qwen3.8-27B/llama.cpp
    participant LS as localStorage/AppDataProvider
    Student->>UI: submit answer for exam question (max 8 points)
    UI-->>Student: "Marking…" spinner
    SF->>PY: POST /api/grade {question, student_answer, max_points:8, rubric_id, subject_id, language}
    PY->>RAG: retrieve rubric + reference material
    RAG-->>PY: context
    PY->>LLM: rubric-based evaluation prompt
    LLM-->>PY: points + qualitative feedback
    PY->>PY: swiss_grade = points/max*5+1 (clamped 1..6)
    PY-->>SF: GradingResult {points_awarded:6, swiss_grade:4.75, strengths, missing_points, advice, sources}
    SF-->>UI: render result
    UI->>UI: roundToHalf() for rounded display; orange #C96A00 if < 4.0
    Student->>UI: "Save to my grades" (optional)
    UI->>LS: Assessment source="AI practice assessment", includeInStats toggle
```

## 10. Generating a study plan

```mermaid
sequenceDiagram
    participant Student
    participant UI as Lovable UI
    participant LS as localStorage/AppDataProvider
    participant SF as Frontend server bridge
    participant PY as Python FastAPI
    participant LLM as Qwen3.8-27B/llama.cpp
    Student->>UI: /planner → "Generate study plan"
    UI->>LS: upcoming exams + timetable + free slots (date-utils occurrencesInRange)
    LS-->>UI: exam_dates[], available_slots[]
    SF->>PY: POST /api/study-plan/generate {subject_ids, exam_dates, available_slots, daily_minutes_max}
    PY->>LLM: planning prompt
    LLM-->>PY: schedule
    PY-->>SF: StudyPlan {items[] with rationale}
    SF-->>UI: **review list** (nothing written yet)
    Student->>UI: "Add to planner"
    UI->>LS: insert PlannerEvent category="Study session", generated=true
    LS-->>UI: planner updated, items fully editable/deletable
```

## 11. Importing material

```mermaid
sequenceDiagram
    participant Student
    participant UI as Lovable UI
    participant SF as Frontend server bridge
    participant PY as Python FastAPI
    participant FILES as Subject files
    participant RAG as Hybrid context retrieval
    participant LS as localStorage/AppDataProvider
    Student->>UI: MaterialsPanel → upload "Kinetik — Skript.pdf" (section: Learning Material)
    UI-->>Student: Uploading → Parsing → Indexing
    SF->>PY: POST /api/import/document (multipart: file, subject_id, component_subject_id, section, language)
    PY->>FILES: store under data/subjects/spf-chemistry/
    PY->>PY: parse PDF/DOCX/MD/TXT → chunks
    PY->>RAG: embed + upsert into subject collection
    RAG-->>PY: chunks_indexed=118
    PY-->>SF: Material {material_id, status:"Indexed", warnings[]}
    SF-->>UI: list item with origin="backend"
    alt parse failed
        PY-->>SF: 422 parse_failed
        SF-->>UI: item listed as "Needs review", never dropped
    end
    Note over UI,LS: local-only links/notes still stored in AppDataProvider
```

## 12. Saving feedback

```mermaid
sequenceDiagram
    participant Student
    participant UI as Lovable UI
    participant SF as Frontend server bridge
    participant PY as Python FastAPI
    participant LS as localStorage/AppDataProvider
    Student->>UI: /feedback form (category + message)
    UI->>SB: invoke feedback-submit {message, category, context}
    alt success
        SB-->>UI: row in public.feedback + text mirror in feedback-messages bucket
        UI-->>Student: success state; form cleared
    else failure
        SB-->>UI: error
        UI-->>Student: error state; message kept in the textarea
    end
    Note over UI: telemetry logs success/failure only — never the message text
```

## 13. Loading a previous chat thread

```mermaid
sequenceDiagram
    participant Student
    participant UI as Lovable UI
    participant SF as TanStack server fn
    participant SB as Supabase
    participant PY as Python FastAPI
    Student->>UI: click a thread in ThreadList
    UI->>UI: navigate /chat/$threadId
    UI->>SF: listThreads() / listMessages({threadId})
    SF->>SB: select threads / messages where user_id = auth.uid()
    SB-->>SF: rows
    SF-->>UI: transcript → useChat initial messages
    opt AI metadata
        UI->>PY: GET /api/chat/threads/{id}/metadata
        PY-->>UI: sources + used_model per message_id
        UI-->>Student: SourceSnippetList restored under old answers
    end
```

## 14. Backend unavailable / mock mode

```mermaid
sequenceDiagram
    participant Student
    participant UI as Lovable UI
    participant SF as Frontend server bridge
    participant PY as Python FastAPI
    participant LS as localStorage/AppDataProvider
    UI->>SF: GET /health (startup + every 60 s)
    SF->>PY: GET /health
    PY--xSF: ECONNREFUSED / timeout
    SF-->>UI: offline
    UI-->>Student: BackendStatusBanner "Study AI backend offline — grades, planner and materials still work." [Retry]
    Note over UI: AI buttons disabled with tooltips; /school /stats /planner /profile fully usable from LS
    Student->>UI: ask a question
    UI-->>Student: explicit service-unavailable error; no provider fallback
    Student->>UI: Retry
    UI->>SF: GET /health → ok → banner clears, AI re-enabled
```

## General assistant flow

1. Student opens `/assistant` and presses **New chat** (`assistant_threads` row).
2. Types a message and optionally attaches images/audio/video (≤ 1 MB each) or
   PDF/DOCX files.
3. The frontend stores the message in `assistant_messages`, uploads files to
   `chat-attachments/<uid>/<threadId>/…` and records
   `assistant_attachments` with `parse_status = 'unparsed'`.
4. The UI confirms the message is saved and ready for the local AI backend. No
   reply is invented; assistant-role rows written later appear in the thread.

## Settings and storage flow

1. `/settings` loads the Supabase profile, `user_preferences` and
   `get_storage_usage_status()`.
2. Account edits write to `profiles`; email/password changes go through Supabase
   Auth; avatars live in the private `profile-avatars` bucket.
3. The storage section warns at ≤ 10% remaining, and at ≤ 1% invokes
   `storage-emergency-cleanup` once per session before refreshing usage.
4. The student filters their own files by type and date, selects them and
   confirms deletion: Storage `.remove()` first, then metadata reconciliation.

## Language-switch flow — implemented, frontend-only

1. Student opens the flag dropdown in `AppHeader` (`LanguageMenu.tsx`) and picks one of
   English/German/Russian/Spanish/French.
2. `I18nProvider` swaps the active message bundle immediately and reformats dates/numbers.
3. If signed in, the choice is written to `user_preferences.preferences.app_language` (authoritative)
   and cached in `localStorage` (`alim.app_language`) only to avoid a flash of the wrong language on
   the next load and to localise the signed-out welcome screen.
4. `FUTURE BACKEND / CODEX (not implemented)`: the local Python backend does not yet read
   `app_language` when generating chat, quiz or grading responses — see
   `SUBJECT_MODEL_AND_LANGUAGE_RULES.md`.

## Read-aloud (Listen/Stop) flow — implemented, frontend-only

1. A completed assistant message renders a Listen control when
   `user_preferences.preferences.assistant_audio_enabled` is `true` (default).
2. Pressing Listen calls `speak()` from `frontend/src/lib/speech.ts`, which uses the browser's Web
   Speech API; pressing it again (or Stop) calls `stopSpeaking()`. Nothing is uploaded, recorded or
   persisted — playback is ephemeral and entirely client-side.
3. When `assistant_audio_autoplay` is `true`, a newly completed answer autoplays once; historical
   messages loaded from `assistant_messages` never autoplay.
4. If `speechSupported` is `false` for the browser, the control shows a "not supported" state instead
   of failing silently.
5. The local Python backend is not involved and does not generate audio today.
