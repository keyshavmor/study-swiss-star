-- Cover every composite ownership foreign key in its declared column order.
create index conversation_summaries_thread_owner_idx
  on public.conversation_summaries (thread_id, user_id);

create index working_memory_thread_owner_idx
  on public.working_memory (thread_id, user_id);

create index quiz_attempts_quiz_owner_idx
  on public.quiz_attempts (quiz_id, user_id);

create index mock_exam_attempts_exam_owner_idx
  on public.mock_exam_attempts (mock_exam_id, user_id);
