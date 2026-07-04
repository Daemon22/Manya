/**
 * @manya/constitution — conflict resolution.
 *
 * `ConflictResolver.resolveConflict(conflict, strategy)` returns a
 * `ConflictResolution`. The resolver is intentionally simple and
 * deterministic: it does not call out to any external authority, and the
 * resolution text is derived from the strategy and conflict fields.
 *
 * Strategies:
 *   - `consensus`   — resolution only when all parties agree (parties.length
 *                      must equal `agreements` count passed in options);
 *                      otherwise reports dissenters.
 *   - `majority`    — resolution by simple majority (>= ceil(n/2) agreements).
 *   - `authority`   — resolution by the highest-authority party (provided via
 *                      `options.authorities`).
 *   - `arbitration` — resolution by an external arbitrator (provided via
 *                      `options.arbitrator`).
 *   - `escalation`  — escalate to a higher decision authority; the resolution
 *                      text indicates escalation.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type {
  Conflict, ConflictResolution, ConflictSeverity, ResolutionStrategy,
} from '../types.js';
import { ConflictError } from '../errors.js';

/** All valid resolution strategies. */
export const RESOLUTION_STRATEGIES: ReadonlyArray<ResolutionStrategy> = [
  'consensus', 'majority', 'authority', 'arbitration', 'escalation',
];

/** All valid conflict severities, ordered least-to-most severe. */
export const CONFLICT_SEVERITIES: ReadonlyArray<ConflictSeverity> = [
  'low', 'medium', 'high', 'critical',
];

/** Options accepted by `ConflictResolver.resolveConflict`. */
export interface ResolveOptions {
  /**
   * Parties that agree with the proposed resolution. Required for
   * `consensus` and `majority` strategies.
   */
  agreements?: string[];
  /**
   * Map of party id → authority level. Required for `authority` strategy.
   */
  authorities?: Record<string, number>;
  /**
   * Name of the external arbitrator. Required for `arbitration` strategy.
   */
  arbitrator?: string;
  /**
   * Free-text proposed resolution. Defaults to "Resolve per <strategy>".
   */
  proposedResolution?: string;
}

/** Validates a `Conflict` structurally. Throws `ConflictError` on invalid fields. */
export function validateConflict(conflict: Conflict): void {
  if (!conflict || typeof conflict !== 'object') {
    throw new ConflictError('conflict must be an object');
  }
  if (typeof conflict.id !== 'string' || conflict.id.length === 0) {
    throw new ConflictError('conflict.id must be a non-empty string');
  }
  if (!Array.isArray(conflict.parties) || conflict.parties.length < 2) {
    throw new ConflictError('conflict.parties must have at least 2 entries');
  }
  if (typeof conflict.description !== 'string' || conflict.description.length === 0) {
    throw new ConflictError('conflict.description must be a non-empty string');
  }
  if (!CONFLICT_SEVERITIES.includes(conflict.severity)) {
    throw new ConflictError(`conflict.severity must be one of: ${CONFLICT_SEVERITIES.join(', ')}`);
  }
  // Duplicate parties
  const seen = new Set<string>();
  for (const p of conflict.parties) {
    if (typeof p !== 'string' || p.length === 0) {
      throw new ConflictError('each party must be a non-empty string');
    }
    if (seen.has(p)) {
      throw new ConflictError(`duplicate party: ${p}`);
    }
    seen.add(p);
  }
}

/**
 * Stateless conflict resolver. Construct one and call `resolveConflict` with
 * a strategy and options.
 */
