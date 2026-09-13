# Full UI, Frontend & Backend Wireframes

This pack is a code-navigation aid for maintainers and coding agents. It maps the current application as implemented and separates it from future integration work.

## Status language

- **IMPLEMENTED** — executable in the current repository.
- **IMPLEMENTED LOCAL** — runs in the frontend and persists in browser storage.
- **IMPLEMENTED CLOUD** — uses Lovable Cloud for identity or chat persistence.
- **PLANNED** — documented contract or placeholder UI, not currently wired end to end.
- **OPTIONAL** — exists but is enabled only through explicit configuration.

## Reading order

Start with diagrams 1–4 for architecture, routing, composition, and state ownership. Then open the feature journey matching the code you intend to change. Every diagram is also available as a standalone `.mmd` file in [`docs/wireframes/`](wireframes/).

## Non-negotiable boundaries

1. The frontend owns the fixed 15-subject presentation model, subject languages, SPF display combination, Swiss grade rounding, and failing-grade styling.
2. Lovable Cloud currently owns authentication and per-user chat threads/messages.
3. Browser storage currently owns grades, planner events, local materials, school links, profile, academic year, notifications, and demo mode.
4. Python owns AI context compilation, retrieval, memories, source provenance, document indexing, and local/remote model calls.
5. The TanStack `POST /api/chat` route is the authenticated bridge and the single current writer of chat transcript rows.
6. Quiz, mock-exam, answer-grading, study-plan, feedback, subject metadata, material-list, and health UI integrations are planned unless a diagram explicitly marks a backend-only endpoint as implemented.

## 1. System overview

The complete runtime boundary and service topology.

Standalone: [`01-system-overview.mmd`](wireframes/01-system-overview.mmd)

```mermaid
flowchart LR
  Student[Student] --> Browser[React UI in browser\nIMPLEMENTED]
  Browser --> Router[TanStack file routes\nIMPLEMENTED]
  Router --> Providers[Query + Theme + AppData + AcademicYear\nIMPLEMENTED]
  Providers --> Local[(Browser storage\nGrades, planner, profile, links, demo\nIMPLEMENTED LOCAL)]
  Router --> Auth[Authenticated route gate\nIMPLEMENTED]
  Auth --> Cloud[(Lovable Cloud\nIdentity + threads + messages\nIMPLEMENTED CLOUD)]
  Browser --> ChatRoute[POST /api/chat\nTanStack server route\nIMPLEMENTED]
  ChatRoute --> Cloud
  ChatRoute --> Adapter[context-backend.server.ts\nIMPLEMENTED]
  Adapter --> Python[FastAPI localhost:8001\nIMPLEMENTED FOR CHAT]
  Python --> Context[Context Manager\nintent + budget + memory\nIMPLEMENTED]
  Context --> Retrieval[(SQLite chunks + hybrid retrieval\nIMPLEMENTED)]
  Context --> Files[(PDF DOCX MD TXT corpus\nPARTIAL INGESTION)]
  Python --> Model[Ollama or vLLM\nCONFIGURED EXTERNALLY]
  ChatRoute -. opt-in fallback .-> Gateway[Lovable AI Gateway\nIMPLEMENTED OPTIONAL]
  Python -. future APIs .-> Future[Quiz, exam, grading, plan, feedback\nPLANNED]
```

## 2. Routes and navigation

Every page route and the navigation surfaces that reach it.

Standalone: [`02-routes-navigation.mmd`](wireframes/02-routes-navigation.mmd)

