-- Make the developer-owned Supabase project the canonical durable Alim backend.
-- This migration is forward-only and preserves the existing threads/messages data.

create extension if not exists pgcrypto with schema extensions;

-- Existing chat tables: make ownership part of the relationship, not just a
-- convention enforced by the frontend.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.threads'::regclass
      and conname = 'threads_id_user_id_key'
  ) then
    alter table public.threads
      add constraint threads_id_user_id_key unique (id, user_id);
  end if;
end;
$$;

drop trigger if exists messages_update_thread_updated_at on public.messages;
drop function if exists public.update_thread_updated_at();

alter table public.messages drop constraint if exists messages_thread_id_fkey;
alter table public.messages drop constraint if exists messages_thread_owner_fkey;
alter table public.messages
  add column if not exists token_count integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.messages
  add constraint messages_thread_owner_fkey
  foreign key (thread_id, user_id)
  references public.threads (id, user_id)
  on delete cascade;

create or replace function public.touch_owning_thread()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.threads
     set updated_at = now()
   where id = new.thread_id
     and user_id = new.user_id;
  return new;
end;
$$;

revoke execute on function public.touch_owning_thread() from public, anon, authenticated;

create trigger messages_touch_owning_thread
after insert or update on public.messages
for each row execute function public.touch_owning_thread();

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  photo text not null default '',
  full_name text not null default '',
  preferred_name text not null default '',
  date_of_birth date,
  school_name text not null default '',
  school_type text not null default '',
  class_name text not null default '',
  class_teacher text not null default '',
  focus_subject text not null default '',
  school_email text not null default '',
  student_number text not null default '',
  username text not null default '',
  language text not null default 'English',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  academic_year text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_slug text not null,
  title text not null,
  assessment_type text not null,
  topic text not null default '',
  assessment_date date not null,
  academic_year text not null,
  points numeric,
  max_points numeric,
  teacher_grade numeric,
  weight numeric not null default 1 check (weight > 0),
  notes text not null default '',
  source text not null,
  include_in_stats boolean not null default true,
  imported_from text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.planner_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  event_date date not null,
  start_time time not null,
  end_time time not null,
  subject_slug text,
  location text,
  travel_minutes integer check (travel_minutes is null or travel_minutes >= 0),
  travel_before integer check (travel_before is null or travel_before >= 0),
  travel_after integer check (travel_after is null or travel_after >= 0),
  recurrence text not null default 'none',
  weekdays smallint[] not null default '{}',
  until_date date,
  exceptions date[] not null default '{}',
  overrides jsonb not null default '{}'::jsonb,
  color text,
  reminder text,
  notes text,
  done boolean not null default false,
  generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  check (recurrence in ('none', 'daily', 'weekly', 'biweekly', 'monthly'))
);

create table public.school_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  url text not null,
  category text not null,
  description text,
  icon text,
  subject_slug text,
  accent text not null,
  sort_order integer not null default 0,
  added_on date not null default current_date,
  open_count integer not null default 0 check (open_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_key text not null,
  read_at timestamptz,
  dismissed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, notification_key)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_slug text,
  topic text,
  document_type text not null,
  title text not null,
  source text,
  language text,
  storage_bucket text,
  object_path text,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  section text,
  status text not null default 'Processing',
  notes text not null default '',
  archived boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check ((storage_bucket is null) = (object_path is null))
);

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  title text not null,
  subject text,
  topic text,
  subtopic text,
  document_type text,
  source text,
  page integer check (page is null or page > 0),
  section text,
  chapter text,
  language text,
  token_count integer not null default 0 check (token_count >= 0),
  embedding jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (document_id, user_id)
    references public.documents (id, user_id) on delete cascade
);

create table public.student_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_type text not null,
  subject text,
  topic text,
  content text not null,
  confidence numeric not null default 0.5 check (confidence between 0 and 1),
  importance numeric not null default 0.5 check (importance between 0 and 1),
  evidence jsonb not null default '[]'::jsonb,
  evidence_count integer not null default 1 check (evidence_count >= 1),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_accessed_at timestamptz
);

create table public.learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  subject text,
  topic text,
  content text not null,
  importance numeric not null default 0.5 check (importance between 0 and 1),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.conversation_summaries (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  summary text not null,
  covered_message_ids text[] not null default '{}',
  token_count integer not null default 0 check (token_count >= 0),
  created_at timestamptz not null default now(),
  foreign key (thread_id, user_id)
    references public.threads (id, user_id) on delete cascade
);

create table public.context_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artifact_type text not null,
  title text not null,
  summary text not null,
  content text not null,
  content_location text not null,
  token_count integer not null default 0 check (token_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  searchable boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.working_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid,
  task_id text,
  content text not null,
  token_count integer not null default 0 check (token_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  foreign key (thread_id, user_id)
    references public.threads (id, user_id) on delete cascade
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  component text,
  topic text,
  academic_year text,
  source_document_ids uuid[] not null default '{}',
  questions jsonb not null,
  model_used text,
  generated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (id, user_id)
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_number integer not null default 1 check (attempt_number > 0),
  answers jsonb not null default '{}'::jsonb,
  score numeric,
  points numeric,
  max_points numeric,
  swiss_grade numeric,
  grading_feedback jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  foreign key (quiz_id, user_id)
    references public.quizzes (id, user_id) on delete cascade,
  unique (quiz_id, attempt_number)
);

create table public.mock_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  component text,
  topic text,
  academic_year text,
  source_document_ids uuid[] not null default '{}',
  questions jsonb not null,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  model_used text,
  generated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (id, user_id)
);

