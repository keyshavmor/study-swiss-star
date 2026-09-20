-- Run only against a disposable local database after all migrations:
--   supabase test db supabase/tests/security_contract.sql
-- This catalog test is read-only and rolls back its assertion helper.
begin;

create or replace function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin
  if not coalesce(value, false) then
    raise exception 'Security contract assertion failed: %', message;
  end if;
end;
$$;

select pg_temp.assert_true(
  not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  ),
  'every exposed public table has RLS enabled'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'
  ),
  'anon has no direct public-table grants'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.prosecdef
      -- anon receives privileges granted directly or through PostgreSQL's
      -- implicit PUBLIC role, so this one check covers both cases.
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  ),
  'no SECURITY DEFINER function is executable by PUBLIC or anon'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.prosecdef
      and coalesce(array_to_string(p.proconfig, ','), '') ~ 'search_path=(public|storage)(,|$)'
  ),
  'SECURITY DEFINER functions do not resolve untrusted public/storage names'
);

select pg_temp.assert_true(
  not exists (select 1 from storage.buckets where public),
  'all application Storage buckets are private'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from storage.buckets
    where id in (
      'profile-avatars',
      'user-materials',
      'chat-attachments',
      'peer-message-attachments',
      'feedback-messages',
      'activity-logs',
      'assistant-descriptors'
    )
      and file_size_limit is null
  ),
  'every known private bucket has an explicit size ceiling'
);

select pg_temp.assert_true(
  not has_function_privilege('authenticated', 'public.service_delete_all_user_content(uuid)', 'EXECUTE')
  and not has_function_privilege(
    'authenticated',
    'public.service_delete_user_range(uuid,timestamp with time zone,timestamp with time zone,boolean,boolean)',
    'EXECUTE'
  ),
  'authenticated users cannot invoke service deletion RPCs directly'
);

rollback;