```mermaid
flowchart TD
  Root["/ — Public title screen"] --> Auth["/auth"]
  Root --> Protected{Authenticated route gate}
  Auth -->|valid session| Home["/home"]
  Protected --> Home
  Home --> School["/school"]
  Home --> Planner["/planner"]
  School --> Subject["/school/$subject"]
  School --> Stats["/stats"]
  Subject --> ChatEntry["/chat"]
  ChatEntry -->|select or create thread| Thread["/chat/$threadId"]
  Home --> Profile["/profile"]
  Home --> Settings["/settings"]
  Home --> Help["/help"]
  Home --> Feedback["/feedback"]
  Home --> Diagnostics["/diagnostics"]
  Header[Desktop header navigation] --> Home
  Header --> School
  Header --> Planner
  Header --> Stats
  Header --> Help
  Header --> Feedback
  Mobile[Mobile bottom navigation] --> Home
  Mobile --> School
  Mobile --> Planner
  Mobile --> Stats
  Footer[Footer navigation] --> Feedback
  Footer --> Help
  Footer --> Diagnostics
```

## 3. Frontend composition

The provider, layout, screen, and chat-component hierarchy.

Standalone: [`03-frontend-composition.mmd`](wireframes/03-frontend-composition.mmd)

```mermaid
flowchart TD
  HTML[RootShell\nHTML + head + scripts] --> Root[RootComponent]
  Root --> Query[QueryClientProvider]
  Query --> Theme[ThemeProvider]
  Theme --> Data[AppDataProvider]
  Data --> Year[AcademicYearProvider]
  Year --> Outlet[Router Outlet]
  Year --> Toast[Global Toaster]
  Outlet --> Public[Public screens\nTitle + Auth]
  Outlet --> Gate[Authenticated layout gate]
  Gate --> Pages[Home School Subject Planner Stats\nProfile Settings Feedback Help Diagnostics]
  Pages --> Shell[AppShell]
  Shell --> Header[AppHeader]
  Shell --> Content[Route content]
  Shell --> Footer[AppFooter]
  Shell --> Mobile[MobileNavigation]
  Gate --> Chat[StudyChat full-height shell]
  Chat --> Threads[ThreadList]
  Chat --> Conversation[AI Elements Conversation + Message]
  Chat --> Composer[AI Elements PromptInput + Shimmer]
  Conversation --> Sources[SourceSnippetList]
  Pages --> UI[shadcn and Radix primitives]
```

## 4. State ownership

The authoritative owner and storage location for each data family.

Standalone: [`04-state-ownership.mmd`](wireframes/04-state-ownership.mmd)

```mermaid
flowchart LR
  Static[Static frontend\n15 subjects + languages + SPF mapping] --> UI[Rendered UI]
  Local[(Browser storage\nassessments events materials links profile demo)] --> AppData[AppDataProvider]
  AppData --> UI
  AppData --> Grade[grade-math.ts\nSwiss formula + summaries + SPF]
  Grade --> UI
  Year[(Browser storage\nacademic year)] --> Academic[AcademicYearProvider]
  Academic --> UI
  Cloud[(Lovable Cloud\nusers threads messages)] --> ServerFns[Authenticated server functions]
  ServerFns --> UI
  Python[(Python SQLite\nchunks memories artifacts)] --> FastAPI[FastAPI]
  FastAPI --> ChatAPI[TanStack /api/chat]
  ChatAPI --> UI
  Static -->|subject/language context| ChatAPI
  Academic -->|year/grade context| ChatAPI
  Future[(Future Python records\nquiz exam grading plan feedback)] -. planned .-> FastAPI
```

## 5. Authentication journey

Protected route entry, sign-in, session restoration, and sign-out.

Standalone: [`05-authentication.mmd`](wireframes/05-authentication.mmd)

```mermaid
sequenceDiagram
  actor Student
  participant Page as Protected page
  participant Gate as _authenticated route gate
  participant Cloud as Lovable Cloud identity
  participant Auth as /auth and AuthForm
  Student->>Page: Open protected URL
  Page->>Gate: beforeLoad
  Gate->>Cloud: getUser()
  alt No valid session
    Cloud-->>Gate: No user
    Gate-->>Student: Redirect to /auth
    Student->>Auth: Email/password or Google sign-in
    Auth->>Cloud: Authenticate
    Cloud-->>Auth: Session and access token
    Auth-->>Student: Navigate to /home
  else Valid session
    Cloud-->>Gate: User
    Gate-->>Page: Render protected screen
  end
  Student->>Cloud: Sign out from account menu or chat
  Cloud-->>Student: Session cleared, navigate to /auth
```

