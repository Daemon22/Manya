"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ledger = void 0;
exports.createLedger = createLedger;
exports.record = record;
exports.onTopic = onTopic;
exports.verify = verify;
const unify_1 = require("@manya-os/unify");
const stamp_1 = require("@manya-os/stamp");
/**
 * Creates a new ledger: an event bus paired with a growing hash chain.
 * @param options.name - Ledger name.
 * @param options.replay - Whether the underlying bus retains event history.
 */
function createLedger(options = {}) {
    return {
        name: options.name || 'ledger',
        bus: (0, unify_1.createBus)({ replay: options.replay !== false }),
        chain: [],
    };
}
/**
 * Records an event: publishes it on the bus for live subscribers, and
 * appends a chained, hashed entry so it becomes part of the permanent trail.
 */
function record(ledger, topic, event) {
    const result = (0, unify_1.publish)(ledger.bus, topic, event);
    const previousHash = ledger.chain.length ? ledger.chain[ledger.chain.length - 1].hash : undefined;
    const data = Buffer.from(JSON.stringify({ topic, eventId: result.eventId, event }), 'utf8');
    const entry = (0, stamp_1.chainEntry)(data, previousHash, { label: topic, metadata: { eventId: result.eventId } });
    entry.index = ledger.chain.length;
    ledger.chain.push(entry);
    return { ...result, entry };
}
/** Subscribes a handler to a topic on the ledger's underlying bus. */
function onTopic(ledger, topic, handler, options = {}) {
    return (0, unify_1.subscribe)(ledger.bus, topic, handler, options);
}
/**
 * Verifies the ledger's full chain has not been tampered with.
 */
function verify(ledger) {
    if (ledger.chain.length === 0) {
        return { valid: true, brokenAt: null, errors: [] };
    }
    return (0, stamp_1.verifyChain)({ entries: ledger.chain });
}
/** Unified tool-grade facade object (consumed as `ledger` by other tools). */
exports.ledger = {
    create: createLedger,
    record,
    onTopic,
    verify,
};
exports.default = exports.ledger;
//# sourceMappingURL=facade.js.map