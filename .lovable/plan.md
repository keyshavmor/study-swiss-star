# Full UI, Frontend, and Backend Wireframe Pack

## Goal
Create a coding-agent-friendly diagram pack that explains how every major screen works, where its data comes from, and how user actions travel through the frontend, cloud services, and local Python backend.

## Deliverables
- Add a master Markdown document containing Mermaid diagrams that remain readable in GitHub and coding tools.
- Add standalone Mermaid files for the overall system and each major feature journey, so individual diagrams can be opened or shared separately.
- Link the new diagram pack from the existing frontend handoff index.
- Keep all diagrams documentation-only; no application behavior or UI code will change.

## Diagram Set
1. **System overview** — browser UI, TanStack routes, shared providers, local browser storage, Lovable Cloud authentication/chat storage, `/api/chat`, Python FastAPI, retrieval/index, files, and Ollama/vLLM.
2. **Route and navigation map** — public entry/authentication, protected shell, every application page, dynamic subject and chat routes, desktop/mobile navigation.
3. **Frontend composition** — root providers, authenticated gate, app shell, route screens, reusable feature components, and AI Elements chat primitives.
4. **State ownership map** — static subject definitions, derived grade calculations, local browser data, cloud-persisted chat data, and Python-owned AI/context data.
5. **Authentication journey** — opening a protected page, session validation, sign-in, redirect, and sign-out.
6. **Home journey** — profile/year context, clock, next exam, study time, notifications, and school links.
7. **School and grades journey** — 15 subject cards, filtering/sorting, assessment CRUD, Swiss grading, yearly statistics, and failing-grade presentation.
8. **Subject workspace journey** — subject navigation, grades, materials, learning goals, and AI study tools; includes the combined SPF Biology/Chemistry switch and calculation boundary.
9. **Chat journey** — thread creation/loading, route-derived thread ID, authenticated request, message persistence, Python context retrieval, model response, sources, exam tip, and optional Lovable fallback.
10. **Planner journey** — local event CRUD, recurrence/conflict calculation, availability, AI study-plan proposal, review, and editable insertion.
11. **Materials journey** — local links/notes versus backend-indexed documents, import states, parsing, chunking, retrieval indexing, and failure handling.
12. **Quiz, mock exam, and grading journeys** — request context, retrieval, model generation/evaluation, Swiss grade formula, review, and optional save to local assessments.
13. **Stats journey** — local assessment aggregation, SPF counted once, exact and rounded values, trends, and display components.
14. **Profile, settings, demo, help, feedback, and diagnostics journeys** — ownership and interactions for supporting screens, including backend health/model status.
15. **Offline and fallback behavior** — which screens continue working when Python or cloud AI is unavailable, and which actions become disabled or fall back.

## Accuracy Rules
- Clearly label every node and connection as **implemented now**, **local-only**, **cloud-backed**, or **planned/not yet wired**.
- Use exact current route names, stable subject IDs, component names, API endpoints, and storage owners from the repository.
- Preserve the distinction between the current implemented chat path and future Python-backed quiz, exam, grading, study-plan, feedback, health, and material flows.
- Show that the frontend remains authoritative for the 15-subject model, SPF combination, Swiss grade rounding, and failing-grade styling.
- Show that authentication and chat history currently stay in Lovable Cloud, while grades, planner events, profile, school links, demo mode, and user-added prototype materials remain in browser storage.

## Verification
- Validate every Mermaid block for syntax.
- Cross-check routes, components, endpoints, storage ownership, and implemented/planned labels against the source and existing handoff documents.
- Confirm the handoff index links to the new pack and that no application source files were modified.