## 6. Home journey

How the dashboard derives its student-facing summary.

Standalone: [`06-home.mmd`](wireframes/06-home.mmd)

```mermaid
flowchart TD
  Open[Open /home] --> Read[Read AppDataProvider + AcademicYearProvider]
  Read --> Profile[Preferred/full name]
  Read --> Grades[Assessments for selected year]
  Read --> Events[Planner events next 30 days]
  Read --> Links[User school links]
  Grades --> Year[summariseYear\nSPF counted once]
  Events --> Occ[occurrencesInRange]
  Year --> Cards[School-year average]
  Occ --> Cards
  Occ --> Next[Next exam + study time + activity]
  Profile --> Greeting[Personal greeting]
  Links --> LinkUI[SchoolLinksSection\nopen + CRUD]
  Cards --> UI[Home dashboard]
  Next --> UI
  Greeting --> UI
  LinkUI --> UI
  UI --> School["/school"]
  UI --> Planner["/planner"]
  UI --> Local[(Browser storage\nIMPLEMENTED LOCAL)]
```

## 7. School and grades journey

Subject navigation, grade CRUD, calculations, and warnings.

Standalone: [`07-school-grades.mmd`](wireframes/07-school-grades.mmd)

```mermaid
flowchart TD
  Open[Open /school] --> Subjects[Load SCHOOL_SUBJECTS\n15 top-level subjects]
  Open --> Data[Read assessments for selected year]
  Subjects --> Filter[Search filter and sort]
  Data --> SubjectCalc[summariseSubjectView per card]
  Data --> YearCalc[summariseYear]
  SubjectCalc --> SPF{Subject is SPF?}
  SPF -->|Yes| Combine[Average SPF Biology and SPF Chemistry component averages]
  SPF -->|No| Single[Weighted subject assessment average]
  Combine --> Cards[Subject cards + component breakdown]
  Single --> Cards
  YearCalc --> Overview[Year average + alerts + statistics]
  Cards --> Failing{Rounded grade below 4.0?}
  Failing -->|Yes| Orange[Warning styling]
  Failing -->|No| Normal[Standard styling]
  Cards --> Subject["/school/$subject"]
  Add[Add edit duplicate move delete assessment] --> AppData[AppDataProvider CRUD]
  Import[Transcript simulation: parse review confirm] --> AppData
  AppData --> Store[(Browser storage\nIMPLEMENTED LOCAL)]
  Store --> Data
```

## 8. Subject workspace journey

Subject tools, materials, statistics, and the SPF component split.

Standalone: [`08-subject-workspace.mmd`](wireframes/08-subject-workspace.mmd)

```mermaid
flowchart TD
  Route[Open /school/$subject] --> Lookup[getSchoolSubject or not found]
  Lookup --> Header[Subject header\naverage next exam materials]
  Lookup --> Components{SPF combined?}
  Components -->|No| Active[Use subject slug]
  Components -->|Yes| Toggle[Biology or Chemistry segmented switch]
  Toggle --> Active
  Active --> Grades[Local tests + grade summary]
  Active --> Materials[MaterialsPanel local CRUD]
  Active --> Modes[Chat Knowledge Analysis Quiz Exam Study Plan Statistics Tools]
  Grades --> Stats[Statistics mode\nIMPLEMENTED]
  Modes --> Chat[Open /chat\nIMPLEMENTED but subject is entered on thread]
  Modes -.-> Future[Knowledge analysis quiz exam plan tools\nPLACEHOLDER UI / PLANNED]
  Materials --> Local[(Browser storage\nIMPLEMENTED LOCAL)]
  Materials -.-> Indexed[Python indexed materials\nPLANNED MERGE]
  Toggle --> Scope[Component subject ID for future retrieval]
  Scope -.-> Python[FastAPI subject APIs\nPLANNED]
  Components --> Formula[Combined header = component averages divided by 2\nFRONTEND AUTHORITY]
```

