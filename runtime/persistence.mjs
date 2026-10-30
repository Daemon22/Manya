/**
 * @manya-os/runtime — persistence wiring.
 *
 * Wires the @manya-os/supabase persistence backbone into the runtime when
 * the environment provides connection settings:
 *
 *   SUPABASE_URL                  e.g. https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY     service-role key (server-side only)
 *   SUPABASE_MIGRATE_ON_START     optional, "true" runs migrations at boot
 *
 * Without these variables the runtime stays fully functional in
 * in-memory mode; every wiring point degrades gracefully and reports its
 * mode through GET /api/persistence.
 */

import { configFromEnv, SupabaseClientFacade } from '@manya-os/supabase';
import { SupabaseLedgerStore } from '@manya-os/supabase';
import { SupabaseMemoryStore } from '@manya-os/supabase';
import { SilentLogger, ConsoleLogger } from '@manya-os/keyring';

export function persistenceEnabled() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Boots the persistence layer.
 * @returns {{
 *   mode: 'in-memory'|'supabase',
 *   ledgerStore: object|null,
 *   memoryStore: object|null,
 *   facade: object|null,
 *   status: () => object,
 *   mirrorLedgerEvent: (event: object) => Promise<void>,
 *   failureTolerantMemoryStore: () => object|null,
 *   close: () => Promise<void>,
 * }}
 */
export function initPersistence({ logLevel = 'info' } = {}) {
  const counters = { mirrored: 0, failures: 0, lastError: null };

  if (!persistenceEnabled()) {
    return {
      mode: 'in-memory',
      ledgerStore: null,
      memoryStore: null,
      facade: null,
      status: () => ({ mode: 'in-memory', mirrored: counters.mirrored, failures: counters.failures }),
      mirrorLedgerEvent: async () => {},
      failureTolerantMemoryStore: () => null,
      close: async () => {},
    };
  }

  const logger = logLevel === 'silent' ? new SilentLogger() : new ConsoleLogger(logLevel);
  const config = configFromEnv();
  const facade = new SupabaseClientFacade(config, logger);
  const client = facade.getClient();
  const ledgerStore = new SupabaseLedgerStore(client, config, logger);
  const memoryStore = new SupabaseMemoryStore(client, config, logger);

  async function mirrorLedgerEvent(event) {
    if (!event) return;
    try {
      await ledgerStore.append(event);
      counters.mirrored++;
    } catch (error) {
      // Persistence must never break the runtime surface: count and continue.
      counters.failures++;
      counters.lastError = String(error && error.message ? error.message : error);
    }
  }

  /** Wraps the Supabase memory store so storage outages never throw into the API. */
  function failureTolerantMemoryStore() {
    const passthrough = (method, ...args) => {
      const result = memoryStore[method](...args);
      if (result && typeof result.then === 'function') {
        return result.catch((error) => {
          counters.failures++;
          counters.lastError = String(error && error.message ? error.message : error);
          return method.startsWith('get') || method.startsWith('list') || method.startsWith('find')
            ? null
            : undefined;
        });
      }
      return result;
    };
    return {
      putEpisodic: (...a) => passthrough('putEpisodic', ...a),
      getEpisodic: (...a) => passthrough('getEpisodic', ...a),
      deleteEpisodic: (...a) => passthrough('deleteEpisodic', ...a),
      listEpisodic: (...a) => passthrough('listEpisodic', ...a),
      pruneEpisodic: (...a) => passthrough('pruneEpisodic', ...a),
      putSemantic: (...a) => passthrough('putSemantic', ...a),
      getSemantic: (...a) => passthrough('getSemantic', ...a),
      deleteSemantic: (...a) => passthrough('deleteSemantic', ...a),
      findSemantic: (...a) => passthrough('findSemantic', ...a),
      updateSemanticConfidence: (...a) => passthrough('updateSemanticConfidence', ...a),
      putLongterm: (...a) => passthrough('putLongterm', ...a),
      getLongterm: (...a) => passthrough('getLongterm', ...a),
      deleteLongterm: (...a) => passthrough('deleteLongterm', ...a),
      listLongterm: (...a) => passthrough('listLongterm', ...a),
      touchLongterm: (...a) => passthrough('touchLongterm', ...a),
    };
  }

  return {
    mode: 'supabase',
    ledgerStore,
    memoryStore,
    facade,
    status: () => ({
      mode: 'supabase',
      url: config.url,
      tables: config.tables,
      migrateOnStart: config.migrateOnStart === true,
      mirrored: counters.mirrored,
      failures: counters.failures,
      lastError: counters.lastError,
    }),
    mirrorLedgerEvent,
    failureTolerantMemoryStore,
    close: async () => {
      try { facade.dispose(); } catch { /* already disposed */ }
    },
  };
}
