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
import { type EventBus } from '@manya-os/unify';
import { type ChainEntry, type ChainVerifyResult } from '@manya-os/stamp';
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
export declare function createLedger(options?: {
    name?: string;
    replay?: boolean;
}): FacadeLedger;
/**
 * Records an event: publishes it on the bus for live subscribers, and
 * appends a chained, hashed entry so it becomes part of the permanent trail.
 */
export declare function record(ledger: FacadeLedger, topic: string, event: {
    type?: string;
    sourceToolId?: string;
    payload?: unknown;
}): {
    delivered: number;
    eventId: string;
    publishedAt: string;
    entry: ChainEntry;
};
/** Subscribes a handler to a topic on the ledger's underlying bus. */
export declare function onTopic(ledger: FacadeLedger, topic: string, handler: (event: unknown) => void, options?: {
    subscriberId?: string;
}): () => void;
/**
 * Verifies the ledger's full chain has not been tampered with.
 */
export declare function verify(ledger: FacadeLedger): ChainVerifyResult;
/** Unified tool-grade facade object (consumed as `ledger` by other tools). */
export declare const ledger: {
    create: typeof createLedger;
    record: typeof record;
    onTopic: typeof onTopic;
    verify: typeof verify;
};
export default ledger;
//# sourceMappingURL=facade.d.ts.map