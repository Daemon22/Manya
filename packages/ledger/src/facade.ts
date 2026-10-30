/**
 * @manya-os/ledger — tool-grade facade.
 *
 * A federated, tamper-evident audit trail: every recorded event is delivered
 * to live subscribers on an @manya-os/unify bus AND appended to a hash chain
 * (via @manya-os/stamp), so the full history of what happened can be
 * independently verified later, even if the bus itself is long gone.
 *
 * This facade is the composition surface used by @manya-os/guardian and
 * @manya-os/economy. The richer cryptographic LedgerChain in this package
 * remains the platform-grade implementation; the two serve different layers.
 *
 * Ported from the Manya reference implementation (packages/ledger).
 */

import { createBus, publish, subscribe, type EventBus } from '@manya-os/unify';
import { chainEntry, verifyChain, type ChainEntry, type ChainVerifyResult, type ProvenanceChain } from '@manya-os/stamp';

/** A tool-grade ledger: a bus paired with a growing hash chain. */
export interface FacadeLedger {
  name: string;
  bus: EventBus;
  chain: ChainEntry[];
}

/**
 * Creates a new ledger: an event bus paired with a growing hash chain.
 * @param options.name - Ledger name.
 * @param options.replay - Whether the underlying bus retains event history.
 */
export function createLedger(options: { name?: string; replay?: boolean } = {}): FacadeLedger {
  return {
    name: options.name || 'ledger',
    bus: createBus({ replay: options.replay !== false }),
    chain: [],
  };
}

/**
 * Records an event: publishes it on the bus for live subscribers, and
 * appends a chained, hashed entry so it becomes part of the permanent trail.
 */
export function record(
  ledger: FacadeLedger,
  topic: string,
  event: { type?: string; sourceToolId?: string; payload?: unknown }
): { delivered: number; eventId: string; publishedAt: string; entry: ChainEntry } {
  const result = publish(ledger.bus, topic, event);
  const previousHash = ledger.chain.length ? ledger.chain[ledger.chain.length - 1].hash : undefined;
  const data = Buffer.from(JSON.stringify({ topic, eventId: result.eventId, event }), 'utf8');
  const entry = chainEntry(data, previousHash, { label: topic, metadata: { eventId: result.eventId } });
  entry.index = ledger.chain.length;
  ledger.chain.push(entry);
  return { ...result, entry };
}

/** Subscribes a handler to a topic on the ledger's underlying bus. */
export function onTopic(
  ledger: FacadeLedger,
  topic: string,
  handler: (event: unknown) => void,
  options: { subscriberId?: string } = {}
): () => void {
  return subscribe(ledger.bus, topic, handler as never, options);
}

/**
 * Verifies the ledger's full chain has not been tampered with.
 */
export function verify(ledger: FacadeLedger): ChainVerifyResult {
  if (ledger.chain.length === 0) {
    return { valid: true, brokenAt: null, errors: [] };
  }
  return verifyChain({ entries: ledger.chain } as unknown as ProvenanceChain);
}

/** Unified tool-grade facade object (consumed as `ledger` by other tools). */
export const ledger = {
  create: createLedger,
  record,
  onTopic,
  verify,
};

export default ledger;
