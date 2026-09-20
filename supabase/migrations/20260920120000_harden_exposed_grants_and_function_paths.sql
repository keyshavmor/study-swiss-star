-- Forward-only Prompt 07 hardening derived from a read-only live catalog audit.
-- This migration intentionally does not recreate or rename any of the 32
-- already-applied production migrations whose original SQL is unavailable.

-- Pre-authenticated clients use Edge Functions and Auth, not direct table
-- access. RLS denied these grants in practice, but explicit least privilege is
-- a second boundary and prevents a future permissive policy from exposing data.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;

-- PostgreSQL grants EXECUTE to PUBLIC for new functions unless told otherwise.
-- Require every future public/private RPC to opt its caller roles in explicitly.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
DO $hardening$
BEGIN
  IF to_regnamespace('private') IS NOT NULL THEN
    ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
  END IF;
END
$hardening$;

DO $hardening$
BEGIN
  IF to_regprocedure('private.enforce_user_database_quota()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION private.enforce_user_database_quota() FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION private.enforce_user_database_quota() TO service_role;
    ALTER FUNCTION private.enforce_user_database_quota()
      SET search_path = pg_catalog, information_schema;
  END IF;

  IF to_regprocedure('private.user_database_usage_bytes(uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION private.user_database_usage_bytes(uuid) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION private.user_database_usage_bytes(uuid) TO service_role;
    ALTER FUNCTION private.user_database_usage_bytes(uuid)
      SET search_path = pg_catalog, information_schema;
  END IF;

  IF to_regprocedure('private.user_storage_usage_bytes(uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION private.user_storage_usage_bytes(uuid) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION private.user_storage_usage_bytes(uuid) TO service_role;
    ALTER FUNCTION private.user_storage_usage_bytes(uuid)
      SET search_path = pg_catalog;
  END IF;
END
$hardening$;

-- Privileged SECURITY DEFINER entry points remain callable only by the service
-- role. Trigger execution is unaffected by revoking direct client execution.
DO $hardening$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname IN (
        'apply_confirmed_safety_strike',
        'begin_emergency_storage_cleanup',
        'finish_emergency_storage_cleanup',
        'get_emergency_cleanup_candidates',
        'handle_new_auth_user_defaults',
        'peer_message_after_insert',
        'rls_auto_enable',
        'service_delete_all_user_content',
        'service_delete_user_range',
        'verify_storage_capacity_cleanup_secret'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', target.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', target.signature);
  END LOOP;
END
$hardening$;

COMMENT ON SCHEMA private IS
  'Non-Data-API helpers. No anon/authenticated schema usage; policy and trigger owners call reviewed functions.';
