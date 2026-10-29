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
import { RoutingError } from '../errors.js';
import { tokenize } from '../util.js';

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
export function validateSpecialist(specialist: Specialist): void {
  if (!specialist || typeof specialist !== 'object') {
    throw new RoutingError('specialist must be an object');
  }
  if (typeof specialist.id !== 'string' || specialist.id.length === 0) {
    throw new RoutingError('specialist.id must be a non-empty string');
  }
  if (typeof specialist.name !== 'string' || specialist.name.length === 0) {
    throw new RoutingError('specialist.name must be a non-empty string');
  }
  if (!Array.isArray(specialist.expertise)) {
    throw new RoutingError('specialist.expertise must be an array');
  }
  for (const e of specialist.expertise) {
    if (typeof e !== 'string' || e.length === 0) {
      throw new RoutingError('each expertise entry must be a non-empty string');
    }
  }
  if (typeof specialist.weight !== 'number' || !Number.isFinite(specialist.weight) || specialist.weight < 0) {
    throw new RoutingError('specialist.weight must be a non-negative finite number');
  }
}

/**
 * Computes a match score for `problem` against `specialist`. The score is the
 * Jaccard similarity between the problem's description+domain tokens and the
 * specialist's expertise tokens. Returns `0` when either side has no tokens.
 */
export function matchScore(problem: Problem, specialist: Specialist): number {
  if (!problem || typeof problem !== 'object') {
    throw new RoutingError('problem must be an object');
  }
  validateSpecialist(specialist);
  const problemTokens = new Set<string>([
    ...tokenize(problem.description),
    ...tokenize(problem.domain),
  ]);
  const expertTokens = new Set<string>();
  for (const e of specialist.expertise) {
    for (const t of tokenize(e)) expertTokens.add(t);
  }
  if (problemTokens.size === 0 || expertTokens.size === 0) return 0;
  let intersection = 0;
  for (const t of expertTokens) if (problemTokens.has(t)) intersection++;
  const union = problemTokens.size + expertTokens.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Returns the ranked list of specialists with positive match scores against
 * `problem`, sorted best-first. Specialists with no overlap are excluded.
 * Ties are broken by descending `weight`, then by registration order.
 */
export function route(problem: Problem, specialists: Specialist[]): Specialist[] {
  if (!problem || typeof problem !== 'object') {
    throw new RoutingError('problem must be an object');
  }
  if (!Array.isArray(specialists)) {
    throw new RoutingError('specialists must be an array');
  }
  return specialists
    .map((s, idx) => ({ specialist: s, score: matchScore(problem, s), idx }))
    .filter((m) => m.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.specialist.weight !== a.specialist.weight) {
        return b.specialist.weight - a.specialist.weight;
      }
      return a.idx - b.idx;
    })
    .map((m) => m.specialist);
}

/**
 * Returns every specialist paired with its match score, sorted best-first.
 * Includes specialists with a score of `0`.
 */
export function routeAll(problem: Problem, specialists: Specialist[]): SpecialistMatch[] {
  if (!problem || typeof problem !== 'object') {
    throw new RoutingError('problem must be an object');
  }
  if (!Array.isArray(specialists)) {
    throw new RoutingError('specialists must be an array');
  }
  return specialists
    .map((s, idx) => ({ specialist: s, score: matchScore(problem, s), idx }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.specialist.weight !== a.specialist.weight) {
        return b.specialist.weight - a.specialist.weight;
      }
      return a.idx - b.idx;
    })
    .map((m) => ({ specialist: m.specialist, score: m.score }));
}

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
export class SpecialistRegistry {
  private readonly specialists = new Map<string, Specialist>();
  private readonly order: string[] = [];

  /** Registers a specialist. Throws `RoutingError` on duplicate id or invalid fields. */
  register(specialist: Specialist): this {
    validateSpecialist(specialist);
    if (this.specialists.has(specialist.id)) {
      throw new RoutingError(`specialist already registered: ${specialist.id}`);
    }
    this.specialists.set(specialist.id, specialist);
    this.order.push(specialist.id);
    return this;
  }

  /** Removes a specialist by id. No-op if not found. */
  unregister(id: string): this {
    this.specialists.delete(id);
    const idx = this.order.indexOf(id);
    if (idx >= 0) this.order.splice(idx, 1);
    return this;
  }

  /** Returns the specialist with the given id, or `undefined`. */
  get(id: string): Specialist | undefined {
    return this.specialists.get(id);
  }

  /** Returns all registered specialists in insertion order. */
  list(): Specialist[] {
    return this.order.map((id) => this.specialists.get(id)!);
  }

  /** Returns the ranked list of specialists with positive match scores. */
  route(problem: Problem): Specialist[] {
    return route(problem, this.list());
  }

  /** Returns every specialist with its match score, sorted best-first. */
  routeAll(problem: Problem): SpecialistMatch[] {
    return routeAll(problem, this.list());
  }
}
