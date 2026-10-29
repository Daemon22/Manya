/**
 * Manya Ledger — A federated, tamper-evident audit trail.
 *
 * unify's event bus already routes events across the mesh. stamp already
 * produces tamper-evident hash chains. Ledger wires them together: every
 * event that gets recorded is both delivered to subscribers *and* appended
 * to a hash chain, so the full history of what happened on the bus can be
 * independently verified later, even if the bus itself is long gone.
 */

import { createBus, subscribe, publish } from '@manya/unify';
import { chainEntry, verifyChain } from '@manya/stamp';

/**
 * Creates a new ledger: an event bus paired with a growing hash chain.
 * @param {object} [options]
 * @param {string} [options.name] - Ledger name.
 * @param {boolean} [options.replay=true] - Whether the underlying bus retains event history.
 */
export function createLedger(options = {}) {
  return {
    name: options.name || 'ledger',
    bus: createBus({ replay: options.replay !== false }),
    chain: [],
  };
}

/**
 * Records an event: publishes it on the bus for live subscribers, and
 * appends a chained, hashed entry so it becomes part of the permanent trail.
 * @param {object} ledger
 * @param {string} topic - The sync channel / topic to publish on.
 * @param {object} event - The event, shaped like unify's publish() expects.
 * @returns {{ delivered: number, eventId: string, publishedAt: string, entry: object }}
 */
export function record(ledger, topic, event) {
  const result = publish(ledger.bus, topic, event);
  const previousHash = ledger.chain.length ? ledger.chain[ledger.chain.length - 1].hash : null;
  const data = Buffer.from(JSON.stringify({ topic, eventId: result.eventId, event }), 'utf8');
  const entry = chainEntry(data, previousHash, { label: topic, metadata: { eventId: result.eventId } });
  entry.index = ledger.chain.length;
  ledger.chain.push(entry);
  return { ...result, entry };
}

/** Subscribes a handler to a topic on the ledger's underlying bus. */
export function onTopic(ledger, topic, handler, options = {}) {
  return subscribe(ledger.bus, topic, handler, options);
}

/**
 * Verifies the ledger's full chain has not been tampered with.
 * @returns {{ valid: boolean, brokenAt: number|null, errors: string[] }}
 */
export function verify(ledger) {
  if (ledger.chain.length === 0) {
    return { valid: true, brokenAt: null, errors: [] };
  }
  return verifyChain({ entries: ledger.chain });
}

export const ledger = {
  create: createLedger,
  record,
  onTopic,
  verify,
};

export default ledger;