export class ConflictResolver {
  /** Resolves `conflict` using `strategy` and the provided `options`. */
  resolveConflict(
    conflict: Conflict,
    strategy: ResolutionStrategy,
    options: ResolveOptions = {},
  ): ConflictResolution {
    validateConflict(conflict);
    if (!RESOLUTION_STRATEGIES.includes(strategy)) {
      throw new ConflictError(`unknown strategy: ${strategy}`);
    }
    const proposed = options.proposedResolution ?? `Resolve per ${strategy}`;
    switch (strategy) {
      case 'consensus':
        return this.resolveConsensus(conflict, options, proposed);
      case 'majority':
        return this.resolveMajority(conflict, options, proposed);
      case 'authority':
        return this.resolveAuthority(conflict, options, proposed);
      case 'arbitration':
        return this.resolveArbitration(conflict, options, proposed);
      case 'escalation':
        return this.resolveEscalation(conflict, proposed);
      default:
        throw new ConflictError(`unhandled strategy: ${strategy}`);
    }
  }

  private resolveConsensus(
    conflict: Conflict,
    options: ResolveOptions,
    proposed: string,
  ): ConflictResolution {
    if (!Array.isArray(options.agreements)) {
      throw new ConflictError('consensus strategy requires options.agreements');
    }
    const agreed = new Set(options.agreements);
    const dissenters = conflict.parties.filter((p) => !agreed.has(p));
    if (dissenters.length === 0) {
      return {
        resolution: proposed,
        reason: 'all parties agreed',
        strategy: 'consensus',
      };
    }
    return {
      resolution: 'No consensus reached; escalation required',
      reason: `${dissenters.length} of ${conflict.parties.length} parties dissented`,
      dissenters,
      strategy: 'consensus',
    };
  }

  private resolveMajority(
    conflict: Conflict,
    options: ResolveOptions,
    proposed: string,
  ): ConflictResolution {
    if (!Array.isArray(options.agreements)) {
      throw new ConflictError('majority strategy requires options.agreements');
    }
    const agreed = new Set(options.agreements);
    const agreeCount = conflict.parties.filter((p) => agreed.has(p)).length;
    const needed = Math.ceil(conflict.parties.length / 2);
    if (agreeCount >= needed) {
      return {
        resolution: proposed,
        reason: `${agreeCount} of ${conflict.parties.length} parties agreed (needed ${needed})`,
        dissenters: conflict.parties.filter((p) => !agreed.has(p)),
        strategy: 'majority',
      };
    }
    return {
      resolution: 'No majority; escalation required',
      reason: `only ${agreeCount} of ${conflict.parties.length} agreed (needed ${needed})`,
      dissenters: conflict.parties.filter((p) => !agreed.has(p)),
      strategy: 'majority',
    };
  }

  private resolveAuthority(
    conflict: Conflict,
    options: ResolveOptions,
    proposed: string,
  ): ConflictResolution {
    if (!options.authorities || typeof options.authorities !== 'object') {
      throw new ConflictError('authority strategy requires options.authorities');
    }
    let topParty: string | undefined;
    let topAuth = -Infinity;
    for (const p of conflict.parties) {
      const a = options.authorities[p];
      if (typeof a !== 'number') {
        throw new ConflictError(`authority strategy: missing authority for party ${p}`);
      }
      if (a > topAuth) {
        topAuth = a;
        topParty = p;
      }
    }
    return {
      resolution: proposed,
      reason: `decided by highest-authority party ${topParty} (authority ${topAuth})`,
      dissenters: conflict.parties.filter((p) => p !== topParty),
      strategy: 'authority',
    };
  }

  private resolveArbitration(
    _conflict: Conflict,
    options: ResolveOptions,
    proposed: string,
  ): ConflictResolution {
    if (typeof options.arbitrator !== 'string' || options.arbitrator.length === 0) {
      throw new ConflictError('arbitration strategy requires options.arbitrator');
    }
    return {
      resolution: proposed,
      reason: `arbitrated by ${options.arbitrator}`,
      strategy: 'arbitration',
    };
  }

  private resolveEscalation(
    conflict: Conflict,
    proposed: string,
  ): ConflictResolution {
    return {
      resolution: `Escalated: ${proposed}`,
      reason: `conflict ${conflict.id} (severity ${conflict.severity}) escalated to higher authority`,
      strategy: 'escalation',
    };
  }
}
