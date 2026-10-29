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
import type { LedgerEvent, CollaborationAttributionPayload } from '../types.js';
/** Options for creating a CollaborationLedger. */
export interface CollaborationLedgerOptions {
    /** The instance id of this agent. */
    instanceId: string;
    /** The LedgerChain to append attribution events to. */
    chain: {
        append: (event: LedgerEvent) => LedgerEvent;
        length: () => number;
    };
    /** Optional key id for signing events. */
    keyId?: string;
}
/**
 * Records collaboration attribution events in the ledger.
 * Every collaboration is attributed to the capability grant that authorized it.
 */
export declare class CollaborationLedger {
    private readonly instanceId;
    private readonly chain;
    private readonly keyId;
    constructor(opts: CollaborationLedgerOptions);
    /**
     * Record a collaboration attribution event.
     */
    record(payload: CollaborationAttributionPayload): LedgerEvent;
    /**
     * Query collaboration events by source or target instance.
     */
    byInstance(instanceId: string, events: LedgerEvent[]): LedgerEvent[];
    /**
     * Query collaboration events by grant id.
     */
    byGrant(grantId: string, events: LedgerEvent[]): LedgerEvent[];
    /**
     * Query failed collaborations.
     */
    failures(events: LedgerEvent[]): LedgerEvent[];
    /**
     * Compute summary statistics from collaboration events.
     */
    summary(events: LedgerEvent[]): {
        total: number;
        successful: number;
        failed: number;
        byType: Record<string, number>;
        totalRecordsExchanged: number;
    };
}
//# sourceMappingURL=ledger.d.ts.map