## 9. Chat journey

Thread persistence, authentication, Python retrieval, model generation, and fallback.

Standalone: [`09-chat.mmd`](wireframes/09-chat.mmd)

```mermaid
sequenceDiagram
  actor Student
  participant UI as StudyChat
  participant Fn as Authenticated server functions
  participant Cloud as Lovable Cloud threads/messages
  participant API as TanStack POST /api/chat
  participant PY as Python FastAPI /api/chat
  participant RAG as Context Manager + retrieval
  participant LLM as Ollama or vLLM
  Student->>UI: Open /chat
  UI->>Fn: listThreads or createThread
  Fn->>Cloud: User-scoped thread operation
  Cloud-->>Fn: Thread
  UI-->>Student: Navigate /chat/{threadId}
  UI->>Fn: listMessages(threadId)
  Fn->>Cloud: User-scoped ordered messages
  Cloud-->>UI: Persisted UI messages
  Student->>UI: Submit question
  UI-->>Student: Optimistic message + Thinking
  UI->>API: UI messages + thread + year + grade with bearer token
  API->>Cloud: Verify ownership, then save user message
  API->>PY: Current question and study context with streaming disabled
  PY->>RAG: Build budgeted context and provenance
  RAG-->>PY: Relevant chunks and memory
  PY->>LLM: Compiled context + current question
  LLM-->>PY: Answer
  PY-->>API: Answer + sources + model + retrieval summary
  API->>Cloud: Save completed assistant UI message
  API-->>UI: AI SDK text and context-metadata stream parts
  UI-->>Student: Markdown answer + exam tip + collapsible sources
  opt Python unavailable and fallback enabled
    API->>API: Use Lovable AI Gateway
    API-->>UI: Stream answer without Python sources
  end
```

## 10. Planner journey

Recurring event CRUD, conflicts, views, and planned AI study plans.

Standalone: [`10-planner.mmd`](wireframes/10-planner.mmd)

```mermaid
flowchart TD
  Open[Open /planner] --> Events[Read PlannerEvent records]
  Events --> Expand[occurrencesInRange\ncalendar-safe recurrence expansion]
  Expand --> Views[Timetable Day Month List]
  Expand --> Totals[Classes exams study activity totals]
  Expand --> Conflict[Detect overlapping events]
  Views --> Interact[Select drag add edit duplicate complete delete]
  Interact --> Scope{Recurring event?}
  Scope -->|No| Series[Update event]
  Scope -->|Yes one| Override[Store occurrence override or exception]
  Scope -->|Yes future| Split[End head and create tail series]
  Scope -->|Yes all| Series
  Series --> Store[(Browser storage\nIMPLEMENTED LOCAL)]
  Override --> Store
  Split --> Store
  Generate[Generate study plan action\nPLANNED] -.-> Context[Send exams + free slots + limits]
  Context -.-> Python[POST /api/study-plan/generate]
  Python -.-> Review[Review proposal; no automatic write]
  Review -.-> Confirm[Student confirms]
  Confirm -.-> Store
```

## 11. Materials journey

Local material records and the planned indexed-document pipeline.

Standalone: [`11-materials.mmd`](wireframes/11-materials.mmd)

```mermaid
flowchart TD
  Panel[MaterialsPanel on subject workspace] --> LocalList[Local user files links and notes]
  LocalList --> CRUD[Add edit archive delete restore]
  CRUD --> Local[(Browser storage\nIMPLEMENTED LOCAL)]
  Panel -. planned merge .-> BackendList[Indexed corpus materials]
  BackendList -.-> GET["GET /api/subjects/{id}/materials\nPLANNED"]
  Upload[Choose PDF DOCX MD or TXT\nPLANNED UI WIRING] -.-> Import[POST /api/import/document multipart\nPLANNED]
  Import -.-> Parse[Python parse and normalize]
  Parse -.-> Chunk[Chunk + embed + index]
  Chunk -.-> Store[(Python SQLite/vector index)]
  Store -.-> BackendList
  Import -. success .-> Status[Indexed status pages chunks warnings]
  Import -. parse failure .-> Review[Keep item visible as Needs review]
  Text[POST /api/context/documents/text\nIMPLEMENTED BACKEND] --> Chunk
  Transcript[TranscriptImportDialog\nsimulated OCR review confirm] --> Assessments[Local assessments only\nIMPLEMENTED]
```

