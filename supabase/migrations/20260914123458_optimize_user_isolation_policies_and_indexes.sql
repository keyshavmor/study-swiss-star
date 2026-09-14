-- Historical target migration: optimize chat RLS and ownership lookup paths.
-- This file mirrors migration history already present on ucacmeadsufiedxrgqit.

drop policy if exists "Users can manage their own threads" on public.threads;
create policy "Users can manage their own threads"
  on public.threads
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can manage their own messages" on public.messages;
create policy "Users can manage their own messages"
  on public.messages
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create index if not exists threads_user_id_idx
  on public.threads(user_id);

create index if not exists messages_user_id_idx
  on public.messages(user_id);

create index if not exists messages_thread_id_user_id_idx
  on public.messages(thread_id, user_id);
