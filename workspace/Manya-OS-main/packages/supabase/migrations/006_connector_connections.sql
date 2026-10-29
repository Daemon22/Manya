-- Migration 006: application-level connector mappings.
-- Provider credentials remain owned by MCP/Composio and are never stored here.

BEGIN;

CREATE TABLE IF NOT EXISTS manya_connector_connections (
  identity    TEXT NOT NULL,
  provider    TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (identity, provider)
);

CREATE INDEX IF NOT EXISTS idx_manya_connector_connections_provider
  ON manya_connector_connections (provider);

COMMIT;
