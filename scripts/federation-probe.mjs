#!/usr/bin/env node
/**
 * Cross-repo federation test: a Manya-OS bridge client connects to the LIVE
 * Manya serve relay (ws://127.0.0.1:3100/wire), announces itself, publishes
 * an event, and observes Manya's response frames. Proves wire-protocol
 * interop between the two repos' independent implementations.
 * Expects the Manya serve to be running on :3100.
 */
import { createBridgeClient } from '@manya-os/bridge';

const url = process.argv[2] || 'ws://127.0.0.1:3100/wire';
const frames = [];
const bridge = createBridgeClient({
  url,
  identity: { id: 'os-federation-probe', kind: 'intelligence', displayName: 'Manya-OS Probe', domains: ['technical', 'foundation'] },
});
bridge.onFrame((f) => frames.push(f));

await new Promise((r) => setTimeout(r, 1500));
const connected = bridge.connected;
const welcomed = frames.some((f) => f.type === 'welcome');
const presence = frames.filter((f) => f.type === 'presence').map((f) => f.payload?.status);

let published = bridge.publishEvent({ topic: 'os.hello', type: 'probe', sourceToolId: 'federation-test', payload: { from: 'manya-os', at: Date.now() } });
await new Promise((r) => setTimeout(r, 800));

console.log(JSON.stringify({
  connected,
  welcomed,
  presenceSeen: presence,
  published,
  stats: { ...bridge.stats },
}, null, 2));

await bridge.stop();
process.exit(connected && welcomed ? 0 : 1);
