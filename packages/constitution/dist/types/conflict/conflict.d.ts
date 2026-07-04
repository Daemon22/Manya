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
import type { Conflict, ConflictResolution, ConflictSeverity, ResolutionStrategy } from '../types.js';
/** All valid resolution strategies. */
export declare const RESOLUTION_STRATEGIES: ReadonlyArray<ResolutionStrategy>;
/** All valid conflict severities, ordered least-to-most severe. */
export declare const CONFLICT_SEVERITIES: ReadonlyArray<ConflictSeverity>;
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
export declare function validateConflict(conflict: Conflict): void;
/**
 * Stateless conflict resolver. Construct one and call `resolveConflict` with
 * a strategy and options.
 */
export declare class ConflictResolver {
    /** Resolves `conflict` using `strategy` and the provided `options`. */
    resolveConflict(conflict: Conflict, strategy: ResolutionStrategy, options?: ResolveOptions): ConflictResolution;
    private resolveConsensus;
    private resolveMajority;
    private resolveAuthority;
    private resolveArbitration;
    private resolveEscalation;
}
//# sourceMappingURL=conflict.d.ts.map