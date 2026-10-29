/**
 * Manya Core Runtime — composition root.
 *
 * Boots ONE connected Manya runtime from the packages that previously sat
 * disconnected:
 *
 *   - @manya/unify          mesh + event bus + federation (in-process nervous system)
 *   - @manya/nervous-system EventFabric with recorder + metrics (now consumed at runtime)
 *   - @manya/knowledge      reference-based knowledge sharing (Cortex behavior)
 *   - @manya/foundation     HAEL Foundation people-and-organization domain
 *   - @manya/transport      WebSocket transport + presence (remote nervous system)
 *
 * Wiring:
 *   - unify bus channels  ->  transport (outbound events to peers)
 *   - transport frames    ->  unify bus (inbound events, marked remote)
 *   - transport presence  ->  foundation.attachPresence (Domain A -> Domain B map)
 *   - fabric records      ->  every bus event (recording optional)
 *
 * Two Manya cores started with matching secrets form a live mesh: events
 * published on one appear on the other, and each sees the other's entities
 * in its presence map.
 */

import * as unify from '@manya/unify';
import * as transportModule from '@manya/transport';
import { createKnowledgeRegistry } from '@manya/knowledge';
import { createFoundation } from '@manya/foundation';
import { EventFabric, createEvent } from '@manya/nervous-system';
import { foundationManifest, knowledgeManifest, transportManifest } from '@manya/toolkit';
import { randomUUID } from 'node:crypto';

const DEFAULT_CHANNELS = [
  'knowledge-published',
  'knowledge-leased',
  'knowledge-read',
  'foundation:profile-updated',
  'foundation:organization-registered',
  'foundation:relationship-linked',
  'foundation:role-assigned',
  'event-routed',
  'capability-dispatched',
  'presence-changed',
  'runtime-started',
];

/**
 * Creates a Manya core runtime.
 * @param {object} [options]
 * @param {object} [options.identity] - { id, kind, displayName, domains, capabilities }
 * @param {'server'|'client'} [options.mode='server'] - transport role.
 * @param {{ port?: number, host?: string, path?: string }} [options.listen]
 * @param {string} [options.url] - relay URL when mode='client'.
 * @param {string} [options.secret] - shared secret for peer authentication.
 * @param {string[]} [options.channels] - bus channels bridged to the transport.
 * @param {string[]} [options.stewards] - Foundation steward subject ids.
 * @param {boolean} [options.recordEvents=false] - keep a fabric event recording ring buffer.
 */
