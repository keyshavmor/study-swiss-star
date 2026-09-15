# Storage Lifecycles

Status: CURRENT — LIVE VERIFIED 2026-09-15

## User materials

The current Materials UI remains metadata/local-state behavior and does not claim indexing. The implemented backend endpoint `POST /api/context/documents/storage` accepts an existing private object path, enforces the verified user prefix, downloads with caller JWT, writes a temporary file, chunks/embeds/persists it, and deletes the temporary file in `finally`. A true browser upload-to-index action is not wired.

## Assistant attachments

`frontend/src/lib/assistant-data.ts` uploads validated attachments to `chat-attachments/<uid>/...` and writes `assistant_attachments`. General Assistant generation and attachment parsing remain deferred.

## Generated media retention

The invariant is descriptor first, deletion second:

1. a producer stores the original media;
2. it successfully creates and privately stores a textual descriptor;
3. it enqueues a row and transitions it to `ready`;
4. only after `delete_after` (default 30 minutes) may cleanup consider it;
5. the deployed function confirms the descriptor object exists before removing the original;
6. failures remain deferred with an `error_code`; successes become `deleted` with `deleted_at`.

The function processes at most 100 ready rows per invocation. An active Vault-authenticated cron calls it every minute. There is currently no media-producing backend path, so the infrastructure has no active producer.