create table public.mock_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  mock_exam_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_number integer not null default 1 check (attempt_number > 0),
  answers jsonb not null default '{}'::jsonb,
  score numeric,
  points numeric,
  max_points numeric,
  swiss_grade numeric,
  grading_feedback jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  foreign key (mock_exam_id, user_id)
    references public.mock_exams (id, user_id) on delete cascade,
  unique (mock_exam_id, attempt_number)
);

create table public.grading_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  component text,
  academic_year text,
  source_type text not null,
  source_id uuid,
  user_answers jsonb not null default '{}'::jsonb,
  feedback jsonb not null default '{}'::jsonb,
  points numeric,
  max_points numeric,
  swiss_grade numeric,
  model_used text,
  graded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject text,
  topic text,
  academic_year text,
  learning_goal_id text,
  plan jsonb not null,
  status text not null default 'draft',
  model_used text,
  generated_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null,
  feature text,
  subject text,
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  check (not (properties ?| array['password', 'access_token', 'refresh_token', 'oauth_token']))
);

-- Common timestamps. The function is deliberately invoker-security and does
-- not query any table or bypass RLS.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'user_preferences', 'assessments', 'planner_events',
    'school_links', 'notification_state', 'documents', 'student_memories'
  ] loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

-- Index every ownership/FK path and the principal recency/filter paths.
create index threads_user_updated_idx on public.threads (user_id, updated_at desc);
create index messages_user_thread_created_idx on public.messages (user_id, thread_id, created_at);
create index assessments_user_subject_date_idx on public.assessments (user_id, subject_slug, assessment_date desc);
create index planner_events_user_date_idx on public.planner_events (user_id, event_date, until_date);
create index school_links_user_order_idx on public.school_links (user_id, sort_order);
create index documents_user_subject_created_idx on public.documents (user_id, subject_slug, created_at desc);
create index documents_object_idx on public.documents (storage_bucket, object_path) where object_path is not null;
create index document_chunks_document_user_idx on public.document_chunks (document_id, user_id);
create index document_chunks_user_scope_idx on public.document_chunks (user_id, subject, document_type, created_at desc);
create index student_memories_user_lookup_idx on public.student_memories (user_id, subject, topic, updated_at desc);
create index learning_events_user_recent_idx on public.learning_events (user_id, occurred_at desc);
create index conversation_summaries_thread_recent_idx on public.conversation_summaries (user_id, thread_id, created_at desc);
create index context_artifacts_user_recent_idx on public.context_artifacts (user_id, created_at desc);
create index working_memory_user_thread_expiry_idx on public.working_memory (user_id, thread_id, expires_at);
create index quizzes_user_subject_generated_idx on public.quizzes (user_id, subject, generated_at desc);
create index quiz_attempts_user_quiz_idx on public.quiz_attempts (user_id, quiz_id, attempt_number);
create index mock_exams_user_subject_generated_idx on public.mock_exams (user_id, subject, generated_at desc);
create index mock_exam_attempts_user_exam_idx on public.mock_exam_attempts (user_id, mock_exam_id, attempt_number);
create index grading_results_user_recent_idx on public.grading_results (user_id, graded_at desc);
create index study_plans_user_recent_idx on public.study_plans (user_id, generated_at desc);
create index feedback_user_recent_idx on public.feedback (user_id, created_at desc);
create index usage_events_user_recent_idx on public.usage_events (user_id, occurred_at desc);

-- All exposed application tables are private. Four explicit policies prevent
-- ownership reassignment and make each CRUD operation auditable.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'user_preferences', 'assessments', 'planner_events', 'school_links',
    'notification_state', 'threads', 'messages', 'documents', 'document_chunks',
    'student_memories', 'learning_events', 'conversation_summaries',
    'context_artifacts', 'working_memory', 'quizzes', 'quiz_attempts',
    'mock_exams', 'mock_exam_attempts', 'grading_results', 'study_plans',
    'feedback', 'usage_events'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    execute format('drop policy if exists "Users can manage their own %s" on public.%I', table_name, table_name);
    execute format('drop policy if exists "Users can manage their own threads" on public.%I', table_name);
    execute format('drop policy if exists "Users can manage their own messages" on public.%I', table_name);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name || '_update_own', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name || '_delete_own', table_name);
  end loop;
end;
$$;

-- Original uploads live in one private bucket and every operation is scoped by
-- the first object-path segment: {auth.uid()}/....
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-materials',
  'user-materials',
  false,
  52428800,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'image/png',
    'image/jpeg',
    'image/svg+xml'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists user_materials_select_own on storage.objects;
drop policy if exists user_materials_insert_own on storage.objects;
drop policy if exists user_materials_update_own on storage.objects;
drop policy if exists user_materials_delete_own on storage.objects;
drop policy if exists "Users can read own learning materials" on storage.objects;
drop policy if exists "Users can upload own learning materials" on storage.objects;
drop policy if exists "Users can update own learning materials" on storage.objects;
drop policy if exists "Users can delete own learning materials" on storage.objects;

create policy user_materials_select_own
on storage.objects for select to authenticated
using (
  bucket_id = 'user-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy user_materials_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'user-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy user_materials_update_own
on storage.objects for update to authenticated
using (
  bucket_id = 'user-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'user-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy user_materials_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'user-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
