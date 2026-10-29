-- Migration 002: Row Level Security policies
-- Enables RLS on all tables and creates appropriate policies.
--
-- Copyright 2024 Manya Hael Foundation. All rights reserved.
-- Licensed under the Apache License, Version 2.0.

BEGIN;

-- ============================================================
-- LEDGER — Append-only for authenticated, read for all
-- ============================================================
ALTER TABLE ledger_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY ledger_insert ON ledger_events
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY ledger_select ON ledger_events
  FOR SELECT
  USING (true);

-- No UPDATE or DELETE policies = append-only enforcement at DB level

-- ============================================================
-- MEMORY — Service-role only (server-managed)
-- ============================================================
ALTER TABLE memory_episodic ENABLE ROW LEVEL SECURITY;
CREATE POLICY memory_episodic_service ON memory_episodic
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE memory_semantic ENABLE ROW LEVEL SECURITY;
CREATE POLICY memory_semantic_service ON memory_semantic
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE memory_longterm ENABLE ROW LEVEL SECURITY;
CREATE POLICY memory_longterm_service ON memory_longterm
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE memory_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY memory_links_service ON memory_links
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE memory_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY memory_permissions_service ON memory_permissions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- ATTEST — Service-role only (sessions are server-managed)
-- ============================================================
ALTER TABLE attest_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY attest_service ON attest_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- KEYRING — Service-role only (private keys never reach server)
-- ============================================================
ALTER TABLE keyring_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY keyring_identities_service ON keyring_identities
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE keyring_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY keyring_credentials_service ON keyring_credentials
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE keyring_role_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY keyring_roles_service ON keyring_role_assignments
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE keyring_kv ENABLE ROW LEVEL SECURITY;
CREATE POLICY keyring_kv_service ON keyring_kv
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- COUNCIL — Service-role only
-- ============================================================
ALTER TABLE council_debates ENABLE ROW LEVEL SECURITY;
CREATE POLICY council_debates_service ON council_debates
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE council_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY council_decisions_service ON council_decisions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- CONSTITUTION — Service-role only
-- ============================================================
ALTER TABLE constitution_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY constitution_audit_service ON constitution_audit
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- CUSTOMS-SHIELD — Service-role only
-- ============================================================
ALTER TABLE customs_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY customs_reports_service ON customs_reports
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- SCHEMA_MIGRATIONS — Service-role only
-- ============================================================
ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY schema_migrations_service ON schema_migrations
  FOR ALL USING (auth.role() = 'service_role');

COMMIT;