export function createManyaCore(options = {}) {
  const identity = options.identity || {
    id: `manya-core-${randomUUID().slice(0, 6)}`,
    kind: 'service',
    displayName: 'Manya Core',
    domains: ['technical', 'foundation'],
  };
  const channels = options.channels || DEFAULT_CHANNELS;

  // -- Subsystems -------------------------------------------------------------
  const bus = unify.createBus({ replay: true, maxHistory: 2000 });
  const fabric = new EventFabric({ recordByDefault: !!options.recordEvents, logLevel: 'silent' });
  const knowledge = createKnowledgeRegistry({ registryId: `knowledge:${identity.id}` });
  const foundation = createFoundation({ stewards: options.stewards || [] });
  const transport = transportModule.createTransport({
    mode: options.mode || 'server',
    identity,
    listen: options.listen,
    url: options.url,
    secret: options.secret,
  });

  // Knowledge actions become bus events (and therefore mesh events + fabric records).
  const rawPublish = knowledge.publish.bind(knowledge);
  knowledge.publish = (registry, owner, input) => {
    const result = rawPublish(registry, owner, input);
    unify.publish(bus, 'knowledge-published', {
      type: 'knowledge-published',
      sourceToolId: 'knowledge',
      payload: result,
    });
    return result;
  };
  const rawLease = knowledge.lease.bind(knowledge);
  knowledge.lease = (registry, ref, subject, leaseOptions) => {
    const result = rawLease(registry, ref, subject, leaseOptions);
    unify.publish(bus, 'knowledge-leased', {
      type: 'knowledge-leased',
      sourceToolId: 'knowledge',
      payload: { ref: result.ref, subject: result.subject, leaseId: result.leaseId },
    });
    return result;
  };

  // -- Wiring -------------------------------------------------------------------
  const unsubs = [];

  // 1. Local bus -> fabric (observability + recorder + metrics)
  for (const channel of channels) {
    const off = unify.subscribe(bus, channel, (event) => {
      try {
        fabric.publish(createEvent(channel, event.sourceToolId || identity.id, event.payload, {
          severity: 'info',
          tags: ['manya-bus'],
        }));
      } catch { /* fabric must not break the bus */ }
    }, { subscriberId: 'core-fabric' });
    unsubs.push(off);
  }

  // 2. Local bus -> transport (outbound)
  const bridge = transportModule.bridgeBusToTransport({ bus, transport, channels, unify });
  unsubs.push(bridge.detach);

  // 3. Transport -> local bus happens inside bridgeBusToTransport (inbound).

  // 4. Transport presence -> Foundation (Domain A entities become visible to Domain B)
  foundation.attachPresence(foundation, transport.presence);

  // 5. Peer joins/leaves become bus events
  unsubs.push(transport.onPeer((event, peer) => {
    unify.publish(bus, 'presence-changed', {
      type: `peer-${event}`,
      sourceToolId: 'transport',
      payload: { identity: peer.identity },
    });
  }));

  let started = false;

  const core = {
    identity,
    bus,
    fabric,
    knowledge,
    foundation,
    transport,
    bridge,

    /** Boots the transport (and reports readiness). */
    async start() {
      if (started) return core;
      await transport.start();
      started = true;
      unify.publish(bus, 'runtime-started', {
        type: 'runtime-started',
        sourceToolId: 'core-runtime',
        payload: { identity: identity.id, mode: transport.mode, url: transport.url },
      });
      return core;
    },

    /** Registers the core's own packages as mesh tools (capability routing).
     *  Idempotent: the unify mesh is a module singleton, so tools already
     *  registered by a previous core in the same process are skipped. */
    registerSelf() {
      const registered = new Set(unify.listTools().map((t) => t.toolId));
      if (!registered.has('foundation')) {
        unify.registerTool({
          manifest: foundationManifest,
          api: {
            upsertProfile: (...args) => foundation.upsertProfile(foundation, ...args),
            listProfiles: (...args) => foundation.listProfiles(foundation, ...args),
            searchDirectory: (...args) => foundation.searchDirectory(foundation, ...args),
            relationshipGraph: (...args) => foundation.relationshipGraph(foundation, ...args),
            link: (...args) => foundation.link(foundation, ...args),
            stats: () => foundation.stats(foundation),
          },
        });
      }
      if (!registered.has('knowledge')) {
        unify.registerTool({
          manifest: knowledgeManifest,
          api: {
            publish: (...args) => knowledge.publish(knowledge, ...args),
            query: (...args) => knowledge.query(knowledge, ...args),
            lease: (...args) => knowledge.lease(knowledge, ...args),
            read: (...args) => knowledge.read(knowledge, ...args),
            grantAccess: (...args) => knowledge.grantAccess(knowledge, ...args),
            stats: () => knowledge.stats(knowledge),
          },
        });
      }
      if (!registered.has('transport')) {
        unify.registerTool({
          manifest: transportManifest,
          api: {
            status: () => core.status(),
            publishEvent: (...args) => transport.publishEvent(...args),
            listPeers: () => transport.listPeers(),
            listEntities: (...args) => transport.presence.list(...args),
          },
        });
      }
      return core;
    },

    /** Live status snapshot for dashboards. */
    status() {
      const metrics = fabric.metrics ? fabric.metrics.snapshot() : null;
      return {
        identity: identity.id,
        mode: transport.mode,
        url: transport.url,
        started,
        mesh: unify.listTools().map((t) => t.toolId),
        peers: transport.listPeers().length,
        presence: transport.presence.size(),
        knowledge: knowledge.stats(knowledge),
        foundation: foundation.stats(foundation),
        busEvents: bus.eventCount,
        fabric: metrics ? {
          published: metrics.eventsPublished,
          delivered: metrics.eventsDelivered,
          p50LatencyMs: metrics.p50LatencyMs,
          p99LatencyMs: metrics.p99LatencyMs,
        } : null,
        bridge: { inbound: bridge.inbound, outbound: bridge.outbound },
      };
    },

    async stop() {
      for (const off of unsubs) {
        try { off(); } catch { /* already detached */ }
      }
      unsubs.length = 0;
      await transport.stop();
      fabric.shutdown();
      started = false;
      return core;
    },
  };

  return core;
}

/**
 * Convenience: boots two connected cores on ephemeral ports for demos/tests.
 * @param {object} [opts] - { a: coreOptions, b: coreOptions }
 */
export async function createConnectedCores(opts = {}) {
  const { createServer } = await import('node:http');
  const freePort = () => new Promise((resolve) => {
    const srv = createServer(() => {});
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
  const port = await freePort();
  const coreA = createManyaCore({
    identity: { id: 'core-a', kind: 'service', displayName: 'Core A', domains: ['technical', 'foundation'] },
    listen: { port, host: '127.0.0.1' },
    ...opts.a,
  });
  await coreA.start();
  const coreB = createManyaCore({
    identity: { id: 'core-b', kind: 'service', displayName: 'Core B', domains: ['technical', 'foundation'] },
    mode: 'client',
    url: coreA.transport.url,
    ...opts.b,
  });
  await coreB.start();
  return { coreA, coreB, port, async stop() { await coreB.stop(); await coreA.stop(); } };
}