## 12. Quiz, exam, and grading journeys

The planned AI study tools and the frontend grading boundary.

Standalone: [`12-ai-study-tools.mmd`](wireframes/12-ai-study-tools.mmd)

```mermaid
flowchart TD
  Subject[Subject workspace] --> Quiz[Generate quiz\nPLANNED]
  Subject --> Exam[Generate mock exam\nPLANNED]
  Subject --> Grade[Grade answer\nPLANNED]
  Quiz -.-> QAPI[POST /api/quiz/generate]
  Exam -.-> EAPI[POST /api/mock-exam/generate]
  Grade -.-> GAPI[POST /api/grade]
  QAPI -.-> Retrieve[Python retrieves goals and materials]
  EAPI -.-> Retrieve
  GAPI -.-> Rubric[Python retrieves rubric and references]
  Retrieve -.-> Model[Ollama or vLLM]
  Rubric -.-> Model
  Model -.-> QuizUI[Quiz questions + sources]
  Model -.-> ExamUI[Exam questions + points + rubrics]
  Model -.-> Result[Points + strengths + gaps + advice + sources]
  QuizUI -.-> Answers[Student answers and sees score]
  ExamUI -.-> Grade
  Result -.-> Formula[Exact grade = 1 + 5 times points / max\nclamped 1 to 6]
  Formula -.-> Display[Frontend rounds to 0.5 and marks below 4.0]
  Display -.-> Confirm{Save as practice assessment?}
  Confirm -. yes .-> Local[(Browser storage via AppDataProvider)]
```

## 13. Statistics journey

How local assessments become subject, yearly, and trend views.

Standalone: [`13-statistics.mmd`](wireframes/13-statistics.mmd)

```mermaid
flowchart TD
  Open[Open /stats] --> Year[Selected academic year]
  Year --> Filter[Filter local assessments]
  Filter --> Summary[summariseYear]
  Filter --> Monthly[monthlySeries]
  Filter --> Rows[Test table filtered by subject]
  Summary --> Subjects[summariseSubjectView for 15 top-level subjects]
  Subjects --> SPF[SPF Biology and Chemistry combined once]
  SPF --> YearAverage[Mean of rounded subject averages]
  Summary --> KPI[Average test count high low]
  Monthly --> Trend[Average-over-time chart]
  Subjects --> Compare[Subject comparison]
  Rows --> CRUD[Edit duplicate move delete assessments]
  CRUD --> Store[(Browser storage\nIMPLEMENTED LOCAL)]
  Store --> Filter
  YearAverage --> Failing{Grade below 4.0?}
  Failing -->|Yes| Orange[Warning styling]
  Failing -->|No| Standard[Normal styling]
```

## 14. Supporting screens

Profile, settings, demo, help, feedback, diagnostics, notifications, and links.

Standalone: [`14-supporting-screens.mmd`](wireframes/14-supporting-screens.mmd)

```mermaid
flowchart TD
  Profile["/profile"] --> ProfileData[Edit student profile + academic year\nIMPLEMENTED LOCAL]
  ProfileData --> Local[(Browser storage)]
  Settings["/settings"] --> Toggles[Exam reminders daily summary Apple sync sound\nPROTOTYPE UI ONLY]
  Settings -.-> Model[Backend mode and model status\nPLANNED]
  Demo[Demo Mode toggle] --> DemoData[Switch between user state and fresh demo state\nIMPLEMENTED LOCAL]
  Help["/help"] --> Static[Static help content\nIMPLEMENTED]
  Feedback["/feedback"] --> Form[Form and success toast\nIMPLEMENTED UI ONLY]
  Form -.-> FeedbackAPI[POST /api/feedback + local retry queue\nPLANNED]
  Diagnostics["/diagnostics"] --> Simulated[All services nominal\nCURRENTLY SIMULATED]
  Diagnostics -.-> Health[GET /health + GET /api/model/status\nBACKEND IMPLEMENTED; FRONTEND WIRING PLANNED]
  Notifications[NotificationCenter] --> Derived[Derived from local exams and deadlines\nIMPLEMENTED LOCAL]
  SchoolLinks[SchoolLinksSection] --> LinkCRUD[Open add edit duplicate reorder delete\nIMPLEMENTED LOCAL]
  LinkCRUD --> Local
```

