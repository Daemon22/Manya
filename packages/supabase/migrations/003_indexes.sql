-- Migration 003: Performance indexes
-- Creates indexes for expected query patterns across all tables.
--
-- Copyright 2024 Manya Hael Foundation. All rights reserved.
-- Licensed under the Apache License, Version 2.0.

BEGIN;

-- ============================================================
-- LEDGER indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ledger_events_type
  ON ledger_events(type);
CREATE INDEX IF NOT EXISTS idx_ledger_events_actor
  ON ledger_events(actor);
CREATE INDEX IF NOT EXISTS idx_ledger_events_timestamp
  ON ledger_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_ledger_events_id
  ON ledger_events(id);

-- ============================================================
-- MEMORY — Episodic indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_memory_episodic_agent
  ON memory_episodic(agent);
CREATE INDEX IF NOT EXISTS idx_memory_episodic_timestamp
  ON memory_episodic(timestamp);
CREATE INDEX IF NOT EXISTS idx_memory_episodic_tags
  ON memory_episodic USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_memory_episodic_importance
  ON memory_episodic(importance);

-- ============================================================
-- MEMORY — Semantic indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_memory_semantic_entity
  ON memory_semantic(entity);
CREATE INDEX IF NOT EXISTS idx_memory_semantic_attribute
  ON memory_semantic(attribute);

-- ============================================================
-- MEMORY — Long-term indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_memory_longterm_type
  ON memory_longterm(type);
CREATE INDEX IF NOT EXISTS idx_memory_longterm_importance
  ON memory_longterm(importance);
CREATE INDEX IF NOT EXISTS idx_memory_longterm_last_accessed
  ON memory_longterm(last_accessed_at);
CREATE INDEX IF NOT EXISTS idx_memory_longterm_tags
  ON memory_longterm USING GIN(tags);

-- ============================================================
-- MEMORY — Links indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_memory_links_from
  ON memory_links(from_id);
CREATE INDEX IF NOT EXISTS idx_memory_links_to
  ON memory_links(to_id);

-- ============================================================
-- ATTEST indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_attest_sessions_expires
  ON attest_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_attest_sessions_identity
  ON attest_sessions(identity);

-- ============================================================
-- KEYRING indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_keyring_credentials_subject
  ON keyring_credentials(subject);
CREATE INDEX IF NOT EXISTS idx_keyring_credentials_issuer
  ON keyring_credentials(issuer);

-- ============================================================
-- COUNCIL indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_council_debates_problem
  ON council_debates(problem_id);

-- ============================================================
-- CONSTITUTION indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_constitution_audit_subject
  ON constitution_audit(subject);
CREATE INDEX IF NOT EXISTS idx_constitution_audit_timestamp
  ON constitution_audit(timestamp);

-- ============================================================
-- CUSTOMS indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_customs_reports_shipment
  ON customs_reports(shipment_id);

COMMIT;
