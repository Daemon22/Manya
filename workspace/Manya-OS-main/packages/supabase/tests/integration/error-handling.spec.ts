/**
 * @manya-os/supabase — integration test: error handling.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { SupabaseClientFacade } from '../../src/client.js';
import { SupabaseLedgerStore } from '../../src/ledger/supabase-ledger-store.js';
import { resolveConfig } from '../../src/config.js';
import { ConsoleLogger } from '../../src/logging.js';
import { ConfigError } from '../../src/errors.js';

const INTEGRATION = process.env.SUPABASE_INTEGRATION_TEST === 'true';
const describeIfIntegration = INTEGRATION ? describe : describe.skip;

describeIfIntegration('Error Handling', () => {
  const logger = new ConsoleLogger('silent');

  it('throws ConfigError for invalid URL', () => {
    expect(() => resolveConfig({
      url: 'not-a-url',
      serviceRoleKey: 'key',
    })).toThrow(ConfigError);
  });

  it('throws ConfigError for missing service role key', () => {
    expect(() => resolveConfig({
      url: 'https://test.supabase.co',
      serviceRoleKey: '',
    })).toThrow(ConfigError);
  });

  it('handles connection to wrong URL gracefully', async () => {
    const config = resolveConfig({
      url: 'https://nonexistent-project.supabase.co',
      serviceRoleKey: 'fake-key',
      logLevel: 'silent',
    });
    const facade = new SupabaseClientFacade(config, logger);
    const ok = await facade.ping();
    expect(ok).toBe(false);
    facade.dispose();
  });
});
