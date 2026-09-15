-- Run with `supabase test db` after applying all local migrations.
begin;

create or replace function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin
  if not coalesce(value, false) then
    raise exception 'RLS assertion failed: %', message;
  end if;
end;
$$;

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'a@example.test', now(), now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'b@example.test', now(), now());

insert into public.profiles (user_id, preferred_name)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'A'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'B');
insert into public.assessments
  (id, user_id, subject_slug, title, assessment_type, assessment_date, academic_year, source)
values
  ('10000000-0000-4000-8000-00000000000a', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'biology', 'A result', 'Written exam', current_date, '2026-27', 'Teacher grade'),
  ('10000000-0000-4000-8000-00000000000b', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'biology', 'B result', 'Written exam', current_date, '2026-27', 'Teacher grade');
insert into public.planner_events
  (id, user_id, title, category, event_date, start_time, end_time)
values
  ('20000000-0000-4000-8000-00000000000a', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'A event', 'Study session', current_date, '10:00', '11:00'),
  ('20000000-0000-4000-8000-00000000000b', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'B event', 'Study session', current_date, '10:00', '11:00');
insert into public.documents (id, user_id, document_type, title)
values
  ('30000000-0000-4000-8000-00000000000a', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'PDF', 'same-name.pdf'),
  ('30000000-0000-4000-8000-00000000000b', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'PDF', 'same-name.pdf');
