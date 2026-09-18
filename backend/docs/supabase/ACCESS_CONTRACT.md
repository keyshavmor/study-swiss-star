# 06 — Local backend ↔ Supabase contract

| Field | Value |
|---|---|
| Owner | Backend and Supabase |
| Status | Current user-token pattern plus explicitly listed gaps |
| Canonical path | `backend/docs/supabase/ACCESS_CONTRACT.md` |
| Verified | Prompt 03 auth and caller-token tests, 2026-09-18 |

## Identity model

The local backend verifies the Supabase bearer token and derives the user only
from `claims.sub`. It rejects missing/invalid tokens and mismatched
`X-Student-Id`. Token verification must validate issuer/project, signature,
expiry and key rotation; user-editable metadata is never authorization. The
production verifier uses the configured publishable key plus bearer token at
Supabase Auth `/user`, matching current Supabase guidance for shared-secret
projects and remaining valid for project-issued access tokens.

## Ordinary user access

`backend/app/context/store_supabase.py` calls
the REST API with the user's access token plus publishable key and adds verified
`user_id` filters. This preserves RLS for chunks, memories, events, messages,
summaries, artifacts and working memory. Continue this pattern for ordinary
user-owned data.

Private `user-materials` downloads likewise use the caller token, require the
`<claims.sub>/` prefix, URL-encode the object, and delete local temporary files.
Bounded size, content sniffing, parser sandboxing and deletion hooks remain
hardening work; the caller-token/owner-prefix/temporary-cleanup boundary is
current.

## Privileged operations

Safety-strike application, peer-message persistence after moderation, guardian
queues, scheduled retention/emergency cleanup, and some data-right workflows may
require a server/worker secret or privileged RPC. Keep that client in a separate
module/process, never browser reachable, and perform independent user/resource
authorization before every call. Log only sanitized audit metadata.

## Required object mapping

| Backend concern | Supabase objects |
|---|---|
| Subject chat | `threads`, `messages` (frontend currently persists turns) |
| Context/RAG | `documents`, `document_chunks`, `student_memories`, `learning_events`, `conversation_summaries`, `context_artifacts`, `working_memory`, `user-materials` |
| Assistant | `assistant_threads/messages/attachments`, `chat-attachments` |
| Models/policy | read-only `ai_model_catalog`, runtime/admission policy RPCs; never store readiness |
| Assessment | quiz/exam/attempt/grading/study-plan tables; private answer-key storage must be server-only |
| Safety/messaging | moderation/guardian tables, peer conversation/message/attachment/notification objects |
| Media lifecycle | `media_retention_queue`, `assistant-descriptors`, source media bucket |
| Quota/health | quota RPCs, user-visible health RPC, Storage metadata |
| Privacy | data-summary and deletion RPCs plus local-state erasure |

## Current gaps

- Backend does not implement live model/admission/safety/peer/assessment/media
  contracts.
- Backend's single-model status does not reconcile with the live catalogue.
- Backend has no durable operation/lease/queue store or TTL sweepers.
- Assistant generation and attachment parsing are absent.
- Context tables are supported, but exact live schema/type drift must be tested
  after forward migration reconciliation.
- Delete-my-data/account workflows do not yet erase local caches, embeddings,
  artifacts, leases, operations, downloads and temporary files.

## Security rules

- RLS plus grants, not service-role convenience, is the default boundary.
- Every user-owned object path/table predicate uses verified identity.
- Service workers have least privilege and idempotent/resumable jobs.
- Storage and database quota are checked before and atomically at write.
- `SECURITY DEFINER` functions require restricted execute grants, caller checks,
  safe search paths and review.
- Account deletion must revoke sessions; deleting an auth user alone does not
  invalidate existing tokens immediately.
- Model catalogue data is configuration input, never an executable URL/path/
  flag. Resolve IDs through a backend allowlist.

## Verification

Use two test users plus service fixtures. Test user A/B isolation for every store
method, RPC and bucket; spoofed identifiers; direct REST bypass; Storage path
traversal/upsert; secret absence from bundles/logs; quota concurrency; privileged
RPC denial; deletion completeness/retry; and live-generated TypeScript/Python
contract agreement.
