-- Harden existing chat ownership so a message can only reference a thread owned by the same user.
ALTER TABLE public.threads
  ADD CONSTRAINT threads_id_user_id_key UNIQUE (id, user_id);

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_thread_id_fkey;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_thread_owner_fkey
  FOREIGN KEY (thread_id, user_id)
  REFERENCES public.threads(id, user_id)
  ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.update_thread_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.threads
  SET updated_at = now()
  WHERE id = NEW.thread_id
    AND user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.update_thread_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_thread_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.update_thread_updated_at() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.update_thread_updated_at() TO service_role;

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
  ) THEN
    REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM anon;
    REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM authenticated;
  END IF;
END
$do$;

-- Bucket 'user-materials' is created and kept private via the Storage API.

DROP POLICY IF EXISTS "Users can read own learning materials" ON storage.objects;
CREATE POLICY "Users can read own learning materials"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-materials'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Users can upload own learning materials" ON storage.objects;
CREATE POLICY "Users can upload own learning materials"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-materials'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Users can update own learning materials" ON storage.objects;
CREATE POLICY "Users can update own learning materials"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-materials'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'user-materials'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Users can delete own learning materials" ON storage.objects;
CREATE POLICY "Users can delete own learning materials"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-materials'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);