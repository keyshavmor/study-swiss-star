# UI documentation

| Field | Value |
|---|---|
| Owner | UI and frontend |
| Status | `CURRENT — FRONTEND`; backend columns use explicit gap labels |
| Canonical path | `docs/ui/README.md` |
| Verified against | frontend `f0910e6971f12efe0ad547b904f6e2a518b13856` |
| Last reviewed | 2026-09-18 |

[Control-to-system matrix](CONTROL_TO_SYSTEM_MATRIX.md) is the canonical
feature/control ownership index. It maps every meaningful control family from
user intent through frontend state, Supabase/external data, local-backend duty,
result/error behavior, and required proof.

Detailed per-element evidence remains in
[`../frontend/UI_EVENT_TO_SYSTEM_MAP.md`](../frontend/UI_EVENT_TO_SYSTEM_MAP.md).
Wireframes are design/reference evidence under `../wireframes/`; they do not
override executable components or status labels.

UI-wide invariants:

- loading, disabled, empty, success, retry and unavailable are distinct states;
- unknown hardware/progress remains unknown rather than becoming zero;
- AI-unavailable controls issue no AI request;
- safety-required actions fail closed;
- backend/provider errors become bounded localized messages;
- partial cleanup/deletion/retention outcomes never display full success;
- keyboard, focus, label and screen-reader semantics remain part of acceptance.