## 15. Offline and fallback behavior

What remains available when cloud, Python, or model services are unavailable.

Standalone: [`15-offline-fallback.mmd`](wireframes/15-offline-fallback.mmd)

```mermaid
flowchart TD
  Start[App operation] --> Cloud{Lovable Cloud reachable?}
  Cloud -->|No before sign-in| AuthBlocked[Protected pages unavailable]
  Cloud -->|Session already valid| LocalScreens[Local screens may remain usable]
  Cloud -->|Yes| Gate[Authentication and chat history available]
  Gate --> Python{Python backend reachable?}
  Python -->|Yes| AI[Context-backed chat works]
  Python -->|No| Fallback{Opt-in Lovable fallback enabled?}
  Fallback -->|Yes| Gateway[Cloud AI answer\nIMPLEMENTED OPTIONAL]
  Fallback -->|No| Error[Chat returns clear 503\nIMPLEMENTED]
  Python -. future health UI .-> Banner[Non-blocking offline banner + Retry\nPLANNED]
  Banner -.-> Disable[Disable AI-only actions\nPLANNED]
  Error --> Continue[School grades stats planner profile links demo remain local]
  Disable --> Continue
  Continue --> Store[(Browser storage)]
  ModelDown{Model unavailable but FastAPI reachable} --> Degraded["/health returns degraded"]
  Degraded -. planned UI .-> Banner
```

## Source-of-truth index

| Concern | Primary source |
| --- | --- |
| Route IDs and screen ownership | `frontend/src/routes/**`, `docs/ROUTE_SCREEN_MAP.md` |
| Root providers and app shell | `frontend/src/routes/__root.tsx`, `frontend/src/components/app/AppShell.tsx` |
| Navigation | `frontend/src/components/app/AppHeader.tsx`, `frontend/src/components/app/MobileNavigation.tsx` |
| Local state and recurrence | `frontend/src/lib/store/app-data.tsx`, `frontend/src/lib/date-utils.ts` |
| Subject model and SPF mapping | `frontend/src/lib/mock/subjects.ts`, `docs/SUBJECT_MODEL_AND_LANGUAGE_RULES.md` |
| Swiss grade calculations | `frontend/src/lib/grade-math.ts`, `frontend/src/lib/mock/grades.ts` |
| Chat UI and transport | `frontend/src/components/StudyChat.tsx` |
| Cloud thread/message operations | `frontend/src/lib/chat.functions.ts`, `frontend/src/routes/api/chat.ts` |
| Python bridge | `frontend/src/lib/context-backend.server.ts` |
| Python API and context pipeline | `backend/app/main.py`, `backend/app/context/**` |
| Current versus future ownership | `docs/STATE_AND_STORAGE.md`, `docs/UI_BACKEND_MAPPING.md` |

## Change checklist for coding agents

- Update a route by editing its file under `frontend/src/routes/`; never edit
  `frontend/src/routeTree.gen.ts`.
- Preserve the `_authenticated` layout gate for every protected screen.
- Keep non-AI screens usable when the Python backend is offline.
- Do not move local prototype data or cloud chat persistence without an explicit migration decision.
- Do not count SPF Biology and SPF Chemistry as two top-level subjects.
- Do not duplicate chat writes between the TanStack route and Python.
- Mark new diagram paths as implemented only after the corresponding UI and API path works end to end.
