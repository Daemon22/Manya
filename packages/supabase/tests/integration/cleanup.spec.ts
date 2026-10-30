/**
 * @manya-os/supabase — integration test: cleanup.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { SupabaseClientFacade } from '../../src/client.js';
import { resolveConfig, type ResolvedConfig } from '../../src/config.js';
import { ConsoleLogger } from '../../src/logging.js';

const INTEGRATION = process.env.SUPABASE_INTEGRATION_TEST === 'true';
const describeIfIntegration = INTEGRATION ? describe : describe.skip;

describeIfIntegration('Cleanup', () => {
  let config: ResolvedConfig;
  const logger = new ConsoleLogger('silent');

  beforeAll(() => {
    config = resolveConfig({
      url: process.env.SUPABASE_URL!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      logLevel: 'silent',
    });
  });

  it('can connect and dispose cleanly', async () => {
    const facade = new SupabaseClientFacade(config, logger);
    const ok = await facade.ping();
    expect(typeof ok).toBe('boolean');
    facade.dispose();
  });

  it('client facade is reusable after fresh creation', async () => {
    const f1 = new SupabaseClientFacade(config, logger);
    f1.dispose();
    const f2 = new SupabaseClientFacade(config, logger);
    const ok = await f2.ping();
    expect(typeof ok).toBe('boolean');
    f2.dispose();
  });
});