insert into public.document_chunks (id, document_id, user_id, content, title)
values
  ('31000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'A private chunk', 'same-name.pdf'),
  ('31000000-0000-4000-8000-00000000000b', '30000000-0000-4000-8000-00000000000b', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'B private chunk', 'same-name.pdf');
insert into public.threads (id, user_id, title)
values
  ('40000000-0000-4000-8000-00000000000a', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'A thread'),
  ('40000000-0000-4000-8000-00000000000b', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'B thread');
insert into public.messages (id, thread_id, user_id, role, content)
values
  ('41000000-0000-4000-8000-00000000000b', '40000000-0000-4000-8000-00000000000b', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'user', 'B private message');
insert into public.student_memories (id, user_id, memory_type, content)
values
  ('50000000-0000-4000-8000-00000000000b', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'learning_preference', 'B private memory');
insert into public.quizzes (id, user_id, subject, questions)
values ('60000000-0000-4000-8000-00000000000b', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'biology', '[]');
insert into public.mock_exams (id, user_id, subject, questions)
values ('70000000-0000-4000-8000-00000000000b', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'biology', '[]');
insert into public.assistant_threads (id, user_id, title)
values ('80000000-0000-4000-8000-00000000000b', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'B assistant thread');
insert into public.assistant_messages (id, thread_id, user_id, role, content)
values ('81000000-0000-4000-8000-00000000000b', '80000000-0000-4000-8000-00000000000b', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'user', 'B private assistant message');
insert into public.assistant_attachments
  (id, user_id, thread_id, message_id, file_name, mime_type, byte_size, kind, object_path)
values
  ('82000000-0000-4000-8000-00000000000b', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '80000000-0000-4000-8000-00000000000b', '81000000-0000-4000-8000-00000000000b', 'private.pdf', 'application/pdf', 12, 'document', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/private.pdf');
insert into public.media_retention_queue
  (id, user_id, attachment_id, media_kind, storage_bucket, object_path, descriptor_bucket, descriptor_path, status)
values
  ('83000000-0000-4000-8000-00000000000b', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '82000000-0000-4000-8000-00000000000b', 'image', 'chat-attachments', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/private.png', 'assistant-descriptors', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/private.md', 'ready');
insert into storage.objects (bucket_id, name, owner_id)
values
  ('user-materials', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/a.pdf', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('user-materials', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/b.pdf', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select pg_temp.assert_true((select count(*) = 1 from public.profiles), 'A sees only A profile');
select pg_temp.assert_true((select count(*) = 1 from public.assessments), 'A sees only A assessment');
select pg_temp.assert_true((select count(*) = 1 from public.planner_events), 'A sees only A event');
select pg_temp.assert_true((select count(*) = 1 from public.documents), 'A sees only A material');
select pg_temp.assert_true((select count(*) = 1 from public.threads), 'A sees only A thread');
select pg_temp.assert_true((select count(*) = 0 from public.messages), 'A sees no B messages');
select pg_temp.assert_true((select count(*) = 1 from public.document_chunks), 'A sees only A chunks');
select pg_temp.assert_true((select count(*) = 0 from public.student_memories), 'A sees no B memories');
select pg_temp.assert_true((select count(*) = 0 from public.quizzes), 'A sees no B quizzes');
select pg_temp.assert_true((select count(*) = 0 from public.mock_exams), 'A sees no B exams');
select pg_temp.assert_true((select count(*) = 0 from public.assistant_threads), 'A sees no B assistant threads');
select pg_temp.assert_true((select count(*) = 0 from public.assistant_messages), 'A sees no B assistant messages');
select pg_temp.assert_true((select count(*) = 0 from public.assistant_attachments), 'A sees no B assistant attachments');
select pg_temp.assert_true((select count(*) = 0 from public.media_retention_queue), 'A sees no B retention rows');
select pg_temp.assert_true(
  (select count(*) = 0 from storage.objects where name like 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/%'),
  'A cannot read or list B storage objects'
);

do $$
declare
  changed_rows integer;
begin
  update public.profiles
     set preferred_name = 'tampered'
   where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  get diagnostics changed_rows = row_count;
  perform pg_temp.assert_true(changed_rows = 0, 'A cannot update B profile');

  delete from public.assessments
   where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  get diagnostics changed_rows = row_count;
  perform pg_temp.assert_true(changed_rows = 0, 'A cannot delete B assessment');

  update storage.objects
     set metadata = '{"tampered": true}'::jsonb
   where name = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/b.pdf';
  get diagnostics changed_rows = row_count;
  perform pg_temp.assert_true(changed_rows = 0, 'A cannot update B storage object');

end;
$$;

do $$
begin
  begin
    insert into public.assistant_messages (thread_id, user_id, role, content)
    values ('80000000-0000-4000-8000-00000000000b', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'user', 'cross-owner');
    raise exception 'cross-owner assistant message unexpectedly succeeded';
  exception when foreign_key_violation or insufficient_privilege then
    null;
  end;

  begin
    insert into public.media_retention_queue
      (user_id, attachment_id, media_kind, storage_bucket, object_path, descriptor_bucket, descriptor_path, status)
    values
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '82000000-0000-4000-8000-00000000000b', 'image', 'chat-attachments', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/forged.png', 'assistant-descriptors', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/forged.md', 'ready');
    raise exception 'cross-owner retention row unexpectedly succeeded';
  exception when foreign_key_violation or insufficient_privilege then
    null;
  end;
end;
$$;

do $$
begin
  begin
    insert into public.assessments
      (user_id, subject_slug, title, assessment_type, assessment_date, academic_year, source)
    values
      ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'biology', 'forged', 'Written exam', current_date, '2026-27', 'Teacher grade');
    raise exception 'cross-owner assessment unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

do $$
begin
  begin
    insert into public.messages (thread_id, user_id, role, content)
    values ('40000000-0000-4000-8000-00000000000b', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'user', 'cross-owner');
    raise exception 'cross-owner message unexpectedly succeeded';
  exception when foreign_key_violation or insufficient_privilege then
    null;
  end;
end;
$$;

select pg_temp.assert_true(
  (select count(*) = 1 from storage.objects where bucket_id = 'user-materials'),
  'A lists only A storage prefix'
);
do $$
begin
  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values ('user-materials', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/stolen.pdf', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    raise exception 'cross-owner storage insert unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;
-- Hosted Supabase blocks every direct SQL delete on storage.objects before it
-- reaches the Storage API. Verify the installed DELETE policy in the catalog;
-- reads, updates, and inserts above remain behavioral RLS checks.
select pg_temp.assert_true(
  (
    select count(*) = 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'user_materials_delete_own'
      and cmd = 'DELETE'
      and roles @> array['authenticated']::name[]
      and qual like '%user-materials%'
      and qual like '%auth.uid()%'
  ),
  'storage DELETE policy is scoped to the authenticated user prefix'
);
set local role anon;
do $$
declare
  visible_rows integer;
begin
  begin
    select count(*) into visible_rows from public.profiles;
    perform pg_temp.assert_true(visible_rows = 0, 'anon sees no profiles');
  exception when insufficient_privilege then
    null;
  end;

  begin
    select count(*) into visible_rows from public.documents;
    perform pg_temp.assert_true(visible_rows = 0, 'anon sees no documents');
  exception when insufficient_privilege then
    null;
  end;

  begin
    select count(*) into visible_rows
    from storage.objects
    where bucket_id = 'user-materials';
    perform pg_temp.assert_true(visible_rows = 0, 'anon sees no private objects');
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

rollback;
