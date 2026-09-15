# Storage Architecture

Status: CURRENT — LIVE VERIFIED 2026-09-15

All buckets are private.

| Bucket | Limit | MIME allow-list | Ownership/access |
|---|---:|---|---|
| `activity-logs` | 256 KiB | text/plain, application/json | function writes; admin reads |
| `assistant-descriptors` | 1 MiB | text/plain, text/markdown, application/json | trusted producer writes; owner reads |
| `chat-attachments` | 50 MiB | approved PDF/DOCX/images/audio/video | owner path CRUD |
| `feedback-messages` | 1 MiB | text/plain | function writes; admin reads |
| `profile-avatars` | 2 MiB | PNG/JPEG/WebP | owner path CRUD |
| `user-materials` | 50 MiB | PDF/DOCX/text/markdown/PNG/JPEG/SVG | owner path CRUD |

User paths begin `<auth.uid()>/`; Storage policies compare the first folder segment. Upserts on the three owner-CRUD buckets have INSERT, SELECT, and UPDATE coverage.

FastAPI downloads only `user-materials/<verified-user-id>/...` through the authenticated Storage endpoint with publishable key plus caller JWT. Temporary files are deleted after indexing. Google provider tokens and Calendar content never enter Storage.
