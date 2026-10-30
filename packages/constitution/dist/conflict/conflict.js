"use strict";
/**
 * @manya-os/constitution — conflict resolution.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictResolver = exports.CONFLICT_SEVERITIES = exports.RESOLUTION_STRATEGIES = void 0;
exports.validateConflict = validateConflict;
const errors_js_1 = require("../errors.js");
/** All valid resolution strategies. */
exports.RESOLUTION_STRATEGIES = [
    'consensus', 'majority', 'authority', 'arbitration', 'escalation',
];
/** All valid conflict severities, ordered least-to-most severe. */
exports.CONFLICT_SEVERITIES = [
    'low', 'medium', 'high', 'critical',
];
/** Validates a `Conflict` structurally. Throws `ConflictError` on invalid fields. */
function validateConflict(conflict) {
    if (!conflict || typeof conflict !== 'object') {
        throw new errors_js_1.ConflictError('conflict must be an object');
    }
    if (typeof conflict.id !== 'string' || conflict.id.length === 0) {
        throw new errors_js_1.ConflictError('conflict.id must be a non-empty string');
    }
    if (!Array.isArray(conflict.parties) || conflict.parties.length < 2) {
        throw new errors_js_1.ConflictError('conflict.parties must have at least 2 entries');
    }
    if (typeof conflict.description !== 'string' || conflict.description.length === 0) {
        throw new errors_js_1.ConflictError('conflict.description must be a non-empty string');
    }
    if (!exports.CONFLICT_SEVERITIES.includes(conflict.severity)) {
        throw new errors_js_1.ConflictError(`conflict.severity must be one of: ${exports.CONFLICT_SEVERITIES.join(', ')}`);
    }
    // Duplicate parties
    const seen = new Set();
    for (const p of conflict.parties) {
        if (typeof p !== 'string' || p.length === 0) {
            throw new errors_js_1.ConflictError('each party must be a non-empty string');
        }
        if (seen.has(p)) {
            throw new errors_js_1.ConflictError(`duplicate party: ${p}`);
        }
        seen.add(p);
    }
}
/**
 * Stateless conflict resolver. Construct one and call `resolveConflict` with
 * a strategy and options.
 */
class ConflictResolver {
    /** Resolves `conflict` using `strategy` and the provided `options`. */
    resolveConflict(conflict, strategy, options = {}) {
        validateConflict(conflict);
        if (!exports.RESOLUTION_STRATEGIES.includes(strategy)) {
            throw new errors_js_1.ConflictError(`unknown strategy: ${strategy}`);
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
                throw new errors_js_1.ConflictError(`unhandled strategy: ${strategy}`);
        }
    }
    resolveConsensus(conflict, options, proposed) {
        if (!Array.isArray(options.agreements)) {
            throw new errors_js_1.ConflictError('consensus strategy requires options.agreements');
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
    resolveMajority(conflict, options, proposed) {
        if (!Array.isArray(options.agreements)) {
            throw new errors_js_1.ConflictError('majority strategy requires options.agreements');
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
    resolveAuthority(conflict, options, proposed) {
        if (!options.authorities || typeof options.authorities !== 'object') {
            throw new errors_js_1.ConflictError('authority strategy requires options.authorities');
        }
        let topParty;
        let topAuth = -Infinity;
        for (const p of conflict.parties) {
            const a = options.authorities[p];
            if (typeof a !== 'number') {
                throw new errors_js_1.ConflictError(`authority strategy: missing authority for party ${p}`);
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
    resolveArbitration(_conflict, options, proposed) {
        if (typeof options.arbitrator !== 'string' || options.arbitrator.length === 0) {
            throw new errors_js_1.ConflictError('arbitration strategy requires options.arbitrator');
        }
        return {
            resolution: proposed,
            reason: `arbitrated by ${options.arbitrator}`,
            strategy: 'arbitration',
        };
    }
    resolveEscalation(conflict, proposed) {
        return {
            resolution: `Escalated: ${proposed}`,
            reason: `conflict ${conflict.id} (severity ${conflict.severity}) escalated to higher authority`,
            strategy: 'escalation',
        };
    }
}
exports.ConflictResolver = ConflictResolver;
//# sourceMappingURL=conflict.js.map