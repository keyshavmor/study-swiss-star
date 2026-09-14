Document status: CURRENT
Generated from: current Lovable project · GitHub main (keyshavmor/study-swiss-star) · live Supabase project ucacmeadsufiedxrgqit
Last verified: 2026-09-14 (UTC)
Frontend commit: e0ef3464557d4786d214accb0d1bf44082ae3466

# Backend Gap Matrix

"Backend implementation verified" is UNKNOWN everywhere below because FACTS.md verifies no backend implementation (no backend source in this repo/sandbox).

| Feature | Frontend exists | Supabase exists | Backend contract defined | Backend implementation verified | Codex action |
|---|---|---|---|---|---|
| Message-language override sent to backend | NO (only client-side `effectiveResponseLanguage`, `frontend/src/lib/i18n/detect.ts`) | N/A | NO | UNKNOWN | Define a request field (e.g. `response_language_hint`) and consume it |
| Audio response generation (server TTS) | NO (browser-only `speechSynthesis`, `frontend/src/lib/speech.ts`) | N/A | NO | UNKNOWN | Define an audio contract if server-side TTS is desired |
| Browser speech fallback | YES (`speechSupported()`, `assistant.audio.unsupported` copy) | N/A | N/A (client-only) | N/A | None — working as designed |
| Context management / budgeting | PARTIAL (sends `academicYear`/`gradeLevel`/`subject_id`, no truncation logic) | N/A | PARTIAL (inputs only) | UNKNOWN | Document backend-side budgeting behaviour |
| Document ingestion | NO explicit upload-to-ingestion flow found; `documents`/`document_chunks` read defensively | YES (`user-materials` bucket, `documents` table) | NO | UNKNOWN | Define ingestion endpoint/contract |
| RAG (retrieval + reranking) | YES (consumes `sources[]`, `retrieval_summary`) | N/A | YES (response shape fixed) | UNKNOWN | Verify backend implementation against `ContextChatResponse` |
| Subject chat | YES (`StudyChat.tsx`, `/api/chat`) | YES (`threads`, `messages`) | YES (`FRONTEND_BACKEND_CONTRACT.md`) | UNKNOWN | Verify implementation, add integration tests |
| General Assistant | YES (`AssistantChat` route family, `assistant-data.ts`) | YES (`assistant_threads/messages/attachments`) | NO (no endpoint call for assistant replies) | UNKNOWN | Define assistant-reply contract |
| Study plans | PARTIAL (referenced only in chat copy) | N/A (no dedicated table) | NO | UNKNOWN | Define structured study-plan contract if needed, or confirm free-text-via-chat is sufficient |
| Grading | YES for manual grade entry (`stats.tsx`, `grade-math.ts`) | YES (grades data, exact table not in FACTS.md table list) | N/A (no AI grading contract) | UNKNOWN | Confirm whether AI-assisted grading is in scope |
| Mock exams / quizzes | PARTIAL (chat copy mentions quizzes only) | N/A | NO | UNKNOWN | Define structured quiz contract if needed |
| Memory (student memory across sessions) | NO | N/A | NO | UNKNOWN | Define if in scope; not implied by current UI |
| Web retrieval | YES (`allow_web:true` flag sent) | N/A | PARTIAL (flag only, no source-type contract) | UNKNOWN | Confirm web source shape reuses `sources[].url` |
| Media descriptor creation | YES (frontend enqueues rows expecting a descriptor path) | YES (`media_retention_queue`, `assistant-descriptors` bucket) | PARTIAL (row shape defined, generation process not) | UNKNOWN | Implement descriptor generation + upload before deletion |
| Media retention enqueue | YES (`enqueueAssistantMedia`, `frontend/src/lib/media-retention.ts`) | YES (`media_retention_queue` table) | YES (row shape + 30-min `delete_after`) | UNKNOWN | Implement the 30-minute cleanup worker |
| Google Calendar backend requirements | YES (frontend calls Google directly) | PARTIAL (Supabase only brokers OAuth identity link) | N/A (backend not involved today) | N/A | None required unless a server-side Calendar proxy is later desired |
| Telemetry / error integration | YES (`telemetry.ts` → `activity-log` Edge Function) | YES (`usage_events` table, `activity-logs` bucket) | YES (sanitised payload shape) | UNKNOWN (Edge Function internals not machine-verified) | Verify Edge Function persists exactly the sanitised shape |
