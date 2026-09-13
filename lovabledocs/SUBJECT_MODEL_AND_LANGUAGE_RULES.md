# Subject Model & Language Rules

Authoritative definition of the subject model shared by the frontend and the Python backend.
Frontend source of truth today: `src/lib/mock/subjects.ts` (field `slug`), grouping logic in
`src/lib/grade-math.ts` (`summariseSubjectView`, `summariseYear`).

## 1. The 15 top-level subjects

The School dashboard shows exactly these 15 cards, in this order.

| # | Display name | Stable `subject_id` | Instruction language | Notes |
| --- | --- | --- | --- | --- |
| 1 | Mathematics | `mathematics` | English | |
| 2 | Physics | `physics` | English | |
| 3 | English | `english` | English | |
| 4 | History | `history` | English | |
| 5 | French | `french` | French | Simple French, CEFR **B1** |
| 6 | German | `german` | German | |
| 7 | Biology | `biology` | German | Regular (non-SPF) Biology |
| 8 | Chemistry | `chemistry` | German | Regular (non-SPF) Chemistry |
| 9 | SPF Biology & Chemistry | `spf` | German | **Combined subject** |
| 10 | Philosophy | `philosophy` | German | |
| 11 | Political Education | `political-education` | German | |
| 12 | Pedagogics and Psychology | `pedagogics-psychology` | German | |
| 13 | Economics | `economics` | German | |
| 14 | Art | `art` | German | |
| 15 | Sport | `sport` | German | |

## 2. Component subject IDs (not top-level cards)

| `component_subject_id` | Parent | Display label | Language |
| --- | --- | --- | --- |
| `spf-biology` | `spf` | Biology (SPF) | German |
| `spf-chemistry` | `spf` | Chemistry (SPF) | German |

`spf-biology` and `spf-chemistry` **must never** be rendered as top-level subject cards and must
never be counted separately in the yearly average. They exist only:

- as the two workspaces behind the segmented switch on `/school/spf`;
- as the two component averages displayed under the combined header average;
- as `component_subject_id` on AI requests, so RAG retrieval is scoped to the right corpus.

## 3. SPF combined-subject behaviour

| Rule | Behaviour |
| --- | --- |
| Card count | One card: "SPF Biology & Chemistry". |
| Displayed grade | `(avg(spf-biology) + avg(spf-chemistry)) / 2` — the average of the **component averages**, not of all assessments pooled. |
| Missing component | If one component has no assessments, the combined average equals the other component's average. If both are empty, the average is `null` and the card shows the empty state. |
| Decimals | The subject header shows the combined average to **2 decimals**; card/list display follows the normal Swiss rounding rules. |
| Yearly average | SPF counts as **exactly one** subject entry, using the combined value. |
| Subject dashboard | Shows the combined header average plus both component averages, with a Biology / Chemistry segmented switch. |
| Stats page | Offers a three-way toggle: Combined \| Biology \| Chemistry. |

Swiss grade rules that apply everywhere: 6-point scale, pass at **4.0**, point-based grades use
`points / max_points * 5 + 1`, displayed averages round to the nearest **0.5**, grades below 4.0
render in warning orange `#C96A00`.

## 4. Naming responsibilities

| Concern | Owner | Rule |
| --- | --- | --- |
| Subject IDs | Shared contract | Lowercase frontend slugs (hyphenated where the source uses hyphens), exactly as above. |
| Python backend | Backend | Uses `subject_id` / `component_subject_id` as SQLite retrieval keys. The chat proxy maps known display names to the existing frontend slugs. |
| Frontend display | Frontend | Renders the human label from `src/lib/mock/subjects.ts` (later `GET /api/subjects`). Never renders raw IDs. The backend may return a `display_name`, but the frontend label wins for UI consistency. |
| Slugs in URLs | Frontend | `/school/$subject` uses the same stable ID as the slug, so URLs and API IDs match 1:1. |

## 5. Language rules for AI requests

Every AI request carries an explicit `language`. The backend must answer in that language and must
not switch based on the language of the student's question unless the student explicitly asks.

| Language value | Subjects | Backend expectation |
| --- | --- | --- |
| `de` | German, Biology, Chemistry, SPF Biology & Chemistry, Philosophy, Political Education, Pedagogics and Psychology, Economics, Art, Sport | Answer in German, Swiss Gymnasium register, Grade 11 vocabulary. |
| `en` | Mathematics, Physics, English, History | Answer in English. |
| `fr` | French | Answer in **simple French at CEFR B1**; short sentences, common vocabulary, optional English gloss for hard terms. |

UI chrome (buttons, labels, states) stays in English regardless of subject language.

## 6. Required context fields on subject-specific AI requests

Every call to `/api/chat`, `/api/quiz/generate`, `/api/mock-exam/generate`, `/api/grade` and
`/api/study-plan/generate` must include:

| Field | Type | Required | Example | Meaning |
| --- | --- | --- | --- | --- |
| `subject_id` | string | yes | `"spf"` | Top-level subject. |
| `component_subject_id` | string \| null | only for SPF | `"spf-chemistry"` | Active component workspace. `null` for all other subjects. |
| `language` | `"de" \| "en" \| "fr"` | yes | `"de"` | Answer language, from the table above. |
| `academic_year` | string | yes | `"2026-27"` | From `AcademicYearProvider`. |
| `grade_level` | number | yes | `11` | From the student profile. |
| `learning_goal_id` | string \| null | optional | `"lg_spf_chem_04"` | Scopes retrieval to one goal. |
| `material_ids` | string[] | optional | `["mat_123"]` | Restricts retrieval to selected materials. |

Retrieval scoping rule: when `component_subject_id` is present, retrieve from that component only;
otherwise retrieve from `subject_id`. The current standalone chat creates free-text subjects and
does not expose the SPF component switch, so combined SPF retrieval is a remaining subject-page
integration item.
