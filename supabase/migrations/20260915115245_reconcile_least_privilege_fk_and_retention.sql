-- Forward-only reconciliation from the 2026-09-15 live advisor and grants audit.
-- Browser clients use row operations through PostgREST; they never need table
-- TRUNCATE, REFERENCES, or TRIGGER privileges.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- These resources always require an authenticated owner. Removing anonymous
-- table grants makes that boundary explicit in addition to RLS.
revoke all privileges on table
  public.assistant_threads,
  public.assistant_messages,
  public.assistant_attachments,
  public.media_retention_queue
from anon;

grant select, insert, update, delete on table
  public.assistant_threads,
  public.assistant_messages,
  public.assistant_attachments
to authenticated;

revoke update, delete on table public.media_retention_queue from authenticated;
grant select, insert on table public.media_retention_queue to authenticated;

-- Cover the exact column order of the composite foreign keys identified by
-- the Supabase database advisor.
create index if not exists assistant_attachments_message_owner_idx
  on public.assistant_attachments (message_id, user_id);
create index if not exists assistant_attachments_thread_owner_idx
  on public.assistant_attachments (thread_id, user_id);
create index if not exists assistant_messages_thread_owner_idx
  on public.assistant_messages (thread_id, user_id);
create index if not exists media_retention_queue_attachment_idx
  on public.media_retention_queue (attachment_id);

-- A user-owned queue row must never be able to make the trusted cleanup worker
-- delete another user's object, even if an opaque object path or attachment ID
-- is guessed. The live table was empty when these constraints were prepared.
alter table public.media_retention_queue
  add constraint media_retention_object_path_owner_check
    check (object_path like user_id::text || '/%'),
  add constraint media_retention_descriptor_path_owner_check
    check (descriptor_path like user_id::text || '/%');

alter table public.assistant_attachments
  add constraint assistant_attachments_id_user_unique unique (id, user_id);

alter table public.media_retention_queue
  drop constraint media_retention_queue_attachment_id_fkey,
  add constraint media_retention_queue_attachment_owner_fkey
    foreign key (attachment_id, user_id)
    references public.assistant_attachments (id, user_id)
    on delete set null (attachment_id);
