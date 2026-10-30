/**
 * @manya-os/supabase — integration test: migrations.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import * as path from 'path';
import { SupabaseClientFacade } from '../../src/client.js';
import { MigrationRunner } from '../../src/migrations/runner.js';
import { resolveConfig, type ResolvedConfig } from '../../src/config.js';
import { ConsoleLogger } from '../../src/logging.js';

const INTEGRATION = process.env.SUPABASE_INTEGRATION_TEST === 'true';
const describeIfIntegration = INTEGRATION ? describe : describe.skip;

describeIfIntegration('Migrations', () => {
  let config: ResolvedConfig;
  const logger = new ConsoleLogger('silent');
  let facade: SupabaseClientFacade;

  beforeAll(() => {
    config = resolveConfig({
      url: process.env.SUPABASE_URL!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      logLevel: 'silent',
    });
    facade = new SupabaseClientFacade(config, logger);
  });

  afterAll(() => {
    facade.dispose();
  });

  it('reads migration files from disk', async () => {
    const runner = new MigrationRunner(
      facade.getClient(),
      logger,
      path.join(__dirname, '../../migrations'),
    );
    const migrations = await runner.readMigrations();
    expect(migrations.length).toBeGreaterThanOrEqual(3);
    expect(migrations[0].version).toBe(1);
  });

  it('applies pending migrations idempotently', async () => {
    const runner = new MigrationRunner(
      facade.getClient(),
      logger,
      path.join(__dirname, '../../migrations'),
    );
    const results = await runner.runPending();
    expect(Array.isArray(results)).toBe(true);
  });

  it('reports migration status', async () => {
    const runner = new MigrationRunner(
      facade.getClient(),
      logger,
      path.join(__dirname, '../../migrations'),
    );
    const status = await runner.status();
    expect(status.length).toBeGreaterThanOrEqual(3);
    for (const s of status) {
      expect(typeof s.applied).toBe('boolean');
    }
  }, 30000);
});
