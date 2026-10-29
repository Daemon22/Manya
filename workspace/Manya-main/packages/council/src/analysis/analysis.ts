/**
 * @manya/council — independent analysis collection.
 *
 * The {@link AnalysisCollector} is a stateful store for {@link Analysis}
 * objects. Analysts submit analyses; the collector validates, stores, and
 * indexes them by problem id and specialist id for downstream consumption by
 * the scoring, conflict, consensus, reports, and synthesizer modules.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { Analysis } from '../types.js';
import { AnalysisError } from '../errors.js';

/**
 * Validates an `Analysis` structurally. Throws `AnalysisError` on invalid
 * fields.
 */
export function validateAnalysis(analysis: Analysis): void {
  if (!analysis || typeof analysis !== 'object') {
    throw new AnalysisError('analysis must be an object');
  }
  if (typeof analysis.id !== 'string' || analysis.id.length === 0) {
    throw new AnalysisError('analysis.id must be a non-empty string');
  }
  if (typeof analysis.specialistId !== 'string' || analysis.specialistId.length === 0) {
    throw new AnalysisError('analysis.specialistId must be a non-empty string');
  }
  if (typeof analysis.problemId !== 'string' || analysis.problemId.length === 0) {
    throw new AnalysisError('analysis.problemId must be a non-empty string');
  }
  if (typeof analysis.content !== 'string' || analysis.content.length === 0) {
    throw new AnalysisError('analysis.content must be a non-empty string');
  }
  if (typeof analysis.confidence !== 'number' || !Number.isFinite(analysis.confidence)) {
    throw new AnalysisError('analysis.confidence must be a finite number');
  }
  if (analysis.confidence < 0 || analysis.confidence > 1) {
    throw new AnalysisError('analysis.confidence must be between 0 and 1');
  }
  if (typeof analysis.reasoning !== 'string' || analysis.reasoning.length === 0) {
    throw new AnalysisError('analysis.reasoning must be a non-empty string');
  }
  if (analysis.caveats !== undefined) {
    if (!Array.isArray(analysis.caveats)) {
      throw new AnalysisError('analysis.caveats must be an array if provided');
    }
    for (const c of analysis.caveats) {
      if (typeof c !== 'string' || c.length === 0) {
        throw new AnalysisError('each caveat must be a non-empty string');
      }
    }
  }
}

/**
 * Stateful analysis collector. Submissions are validated, deduplicated by id,
 * and indexed for fast lookup by problem id and specialist id.
 *
 * Usage:
 * ```ts
 * const collector = new AnalysisCollector();
 * collector.submit({ id: 'a1', specialistId: 'sec', problemId: 'p1',
 *   content: 'I recommend we adopt the proposal.', confidence: 0.85,
 *   reasoning: 'The proposal is sound.', caveats: ['assumes budget'] });
 * collector.getAll('p1');     // [analysis]
 * collector.getBySpecialist('sec');  // [analysis]
 * ```
 */
export class AnalysisCollector {
  private readonly analyses = new Map<string, Analysis>();
  private readonly order: string[] = [];
  private readonly byProblem = new Map<string, string[]>();
  private readonly bySpecialist = new Map<string, string[]>();

  /**
   * Validates and stores `analysis`. Throws `AnalysisError` when the analysis
   * is malformed or an analysis with the same id has already been submitted.
   */
  submit(analysis: Analysis): this {
    validateAnalysis(analysis);
    if (this.analyses.has(analysis.id)) {
      throw new AnalysisError(`analysis already submitted: ${analysis.id}`);
    }
    this.analyses.set(analysis.id, analysis);
    this.order.push(analysis.id);
    if (!this.byProblem.has(analysis.problemId)) this.byProblem.set(analysis.problemId, []);
    this.byProblem.get(analysis.problemId)!.push(analysis.id);
    if (!this.bySpecialist.has(analysis.specialistId)) this.bySpecialist.set(analysis.specialistId, []);
    this.bySpecialist.get(analysis.specialistId)!.push(analysis.id);
    return this;
  }

  /** Returns the analysis with the given id, or `undefined`. */
  get(id: string): Analysis | undefined {
    return this.analyses.get(id);
  }

  /** Returns all analyses for the given problem, in submission order. */
  getAll(problemId: string): Analysis[] {
    const ids = this.byProblem.get(problemId) ?? [];
    return ids.map((id) => this.analyses.get(id)!);
  }

  /** Returns all analyses by the given specialist, in submission order. */
  getBySpecialist(specialistId: string): Analysis[] {
    const ids = this.bySpecialist.get(specialistId) ?? [];
    return ids.map((id) => this.analyses.get(id)!);
  }

  /** Returns all analyses in submission order. */
  list(): Analysis[] {
    return this.order.map((id) => this.analyses.get(id)!);
  }

  /** Returns the number of analyses stored. */
  size(): number {
    return this.order.length;
  }
}
