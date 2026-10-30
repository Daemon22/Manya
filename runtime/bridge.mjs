/**
 * @manya-os/runtime — bridge wiring.
 *
 * Connects the runtime's EventFabric to Manya's remote nervous system
 * (the @manya/transport relay) through @manya-os/bridge when the
 * environment provides a relay endpoint:
 *
 *   MANYA_OS_BRIDGE_URL        e.g. ws://manya-host:8787/wire
 *   MANYA_OS_BRIDGE_SECRET     shared secret for HMAC-proved hello
 *   MANYA_OS_BRIDGE_IDENTITY   identity id (default: manya-os-<runtime id>)
 *
 * Outbound: every event published on the fabric flows to the relay
 * (loop prevention drops wire-sourced echoes).
 * Inbound: relay events are published into the fabric tagged `wire`, and
 * `collaboration.request` frames are additionally routed to the platform's
 * CollaborationRequestQueue.
 */

import { createBridgeClient } from '@manya-os/bridge';
import { createEvent } from '@manya-os/nervous-system';

export function bridgeEnabled() {
  return Boolean(process.env.MANYA_OS_BRIDGE_URL);
}

/**
 * Boots the bridge layer.
 * @param {object} deps
 * @param {object} deps.fabric - the runtime EventFabric (on/publish surface).
 * @param {object} deps.queue - a CollaborationRequestQueue instance.
 * @param {string} deps.identityId - runtime identity string.
 * @returns {{
 *   mode: 'standalone'|'bridged',
 *   client: object|null,
 *   status: () => object,
 *   publishEvent: (input: object) => number,
 *   stop: () => Promise<void>,
 * }}
 */
export function initBridge({ fabric, queue, identityId }) {
  if (!bridgeEnabled()) {
    return {
      mode: 'standalone',
      client: null,
      status: () => ({ mode: 'standalone' }),
      publishEvent: () => 0,
      stop: async () => {},
    };
  }

  // Adapter so the bridge's fabric contract (on/publish with its own event
  // shape) maps onto the platform EventFabric. Inbound wire events are
  // republished with `via: 'wire'` metadata; the bridge's outbound filter
  // then drops them, closing the loop.
  const bridgeFabric = {
    on(type, handler) {
      fabric.on(type, handler);
      return () => fabric.off && fabric.off(type, handler);
    },
    publish(event) {
      return fabric.publish(createWireEvent(event));
    },
  };

  function createWireEvent(event) {
    return createEvent(event.topic || 'wire.remote', event.source || 'wire', event.payload, {
      severity: 'info',
      tags: ['wire'],
      metadata: { via: 'wire', origin: event.metadata && event.metadata.origin },
    });
  }

  const client = createBridgeClient({
    url: process.env.MANYA_OS_BRIDGE_URL,
    identity: {
      id: process.env.MANYA_OS_BRIDGE_IDENTITY || `manya-os-${identityId.split(':').pop()}`,
      kind: 'intelligence',
      displayName: 'Manya-OS Runtime',
      domains: ['technical', 'foundation'],
      capabilities: ['memory', 'reason', 'events', 'ledger', 'governance'],
    },
    secret: process.env.MANYA_OS_BRIDGE_SECRET || undefined,
    fabric: bridgeFabric,
    collaborationQueue: queue,
  });

  // Announce the runtime on the wire the moment the relay accepts us —
  // boot-time events (runtime.started) fire before the connection exists,
  // so this is the reliable "the OS is now on the mesh" signal.
  let announced = false;
  client.onFrame((frame) => {
    if (!announced && frame.type === 'welcome') {
      announced = true;
      try {
        fabric.publish(createEvent('runtime.bridge.connected', identityId, {
          url: process.env.MANYA_OS_BRIDGE_URL,
          bridgeIdentity: client.identity.id,
        }, { tags: ['bridge'], metadata: { via: 'runtime' } }));
      } catch { /* announcement must never break the bridge */ }
    }
  });

  return {
    mode: 'bridged',
    client,
    status: () => ({
      mode: 'bridged',
      url: process.env.MANYA_OS_BRIDGE_URL,
      connected: client.connected,
      stats: { ...client.stats },
    }),
    publishEvent(input) {
      return client.publishEvent(input);
    },
    stop: async () => {
      await client.stop();
    },
  };
}
