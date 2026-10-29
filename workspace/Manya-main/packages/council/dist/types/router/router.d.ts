/**
 * @manya/council — specialist routing.
 *
 * The router matches a {@link Problem} against a pool of {@link Specialist}s
 * by computing a Jaccard-style token-overlap score between the problem's
 * description+domain and each specialist's `expertise` tags. The free
 * function `route(problem, specialists)` returns the specialists with
 * positive match scores, sorted best-first; `routeAll` returns every
 * specialist along with its score.
 *
 * The {@link SpecialistRegistry} is a stateful convenience wrapper that owns a
 * pool of specialists and exposes `route(problem)` / `routeAll(problem)`.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Problem, Specialist } from '../types.js';
/** A specialist paired with its match score against a problem. */
export interface SpecialistMatch {
    /** The specialist. */
    specialist: Specialist;
    /** Match score in `[0, 1]`. `0` means no overlap. */
    score: number;
}
/**
 * Validates a specialist structurally. Throws `RoutingError` on invalid fields.
 */
export declare function validateSpecialist(specialist: Specialist): void;
/**
 * Computes a match score for `problem` against `specialist`. The score is the
 * Jaccard similarity between the problem's description+domain tokens and the
 * specialist's expertise tokens. Returns `0` when either side has no tokens.
 */
export declare function matchScore(problem: Problem, specialist: Specialist): number;
/**
 * Returns the ranked list of specialists with positive match scores against
 * `problem`, sorted best-first. Specialists with no overlap are excluded.
 * Ties are broken by descending `weight`, then by registration order.
 */
export declare function route(problem: Problem, specialists: Specialist[]): Specialist[];
/**
 * Returns every specialist paired with its match score, sorted best-first.
 * Includes specialists with a score of `0`.
 */
export declare function routeAll(problem: Problem, specialists: Specialist[]): SpecialistMatch[];
/**
 * Stateful registry of specialists. Callers `register` specialists, then use
 * `route(problem)` to get the ranked list, or `routeAll(problem)` to get the
 * ranked list with scores.
 *
 * Usage:
 * ```ts
 * const registry = new SpecialistRegistry()
 *   .register({ id: 'sec', name: 'Security', expertise: ['security', 'crypto'], weight: 1 })
 *   .register({ id: 'fin', name: 'Finance', expertise: ['finance', 'audit'], weight: 1 });
 * const ranked = registry.route({ id: 'p1', description: 'audit the crypto', domain: 'security', createdAt: '' });
 * // ranked = [sec, fin] (sec scores higher on 'crypto'/'security')
 * ```
 */
export declare class SpecialistRegistry {
    private readonly specialists;
    private readonly order;
    /** Registers a specialist. Throws `RoutingError` on duplicate id or invalid fields. */
    register(specialist: Specialist): this;
    /** Removes a specialist by id. No-op if not found. */
    unregister(id: string): this;
    /** Returns the specialist with the given id, or `undefined`. */
    get(id: string): Specialist | undefined;
    /** Returns all registered specialists in insertion order. */
    list(): Specialist[];
    /** Returns the ranked list of specialists with positive match scores. */
    route(problem: Problem): Specialist[];
    /** Returns every specialist with its match score, sorted best-first. */
    routeAll(problem: Problem): SpecialistMatch[];
}
//# sourceMappingURL=router.d.ts.map