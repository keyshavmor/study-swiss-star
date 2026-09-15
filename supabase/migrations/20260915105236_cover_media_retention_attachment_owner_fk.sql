-- The attachment ownership FK is composite, so its covering index must use
-- the same leading column order. The earlier single-column index is redundant
-- once this index exists.
create index if not exists media_retention_queue_attachment_owner_idx
  on public.media_retention_queue (attachment_id, user_id);

drop index if exists public.media_retention_queue_attachment_idx;

