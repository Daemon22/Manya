-- Migration 001: Initial schema for @manya-os/supabase
-- Creates all tables for ledger, memory, keyring, attest, council, constitution, customs-shield.
--
-- Copyright 2024 Manya Hael Foundation. All rights reserved.
-- Licensed under the Apache License, Version 2.0.

BEGIN;

-- ============================================================
-- LEDGER — Append-only immutable audit events
-- ============================================================
CREATE TABLE IF NOT EXISTS ledger_events (
  seq           BIGINT PRIMARY KEY,
  id            TEXT NOT NULL UNIQUE,
  type          TEXT NOT NULL,
  actor         TEXT NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}',
  timestamp     TIMESTAMPTZ NOT NULL,
  prev_hash     TEXT NOT NULL,
  hash          TEXT NOT NULL UNIQUE,
  signature     TEXT,
  sig_algorithm TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MEMORY — Episodic events (timestamped experiences)
-- ============================================================
CREATE TABLE IF NOT EXISTS memory_episodic (
  id          TEXT PRIMARY KEY,
  agent       TEXT NOT NULL,
  event       TEXT NOT NULL,
  context     JSONB,
  tags        TEXT[] DEFAULT '{}',
  importance  REAL CHECK (importance >= 0 AND importance <= 1),
  source      TEXT,
  timestamp   BIGINT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MEMORY — Semantic facts (entity-attribute-value)
-- ============================================================
CREATE TABLE IF NOT EXISTS memory_semantic (
  id          TEXT PRIMARY KEY,
  entity      TEXT NOT NULL,
  attribute   TEXT NOT NULL,
  value       JSONB NOT NULL,
  confidence  REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  learned_at  BIGINT NOT NULL,
  source      TEXT,
  tags        TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity, attribute)
);

-- ============================================================
-- MEMORY — Long-term records (durable memory)
-- ============================================================
CREATE TABLE IF NOT EXISTS memory_longterm (
  id               TEXT PRIMARY KEY,
  type             TEXT NOT NULL,
  payload          JSONB NOT NULL,
  created_at       BIGINT NOT NULL,
  last_accessed_at BIGINT NOT NULL,
  access_count     INTEGER NOT NULL DEFAULT 0,
  importance       REAL NOT NULL CHECK (importance >= 0 AND importance <= 1),
  tags             TEXT[] DEFAULT '{}',
  source           TEXT,
  inserted_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MEMORY — Links (graph edges between records)
-- ============================================================
CREATE TABLE IF NOT EXISTS memory_links (
  from_id   TEXT NOT NULL,
  to_id     TEXT NOT NULL,
  relation  TEXT NOT NULL,
  weight    REAL,
  PRIMARY KEY (from_id, to_id, relation)
);

-- ============================================================
-- MEMORY — Permissions (per-record access control)
-- ============================================================
CREATE TABLE IF NOT EXISTS memory_permissions (
  record_id TEXT PRIMARY KEY,
  readers   TEXT[] NOT NULL DEFAULT '{*}',
  writers   TEXT[] NOT NULL DEFAULT '{}',
  deleters  TEXT[] NOT NULL DEFAULT '{}'
);

-- ============================================================
-- ATTEST — Sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS attest_sessions (
  token          TEXT PRIMARY KEY,
  session_id     TEXT NOT NULL UNIQUE,
  created_at     TIMESTAMPTZ NOT NULL,
  expires_at     TIMESTAMPTZ NOT NULL,
  fingerprint    TEXT NOT NULL,
  identity       TEXT,
  trust_score    REAL,
  bound_nonce    TEXT NOT NULL,
  inserted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- KEYRING — Identities (public form ONLY — never private keys)
-- ============================================================
CREATE TABLE IF NOT EXISTS keyring_identities (
  id          TEXT PRIMARY KEY,
  did         TEXT NOT NULL UNIQUE,
  public_key  TEXT NOT NULL,
  algorithm   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL,
  metadata    JSONB DEFAULT '{}',
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- KEYRING — Credentials (verifiable credentials)
-- ============================================================
CREATE TABLE IF NOT EXISTS keyring_credentials (
  id          TEXT PRIMARY KEY,
  issuer      TEXT NOT NULL,
  subject     TEXT NOT NULL,
  claims      JSONB NOT NULL,
  issued_at   TIMESTAMPTZ NOT NULL,
  expires_at  TIMESTAMPTZ,
  proof       JSONB NOT NULL,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- KEYRING — Role assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS keyring_role_assignments (
  identity_id TEXT NOT NULL,
  role        TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (identity_id, role)
);

-- ============================================================
-- KEYRING — Key-value store (for EncryptedStorage interface)
-- ============================================================
CREATE TABLE IF NOT EXISTS keyring_kv (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,  -- base64-encoded Buffer
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- COUNCIL — Debates
-- ============================================================
CREATE TABLE IF NOT EXISTS council_debates (
  id           TEXT PRIMARY KEY,
  problem_id   TEXT NOT NULL,
  conflict_ids TEXT[] DEFAULT '{}',
  rounds       JSONB NOT NULL DEFAULT '[]',
  status       TEXT NOT NULL DEFAULT 'open',
  opened_at    TIMESTAMPTZ NOT NULL,
  concluded_at TIMESTAMPTZ,
  inserted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- COUNCIL — Decisions
-- ============================================================
CREATE TABLE IF NOT EXISTS council_decisions (
  id              TEXT PRIMARY KEY,
  problem_id      TEXT NOT NULL,
  decision        TEXT NOT NULL,
  rationale       TEXT NOT NULL,
  confidence      REAL NOT NULL,
  consensus_level TEXT NOT NULL,
  participants    TEXT[] NOT NULL,
  generated_at    TIMESTAMPTZ NOT NULL,
  inserted_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CONSTITUTION — Enforcement audit log
-- ============================================================
CREATE TABLE IF NOT EXISTS constitution_audit (
  id          TEXT PRIMARY KEY,
  subject     TEXT NOT NULL,
  action      TEXT NOT NULL,
  resource    TEXT NOT NULL,
  allowed     BOOLEAN NOT NULL,
  reasons     TEXT[] DEFAULT '{}',
  violations  TEXT[] DEFAULT '{}',
  timestamp   TIMESTAMPTZ NOT NULL,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CUSTOMS-SHIELD — Screening reports
-- ============================================================
CREATE TABLE IF NOT EXISTS customs_reports (
  id              TEXT PRIMARY KEY,
  shipment_id     TEXT NOT NULL,
  risk_score      REAL NOT NULL,
  risk_band       TEXT NOT NULL,
  hold_for_review BOOLEAN NOT NULL,
  findings        JSONB NOT NULL DEFAULT '[]',
  counts          JSONB NOT NULL DEFAULT '{}',
  generated_at    TIMESTAMPTZ NOT NULL,
  inserted_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SCHEMA_MIGRATIONS — Migration tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  checksum   TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
