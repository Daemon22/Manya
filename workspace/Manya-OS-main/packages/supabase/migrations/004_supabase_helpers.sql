-- Migration 004: Supabase helper functions
-- Adds RPC functions for atomic operations used by the adapters.
--
-- Copyright 2024 Manya Hael Foundation. All rights reserved.
-- Licensed under the Apache License, Version 2.0.

BEGIN;

-- ============================================================
-- Execute migration SQL for trusted server-side service-role clients.
-- This function is never callable by anon or authenticated clients.
-- ============================================================
CREATE OR REPLACE FUNCTION exec_sql(query TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE query;
END;
$$;

-- ============================================================
-- Increment access_count atomically for long-term memory records.
-- Called by SupabaseMemoryStore.touchLongterm via RPC.
-- ============================================================
CREATE OR REPLACE FUNCTION increment_longterm_access(p_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE memory_longterm
  SET access_count = access_count + 1
  WHERE id = p_id;
END;
$$;

-- ============================================================
-- Touch a long-term memory record: update last_accessed_at and
-- increment access_count atomically in a single RPC call.
-- Idempotent on retry because access_count uses += 1 and
-- last_accessed_at is overwritten with the caller-provided value.
-- ============================================================
CREATE OR REPLACE FUNCTION touch_longterm_record(p_id TEXT, p_accessed_at BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE memory_longterm
  SET access_count = access_count + 1,
      last_accessed_at = p_accessed_at
  WHERE id = p_id;

  RETURN FOUND;
END;
$$;

-- ============================================================
-- Prune expired attest sessions.
-- Returns the number of deleted sessions.
-- ============================================================
CREATE OR REPLACE FUNCTION prune_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM attest_sessions
  WHERE expires_at < now();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================================
-- Record schema_migrations entry idempotently.
-- ============================================================
CREATE OR REPLACE FUNCTION record_migration(
  p_version INTEGER,
  p_name TEXT,
  p_checksum TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO schema_migrations (version, name, checksum)
  VALUES (p_version, p_name, p_checksum)
  ON CONFLICT (version) DO NOTHING;
END;
$$;

-- ============================================================
-- Revoke direct RPC access from non-privileged roles.
-- These functions are SECURITY DEFINER and must only be called
-- by trusted server-side code, not by authenticated or anon users.
-- ============================================================
REVOKE EXECUTE ON FUNCTION increment_longterm_access(TEXT) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION touch_longterm_record(TEXT, BIGINT) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION prune_expired_sessions() FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION record_migration(INTEGER, TEXT, TEXT) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION exec_sql(TEXT) FROM authenticated, anon;

COMMIT;
