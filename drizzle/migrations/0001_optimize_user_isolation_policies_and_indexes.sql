DROP POLICY IF EXISTS "Users can manage their own threads" ON public.threads;
CREATE POLICY "Users can manage their own threads"
  ON public.threads
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can manage their own messages" ON public.messages;
CREATE POLICY "Users can manage their own messages"
  ON public.messages
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS threads_user_id_idx
  ON public.threads(user_id);
CREATE INDEX IF NOT EXISTS messages_user_id_idx
  ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS messages_thread_id_user_id_idx
  ON public.messages(thread_id, user_id);