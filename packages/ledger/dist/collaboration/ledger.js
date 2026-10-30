"use strict";
/**
 * @manya-os/ledger — collaboration attribution.
 *
 * Records collaboration attribution events in the ledger, providing full
 * provenance for every data exchange between instances. Every collaboration
 * is attributable to the specific capability grant that authorized it.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaborationLedger = void 0;
const errors_js_1 = require("../errors.js");
/**
 * Records collaboration attribution events in the ledger.
 * Every collaboration is attributed to the capability grant that authorized it.
 */
class CollaborationLedger {
    instanceId;
    chain;
    keyId;
    constructor(opts) {
        if (!opts.instanceId) {
            throw new errors_js_1.LedgerError('instanceId is required');
        }
        if (!opts.chain?.append || typeof opts.chain.append !== 'function') {
            throw new errors_js_1.LedgerError('chain must provide an append method');
        }
        this.instanceId = opts.instanceId;
        this.chain = opts.chain;
        this.keyId = opts.keyId ?? 'unknown';
    }
    /**
     * Record a collaboration attribution event.
     */
    record(payload) {
        if (!payload.collaborationType) {
            throw new errors_js_1.LedgerError('collaborationType is required');
        }
        if (!payload.sourceInstanceId || !payload.targetInstanceId) {
            throw new errors_js_1.LedgerError('sourceInstanceId and targetInstanceId are required');
        }
        if (payload.startedAt <= 0 || payload.completedAt <= 0) {
            throw new errors_js_1.LedgerError('startedAt and completedAt must be positive');
        }
        if (payload.completedAt < payload.startedAt) {
            throw new errors_js_1.LedgerError('completedAt must not be before startedAt');
        }
        const event = {
            id: `collab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            seq: 0, // Will be set by the chain on append.
            type: 'collaboration.attribution',
            actor: this.instanceId,
            timestamp: new Date().toISOString(),
            prevHash: '0'.repeat(64),
            hash: '', // Will be computed by the chain on append.
            payload: payload,
        };
        return this.chain.append(event);
    }
    /**
     * Query collaboration events by source or target instance.
     */
    byInstance(instanceId, events) {
        return events.filter(e => {
            if (e.type !== 'collaboration.attribution')
                return false;
            const p = e.payload;
            return p.sourceInstanceId === instanceId || p.targetInstanceId === instanceId;
        });
    }
    /**
     * Query collaboration events by grant id.
     */
    byGrant(grantId, events) {
        return events.filter(e => {
            if (e.type !== 'collaboration.attribution')
                return false;
            const p = e.payload;
            return p.grantId === grantId;
        });
    }
    /**
     * Query failed collaborations.
     */
    failures(events) {
        return events.filter(e => {
            if (e.type !== 'collaboration.attribution')
                return false;
            const p = e.payload;
            return !p.success;
        });
    }
    /**
     * Compute summary statistics from collaboration events.
     */
    summary(events) {
        const collabEvents = events.filter(e => e.type === 'collaboration.attribution');
        let successful = 0;
        let failed = 0;
        let totalRecordsExchanged = 0;
        const byType = {};
        for (const e of collabEvents) {
            const p = e.payload;
            if (p.success)
                successful++;
            else
                failed++;
            totalRecordsExchanged += p.recordCount ?? 0;
            byType[p.collaborationType] = (byType[p.collaborationType] ?? 0) + 1;
        }
        return {
            total: collabEvents.length,
            successful,
            failed,
            byType,
            totalRecordsExchanged,
        };
    }
}
exports.CollaborationLedger = CollaborationLedger;
//# sourceMappingURL=ledger.js.map