/**
 * @manya-os/supabase — integration test: connection.
 *
 * These tests require a real Supabase instance. Set SUPABASE_INTEGRATION_TEST=true
 * and provide SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in your environment.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { SupabaseClientFacade } from '../../src/client.js';
import { resolveConfig, type ResolvedConfig } from '../../src/config.js';
import { ConsoleLogger } from '../../src/logging.js';

const INTEGRATION = process.env.SUPABASE_INTEGRATION_TEST === 'true';

const describeIfIntegration = INTEGRATION ? describe : describe.skip;

describeIfIntegration('Connection', () => {
  let config: ResolvedConfig;
  const logger = new ConsoleLogger('silent');

  beforeAll(() => {
    config = resolveConfig({
      url: process.env.SUPABASE_URL!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      logLevel: 'silent',
    });
  });

  it('creates client and pings successfully', async () => {
    const facade = new SupabaseClientFacade(config, logger);
    const ok = await facade.ping();
    expect(typeof ok).toBe('boolean');
    facade.dispose();
  });

  it('dispose prevents further usage', () => {
    const facade = new SupabaseClientFacade(config, logger);
    facade.dispose();
    expect(() => facade.getClient()).toThrow();
  });

  it('ping after dispose throws', async () => {
    const facade = new SupabaseClientFacade(config, logger);
    facade.dispose();
    await expect(facade.ping()).resolves.toBe(false);
  });
});
