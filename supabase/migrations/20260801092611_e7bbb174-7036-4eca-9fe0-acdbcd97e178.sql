-- Restrict the timestamp trigger helper to privileged internal execution.
REVOKE EXECUTE ON FUNCTION public.update_thread_updated_at() FROM anon, authenticated;
