-- Records the already-applied production schema for the general assistant,
-- account settings and storage management. Additive and idempotent: it never
-- drops or rewrites the existing profiles / user_preferences / documents rows,
-- and never touches the tutoring threads/messages data model.

-- Account profile ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  full_name text,
  preferred_name text,
  photo text,
  class_name text,
  school_name text,
  school_type text,
  date_of_birth date,
  language text,
  class_teacher text,
  focus_subject text,
  school_email text,
  student_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_details jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nationality text;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;
CREATE POLICY "Users can manage their own profile"
  ON public.profiles FOR ALL TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- UI and model preferences ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences jsonb NOT NULL DEFAULT jsonb_build_object(
    'selected_qwen_model', 'Qwen/Qwen3.8-27B',
    'exam_reminders', true,
    'daily_study_summary', true,
    'apple_reminders_sync', false,
    'sound_effects', false,
    'auto_storage_cleanup', true
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_preferences;
CREATE POLICY "Users can manage their own preferences"
  ON public.user_preferences FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- General assistant (separate from tutoring threads/messages) ----------------
CREATE TABLE IF NOT EXISTS public.assistant_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_threads TO authenticated;
GRANT ALL ON public.assistant_threads TO service_role;
ALTER TABLE public.assistant_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own assistant threads" ON public.assistant_threads;
CREATE POLICY "Users can manage their own assistant threads"
  ON public.assistant_threads FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE TABLE IF NOT EXISTS public.assistant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.assistant_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL DEFAULT '',
  parts jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_messages TO authenticated;
GRANT ALL ON public.assistant_messages TO service_role;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own assistant messages" ON public.assistant_messages;
CREATE POLICY "Users can manage their own assistant messages"
  ON public.assistant_messages FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE TABLE IF NOT EXISTS public.assistant_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES public.assistant_threads(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.assistant_messages(id) ON DELETE CASCADE,
  storage_bucket text NOT NULL DEFAULT 'chat-attachments',
  object_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  byte_size bigint,
  kind text,
  parse_status text NOT NULL DEFAULT 'unparsed',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_attachments TO authenticated;
GRANT ALL ON public.assistant_attachments TO service_role;
ALTER TABLE public.assistant_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own assistant attachments" ON public.assistant_attachments;
CREATE POLICY "Users can manage their own assistant attachments"
  ON public.assistant_attachments FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS assistant_threads_user_id_idx ON public.assistant_threads(user_id);
CREATE INDEX IF NOT EXISTS assistant_messages_thread_id_idx ON public.assistant_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS assistant_messages_user_id_idx ON public.assistant_messages(user_id);
CREATE INDEX IF NOT EXISTS assistant_attachments_user_id_idx ON public.assistant_attachments(user_id);
CREATE INDEX IF NOT EXISTS assistant_attachments_thread_id_idx ON public.assistant_attachments(thread_id);

-- Media attachments are limited to 1 MiB; documents use the bucket ceiling.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assistant_attachments_media_size_check'
  ) THEN
    ALTER TABLE public.assistant_attachments
      ADD CONSTRAINT assistant_attachments_media_size_check
      CHECK (
        kind IS NULL
        OR kind NOT IN ('image', 'audio', 'video')
        OR byte_size IS NULL
        OR byte_size <= 1048576
      ) NOT VALID;
  END IF;
END
$$;

-- Aggregate storage usage ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_storage_usage_status()
RETURNS TABLE (
  quota_bytes bigint,
  used_bytes bigint,
  remaining_bytes bigint,
  used_percent numeric,
  remaining_percent numeric,
  warning_threshold_reached boolean,
  emergency_cleanup_needed boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_quota bigint := 1073741824; -- 1 GiB
  v_used bigint;
BEGIN
  SELECT COALESCE(SUM((o.metadata->>'size')::bigint), 0)
  INTO v_used
  FROM storage.objects o
  WHERE o.bucket_id IN ('chat-attachments', 'user-materials', 'profile-avatars');

  RETURN QUERY
  SELECT
    v_quota,
    v_used,
    GREATEST(v_quota - v_used, 0),
    ROUND((v_used::numeric / v_quota) * 100, 2),
    ROUND((GREATEST(v_quota - v_used, 0)::numeric / v_quota) * 100, 2),
    (GREATEST(v_quota - v_used, 0)::numeric / v_quota) <= 0.10,
    (GREATEST(v_quota - v_used, 0)::numeric / v_quota) <= 0.01;
END;
$$;

REVOKE ALL ON FUNCTION public.get_storage_usage_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_storage_usage_status() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_storage_usage_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_storage_usage_status() TO service_role;

-- Per-user isolation for the private attachment and avatar buckets ----------
DROP POLICY IF EXISTS "Users can read own chat attachments" ON storage.objects;
CREATE POLICY "Users can read own chat attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Users can upload own chat attachments" ON storage.objects;
CREATE POLICY "Users can upload own chat attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Users can update own chat attachments" ON storage.objects;
CREATE POLICY "Users can update own chat attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Users can delete own chat attachments" ON storage.objects;
CREATE POLICY "Users can delete own chat attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Users can read own avatar" ON storage.objects;
CREATE POLICY "Users can read own avatar"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- New auth users receive a profile and preferences row.
CREATE OR REPLACE FUNCTION public.handle_new_user_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_preferences (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user_account() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user_account() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user_account() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user_account() TO service_role;
