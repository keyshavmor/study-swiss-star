# Open Questions for the Backend

Contract decisions that must be answered before or during implementation. Each has a recommended
default so work can proceed if no answer arrives.

| # | Question | Why it matters | Recommended default |
| --- | --- | --- | --- |
| 1 | Should chat thread/message persistence stay in Supabase or move to Python? | Two writers would duplicate transcripts; moving breaks cross-device history | **Stay in Supabase** (Stage 1). Python stores only AI metadata keyed by `message_id`. |
| 2 | Should `/api/chat` return streaming SSE or plain JSON first? | Streaming is a bigger adapter change | **Plain JSON first** (`stream:false`), SSE as a second step with the same response shape in the `done` event. |
| 3 | Should source snippets appear under every AI answer, or only on request? | Affects layout density and response size | **Always returned** (`include_sources:true`), rendered **collapsed** by default. |
| 4 | Which field uniquely identifies a subject — `subject_id` only, or `subject_id` + `academic_year`? | Determines Chroma collection naming and cross-year corpora | **`subject_id` alone** identifies the corpus; `academic_year` is prompt context only. |
| 5 | How should SPF component requests be represented — `component_subject_id`, or `subject_id: "spf_chemistry"`? | Must not create a 16th top-level subject | **`subject_id: "spf_biology_chemistry"` + `component_subject_id: "spf_chemistry"`.** Backend should reject `spf_biology`/`spf_chemistry` as a top-level `subject_id`. |
| 6 | With SPF and no component specified, retrieve from both corpora or refuse? | Affects answer quality on the combined view | **Retrieve from both** component collections. |
| 7 | Is grade math authoritative in the frontend or the backend? | Divergent rounding would show two different grades | **Backend returns the exact grade** (`points/max*5+1`, clamped 1–6) plus `grade_formula`; **frontend owns rounding to 0.5 and colours**. |
| 8 | Should AI grading results be kept separate from the student's real localStorage grades? | Mixing practice with real grades corrupts averages | **Separate by default.** Saving is explicit, uses `source: "AI practice assessment"`, and `includeInStats` defaults to `false`. |
| 9 | Where do uploaded materials live — frontend, Python local files, or Supabase? | Determines whether uploads are indexable | **Python local files + Chroma** for indexable documents; localStorage keeps links/notes only; no Supabase Storage in Stage 1. |
| 10 | Should the app work without authentication in local demo mode? | Offline local use currently requires a Supabase sign-in | **No change in Stage 1** — auth stays required. If offline use is needed, add an explicit guest route rather than weakening the `_authenticated` gate. |
| 11 | Should backend health be checked at app startup? | Startup latency vs. accurate banner | **Yes** — one `GET /health` on mount (3 s timeout, `retry:false`), then every 60 s on AI screens. |
| 12 | Does the backend need to identify the student? | Multi-student local use, per-student history | Send a non-sensitive `X-Student-Id` (Supabase user id). No JWT verification while bound to `127.0.0.1`. |
| 13 | Who owns learning goals — syllabus files parsed by Python, or manual UI entry? | Determines whether goals are read-only in the UI | **Python-owned and read-only** in Stage 1. |
| 14 | Should quiz/exam/grading history be queryable (`GET /api/quiz/history`)? | Enables a "past practice" view | Not in Stage 1; Python should still persist it so the endpoints can be added later. |
| 15 | What is the timeout/cancellation contract for long generations? | Quiz/exam generation can exceed 60 s | Backend must respond within **120 s** or return 202 + a polling handle. Frontend must be able to cancel. |
| 16 | How are model errors surfaced — 503 or a 200 with an error field? | Determines banner vs. toast behaviour | **HTTP 503 with `code: "model_unavailable"`.** Never a 200 with an empty answer. |
| 17 | Should the backend enforce the language, or trust the `language` field? | Wrong-language answers are a real risk with local models | **Trust and enforce the field**; the backend must not infer language from the question. |
| 18 | Is a French B1 simplification pass required? | French must stay at CEFR B1 | Backend applies a B1 constraint in the system prompt for `language: "fr"`. |
| 19 | Does the frontend ever need direct access to Chroma or the model server? | Security and coupling | **No.** The browser talks only to FastAPI. |
| 20 | When can the Lovable AI Gateway path be removed? | Fallback maintenance cost | Only after Python chat is confirmed working **and** the user explicitly asks. |
