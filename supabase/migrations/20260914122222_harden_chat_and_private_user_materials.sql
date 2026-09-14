-- Historical target migration: harden chat ownership and private uploads.
-- This file mirrors migration history already present on ucacmeadsufiedxrgqit.

alter table public.threads
  add constraint threads_id_user_id_key unique (id, user_id);

alter table public.messages
  drop constraint if exists messages_thread_id_fkey;

alter table public.messages
  add constraint messages_thread_owner_fkey
  foreign key (thread_id, user_id)
  references public.threads(id, user_id)
  on delete cascade;

create or replace function public.update_thread_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.threads
  set updated_at = now()
  where id = new.thread_id
    and user_id = new.user_id;
  return new;
end;
$$;

revoke all on function public.update_thread_updated_at() from public;
revoke all on function public.update_thread_updated_at() from anon;
revoke all on function public.update_thread_updated_at() from authenticated;
grant execute on function public.update_thread_updated_at() to service_role;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke all on function public.rls_auto_enable() from public;
    revoke all on function public.rls_auto_enable() from anon;
    revoke all on function public.rls_auto_enable() from authenticated;
  end if;
end;
$$;

insert into storage.buckets (id, name, public)
values ('user-materials', 'user-materials', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can read own learning materials" on storage.objects;
create policy "Users can read own learning materials"
on storage.objects for select to authenticated
using (
  bucket_id = 'user-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can upload own learning materials" on storage.objects;
create policy "Users can upload own learning materials"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'user-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can update own learning materials" on storage.objects;
create policy "Users can update own learning materials"
on storage.objects for update to authenticated
using (
  bucket_id = 'user-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'user-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can delete own learning materials" on storage.objects;
create policy "Users can delete own learning materials"
on storage.objects for delete to authenticated
using (
  bucket_id = 'user-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
