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

import { LedgerError } from '../errors.js';
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
export class CollaborationLedger {
  private readonly instanceId: string;
  private readonly chain: CollaborationLedgerOptions['chain'];
  private readonly keyId: string;

  constructor(opts: CollaborationLedgerOptions) {
    if (!opts.instanceId) {
      throw new LedgerError('instanceId is required');
    }
    if (!opts.chain?.append || typeof opts.chain.append !== 'function') {
      throw new LedgerError('chain must provide an append method');
    }
    this.instanceId = opts.instanceId;
    this.chain = opts.chain;
    this.keyId = opts.keyId ?? 'unknown';
  }

  /**
   * Record a collaboration attribution event.
   */
  record(payload: CollaborationAttributionPayload): LedgerEvent {
    if (!payload.collaborationType) {
      throw new LedgerError('collaborationType is required');
    }
    if (!payload.sourceInstanceId || !payload.targetInstanceId) {
      throw new LedgerError('sourceInstanceId and targetInstanceId are required');
    }
    if (payload.startedAt <= 0 || payload.completedAt <= 0) {
      throw new LedgerError('startedAt and completedAt must be positive');
    }
    if (payload.completedAt < payload.startedAt) {
      throw new LedgerError('completedAt must not be before startedAt');
    }

    const event: LedgerEvent = {
      id: `collab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      seq: 0, // Will be set by the chain on append.
      type: 'collaboration.attribution',
      actor: this.instanceId,
      timestamp: new Date().toISOString(),
      prevHash: '0'.repeat(64),
      hash: '', // Will be computed by the chain on append.
      payload: payload as unknown as Record<string, unknown>,
    };

    return this.chain.append(event);
  }

  /**
   * Query collaboration events by source or target instance.
   */
  byInstance(instanceId: string, events: LedgerEvent[]): LedgerEvent[] {
    return events.filter(e => {
      if (e.type !== 'collaboration.attribution') return false;
      const p = e.payload as unknown as CollaborationAttributionPayload;
      return p.sourceInstanceId === instanceId || p.targetInstanceId === instanceId;
    });
  }

  /**
   * Query collaboration events by grant id.
   */
  byGrant(grantId: string, events: LedgerEvent[]): LedgerEvent[] {
    return events.filter(e => {
      if (e.type !== 'collaboration.attribution') return false;
      const p = e.payload as unknown as CollaborationAttributionPayload;
      return p.grantId === grantId;
    });
  }

  /**
   * Query failed collaborations.
   */
  failures(events: LedgerEvent[]): LedgerEvent[] {
    return events.filter(e => {
      if (e.type !== 'collaboration.attribution') return false;
      const p = e.payload as unknown as CollaborationAttributionPayload;
      return !p.success;
    });
  }

  /**
   * Compute summary statistics from collaboration events.
   */
  summary(events: LedgerEvent[]): {
    total: number;
    successful: number;
    failed: number;
    byType: Record<string, number>;
    totalRecordsExchanged: number;
  } {
    const collabEvents = events.filter(e => e.type === 'collaboration.attribution');
    let successful = 0;
    let failed = 0;
    let totalRecordsExchanged = 0;
    const byType: Record<string, number> = {};

    for (const e of collabEvents) {
      const p = e.payload as unknown as CollaborationAttributionPayload;
      if (p.success) successful++;
      else failed++;
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
