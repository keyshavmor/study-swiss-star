-- Remove the default PUBLIC execute grant left by PostgreSQL function creation.
REVOKE EXECUTE ON FUNCTION public.update_thread_updated_at() FROM PUBLIC;
