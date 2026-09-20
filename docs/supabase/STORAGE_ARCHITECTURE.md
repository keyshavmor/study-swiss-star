# Storage Architecture

Status: CURRENT — LIVE VERIFIED READ-ONLY 2026-09-20

All buckets are private.

| Bucket | Limit | MIME allow-list | Ownership/access |
|---|---:|---|---|
| `activity-logs` | 256 KiB | text/plain, application/json | function writes; admin reads |
| `assistant-descriptors` | 1 MiB | text/plain, text/markdown, application/json | trusted producer writes; owner reads |
| `chat-attachments` | 50 MiB | approved PDF/DOCX/images/audio/video | owner path CRUD |
| `feedback-messages` | 1 MiB | text/plain | function writes; admin reads |
| `peer-message-attachments` | 250,000 B | reviewed compressed image/file set | trusted backend writes after scan/moderation; active conversation members read |
| `profile-avatars` | 2 MiB | PNG/JPEG/WebP | owner path CRUD |
| `user-materials` | 50 MiB | PDF/DOCX/text/markdown/PNG/JPEG/SVG | owner path CRUD |

User paths begin `<auth.uid()>/`; Storage policies compare the first folder segment. Upserts on the three owner-CRUD buckets have INSERT, SELECT, and UPDATE coverage.

FastAPI downloads only `user-materials/<verified-user-id>/...` through the authenticated Storage endpoint with publishable key plus caller JWT. Temporary files are deleted after indexing. Google provider tokens and Calendar content never enter Storage.

Global capacity cleanup runs every five minutes through a Vault-authenticated Edge Function. It
starts at 90% used, targets 80% used, and removes eligible objects through the Storage API before
deleting associated document/attachment metadata. It is not governed by a user preference.

The combined per-user durable-data limit is 50 MiB across database rows and
Storage. Client-side preflight is advisory; Storage policies and database
triggers/RPCs are the final concurrent-write boundary. Peer attachment input is
untrusted until the local backend has validated content, scanned it, moderated
the message, and performed the privileged write.
