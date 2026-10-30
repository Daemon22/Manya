-- Migration 005: Transactional snapshot save
-- Adds a SECURITY DEFINER RPC function that atomically deletes all rows
-- from memory tables and re-inserts snapshot data within a single transaction.
--
-- Copyright 2024 Manya Hael Foundation. All rights reserved.
-- Licensed under the Apache License, Version 2.0.

BEGIN;

-- ============================================================
-- Atomically save a memory snapshot: delete all rows from memory
-- tables and insert the provided snapshot data in a single transaction.
-- Called by SupabaseMemoryStore.saveSnapshot via RPC.
-- ============================================================
CREATE OR REPLACE FUNCTION save_memory_snapshot(
  p_episodic JSONB,
  p_semantic JSONB,
  p_longterm JSONB,
  p_links JSONB,
  p_permissions JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete all existing data
  DELETE FROM memory_permissions;
  DELETE FROM memory_links;
  DELETE FROM memory_longterm;
  DELETE FROM memory_semantic;
  DELETE FROM memory_episodic;

  -- Insert episodic events
  IF p_episodic IS NOT NULL AND jsonb_array_length(p_episodic) > 0 THEN
    INSERT INTO memory_episodic (id, agent, event, context, tags, importance, source, timestamp)
    SELECT
      (e->>'id')::TEXT,
      (e->>'agent')::TEXT,
      (e->>'event')::TEXT,
      e->'context',
      COALESCE((
        SELECT array_agg(v::TEXT) FROM jsonb_array_elements_text(e->'tags') v
      ), ARRAY[]::TEXT[]),
      (e->>'importance')::REAL,
      (e->>'source')::TEXT,
      (e->>'timestamp')::BIGINT
    FROM jsonb_array_elements(p_episodic) e;
  END IF;

  -- Insert semantic facts
  IF p_semantic IS NOT NULL AND jsonb_array_length(p_semantic) > 0 THEN
    INSERT INTO memory_semantic (id, entity, attribute, value, confidence, learned_at, source, tags)
    SELECT
      (f->>'id')::TEXT,
      (f->>'entity')::TEXT,
      (f->>'attribute')::TEXT,
      f->'value',
      (f->>'confidence')::REAL,
      (f->>'learnedAt')::BIGINT,
      (f->>'source')::TEXT,
      COALESCE((
        SELECT array_agg(v::TEXT) FROM jsonb_array_elements_text(f->'tags') v
      ), ARRAY[]::TEXT[])
    FROM jsonb_array_elements(p_semantic) f;
  END IF;

  -- Insert long-term records
  IF p_longterm IS NOT NULL AND jsonb_array_length(p_longterm) > 0 THEN
    INSERT INTO memory_longterm (id, type, payload, created_at, last_accessed_at, access_count, importance, tags, source)
    SELECT
      (r->>'id')::TEXT,
      (r->>'type')::TEXT,
      r->'payload',
      (r->>'createdAt')::BIGINT,
      (r->>'lastAccessedAt')::BIGINT,
      (r->>'accessCount')::INTEGER,
      (r->>'importance')::REAL,
      COALESCE((
        SELECT array_agg(v::TEXT) FROM jsonb_array_elements_text(r->'tags') v
      ), ARRAY[]::TEXT[]),
      (r->>'source')::TEXT
    FROM jsonb_array_elements(p_longterm) r;
  END IF;

  -- Insert links
  IF p_links IS NOT NULL AND jsonb_array_length(p_links) > 0 THEN
    INSERT INTO memory_links (from_id, to_id, relation, weight)
    SELECT
      (l->>'fromId')::TEXT,
      (l->>'toId')::TEXT,
      (l->>'relation')::TEXT,
      (l->>'weight')::REAL
    FROM jsonb_array_elements(p_links) l;
  END IF;

  -- Insert permissions
  IF p_permissions IS NOT NULL AND jsonb_array_length(p_permissions) > 0 THEN
    INSERT INTO memory_permissions (record_id, readers, writers, deleters)
    SELECT
      (p->>'recordId')::TEXT,
      COALESCE((
        SELECT array_agg(v::TEXT) FROM jsonb_array_elements_text(p->'readers') v
      ), ARRAY[]::TEXT[]),
      COALESCE((
        SELECT array_agg(v::TEXT) FROM jsonb_array_elements_text(p->'writers') v
      ), ARRAY[]::TEXT[]),
      COALESCE((
        SELECT array_agg(v::TEXT) FROM jsonb_array_elements_text(p->'deleters') v
      ), ARRAY[]::TEXT[])
    FROM jsonb_array_elements(p_permissions) p;
  END IF;
END;
$$;

-- ============================================================
-- Revoke direct RPC access from non-privileged roles.
-- ============================================================
REVOKE EXECUTE ON FUNCTION save_memory_snapshot(JSONB, JSONB, JSONB, JSONB, JSONB) FROM authenticated, anon;

COMMIT;
