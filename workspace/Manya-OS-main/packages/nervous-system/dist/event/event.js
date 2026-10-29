"use strict";
/**
 * @manya-os/nervous-system — event model.
 *
 * Defines the universal `NervousEvent` shape plus a factory, JSON serializer,
 * and deserializer. Events are the smallest unit of work in the fabric.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEventId = generateEventId;
exports.isSeverity = isSeverity;
exports.createEvent = createEvent;
exports.serialize = serialize;
exports.deserialize = deserialize;
exports.eventsEqual = eventsEqual;
const node_crypto_1 = require("node:crypto");
const errors_js_1 = require("../errors.js");
/** The set of valid severity strings (kept private to this module). */
const KNOWN_SEVERITIES = new Set(['debug', 'info', 'warn', 'error']);
/**
 * Generate a stable event id. Uses `crypto.randomUUID()` when available,
 * falling back to a high-entropy timestamp+random string.
 */
function generateEventId() {
    try {
        if (typeof node_crypto_1.randomUUID === 'function')
            return (0, node_crypto_1.randomUUID)();
    }
    catch { /* fallthrough */ }
    return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
/** Returns true if `s` is a valid {@link Severity} value. */
function isSeverity(s) {
    return typeof s === 'string' && KNOWN_SEVERITIES.has(s);
}
/**
 * Create a {@link NervousEvent} with sane defaults.
 *
 * @param topic   Event topic, e.g. `'fs.change'` or `'os.metrics'`.
 * @param source  Provenance string identifying the producer.
 * @param payload Arbitrary structured payload.
 * @param opts    Optional overrides (id, timestamp, severity, tags, metadata).
 */
function createEvent(topic, source, payload, opts) {
    if (!topic || typeof topic !== 'string')
        throw new errors_js_1.NervousSystemError('Event topic is required');
    if (!source || typeof source !== 'string')
        throw new errors_js_1.NervousSystemError('Event source is required');
    const severity = opts?.severity ?? 'info';
    if (!isSeverity(severity))
        throw new errors_js_1.NervousSystemError(`Invalid severity: ${String(severity)}`);
    const event = {
        id: opts?.id ?? generateEventId(),
        topic,
        source,
        payload,
        timestamp: opts?.timestamp ?? Date.now(),
        severity,
    };
    if (opts?.tags)
        event.tags = [...opts.tags];
    if (opts?.metadata)
        event.metadata = { ...opts.metadata };
    return event;
}
/**
 * Serialize a {@link NervousEvent} to a JSON string.
 *
 * @param event The event to serialize.
 * @param pretty If true, indent with 2 spaces.
 */
function serialize(event, pretty) {
    try {
        return JSON.stringify(event, null, pretty ? 2 : 0);
    }
    catch (e) {
        throw new errors_js_1.NervousSystemError('Failed to serialize event', undefined, e);
    }
}
/**
 * Deserialize a JSON string into a {@link NervousEvent}.
 *
 * Performs structural validation: requires `id`, `topic`, `source`,
 * `timestamp`, and `severity`. Payload, tags, and metadata are passed through.
 */
function deserialize(json) {
    let parsed;
    try {
        parsed = JSON.parse(json);
    }
    catch (e) {
        throw new errors_js_1.NervousSystemError('Failed to parse event JSON', undefined, e);
    }
    if (!parsed || typeof parsed !== 'object') {
        throw new errors_js_1.NervousSystemError('Event JSON must be an object');
    }
    const obj = parsed;
    if (typeof obj.id !== 'string')
        throw new errors_js_1.NervousSystemError('Event missing string field: id');
    if (typeof obj.topic !== 'string')
        throw new errors_js_1.NervousSystemError('Event missing string field: topic');
    if (typeof obj.source !== 'string')
        throw new errors_js_1.NervousSystemError('Event missing string field: source');
    if (typeof obj.timestamp !== 'number')
        throw new errors_js_1.NervousSystemError('Event missing number field: timestamp');
    if (!isSeverity(obj.severity))
        throw new errors_js_1.NervousSystemError(`Event has invalid severity: ${String(obj.severity)}`);
    if (obj.tags !== undefined && !Array.isArray(obj.tags))
        throw new errors_js_1.NervousSystemError('Event tags must be array if present');
    if (obj.metadata !== undefined && (typeof obj.metadata !== 'object' || obj.metadata === null || Array.isArray(obj.metadata))) {
        throw new errors_js_1.NervousSystemError('Event metadata must be object if present');
    }
    const out = {
        id: obj.id,
        topic: obj.topic,
        source: obj.source,
        payload: obj.payload,
        timestamp: obj.timestamp,
        severity: obj.severity,
    };
    if (obj.tags !== undefined)
        out.tags = obj.tags;
    if (obj.metadata !== undefined)
        out.metadata = obj.metadata;
    return out;
}
/** Deep structural equality for two events (used by tests / recorders). */
function eventsEqual(a, b) {
    return serialize(a) === serialize(b);
}
//# sourceMappingURL=event.js.map